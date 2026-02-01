export type WarrantPayload = {
  details?: {
    stammdaten?: Record<string, RawValue>;
    kennzahlen?: Record<string, RawValue>;
    handelsdaten?: Record<string, RawValue>;
    volatilitaet?: Record<string, RawValue>;
    description?: string | null;
  };
};

type RawValue = {
  label?: string | null;
  raw?: string | null;
  value?: number | null;
};

export type MarketData = {
  valuationDate: string;
  spot: number;
  dividendYield: number;
  riskFreeRate: number;
  fx: {
    // underlying currency per 1 warrant currency (e.g. USD per 1 EUR).
    underlyingPerWarrant: number;
  };
  underlyingCurrency?: string;
};

export type WarrantResult = {
  valuationDate: string;
  expiryDate: string;
  type: "PUT" | "CALL";
  inputs: {
    S: number;
    K: number;
    T: number;
    r: number;
    q: number;
    sigma: number;
    ratio: number;
    fxUnderlyingPerWarrant: number;
    underlyingCurrency: string;
    warrantCurrency: string;
  };
  results: {
    fairValue: number;
    intrinsicValue: number;
    timeValue: number;
    greeks: { delta: number; gamma: number; vega: number; theta: number; rho: number };
  };
};

// Risk-free rate is treated as continuously compounded. If you have a simple rate,
// convert it before passing in (e.g. r_cont = ln(1 + r_simple)).
export function priceWarrant(payload: WarrantPayload, marketData: MarketData): WarrantResult {
  const details = payload.details ?? {};
  const stammdaten = details.stammdaten ?? {};
  const kennzahlen = details.kennzahlen ?? {};
  const handelsdaten = details.handelsdaten ?? {};
  const volatilitaet = details.volatilitaet ?? {};

  const warrantCurrency = (getRaw(stammdaten, "währung") ?? "").trim() || "EUR";
  const underlyingCurrency =
    marketData.underlyingCurrency?.trim() || (getRaw(stammdaten, "basiswert") ?? "UNDERLYING");

  const typeRaw = (getRaw(stammdaten, "typ") ?? "").toLowerCase();
  const type: "PUT" | "CALL" = typeRaw.includes("put") ? "PUT" : "CALL";

  const K =
    getValue(stammdaten, "basispreis") ??
    getValue(kennzahlen, "basispreis") ??
    null;
  const ratio =
    getValue(stammdaten, "bezugsverhältnis") ??
    getValue(kennzahlen, "bezugsverhältnis") ??
    1;
  const sigma = getValue(volatilitaet, "implizite volatilität") ?? null;

  const expiryRaw =
    getRaw(handelsdaten, "letzter handelstag") ??
    getRaw(handelsdaten, "bewertungstag") ??
    extractDateFromDescription(details.description ?? "");
  const expiryDate = parseGermanDate(expiryRaw) ?? null;

  const valuationDate = new Date(`${marketData.valuationDate}T00:00:00.000Z`);
  if (!expiryDate || !Number.isFinite(expiryDate.getTime())) {
    throw new Error("Missing or invalid expiry date in payload.");
  }
  if (!Number.isFinite(valuationDate.getTime())) {
    throw new Error("Invalid valuationDate.");
  }

  const S = marketData.spot;
  const r = marketData.riskFreeRate;
  const q = marketData.dividendYield;
  const fx = marketData.fx?.underlyingPerWarrant ?? 1;
  const T = yearFractionAct365(valuationDate, expiryDate);

  validateInputs({ S, K, sigma, ratio, fx });

  const strike = K as number;
  const vol = sigma as number;
  const ratioValue = ratio as number;

  const priceScale = ratioValue / fx;

  let fairValueUnderlying = 0;
  let intrinsicUnderlying = 0;
  let timeValueUnderlying = 0;
  let greeksUnderlying = { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };

  if (T <= 0 || vol <= 0) {
    intrinsicUnderlying =
      type === "CALL" ? Math.max(S - strike, 0) : Math.max(strike - S, 0);
    fairValueUnderlying = intrinsicUnderlying;
    timeValueUnderlying = 0;
  } else {
    const bs = bsPriceAndGreeks({
      S,
      K: strike,
      r,
      q,
      sigma: vol,
      T,
      type,
    });
    fairValueUnderlying = bs.price;
    intrinsicUnderlying =
      type === "CALL" ? Math.max(S - strike, 0) : Math.max(strike - S, 0);
    timeValueUnderlying = Math.max(0, fairValueUnderlying - intrinsicUnderlying);
    greeksUnderlying = bs.greeks;
  }

  const fairValue = fairValueUnderlying * priceScale;
  const intrinsicValue = intrinsicUnderlying * priceScale;
  const timeValue = timeValueUnderlying * priceScale;

  return {
    valuationDate: marketData.valuationDate,
    expiryDate: expiryDate.toISOString().slice(0, 10),
    type,
    inputs: {
      S,
      K: strike,
      T,
      r,
      q,
      sigma: vol,
      ratio: ratioValue,
      fxUnderlyingPerWarrant: fx,
      underlyingCurrency,
      warrantCurrency,
    },
    results: {
      fairValue,
      intrinsicValue,
      timeValue,
      greeks: {
        delta: greeksUnderlying.delta * priceScale,
        gamma: greeksUnderlying.gamma * priceScale,
        vega: greeksUnderlying.vega * priceScale,
        theta: greeksUnderlying.theta * priceScale,
        rho: greeksUnderlying.rho * priceScale,
      },
    },
  };
}

export function parseGermanDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function yearFractionAct365(start: Date, end: Date): number {
  const millis = end.getTime() - start.getTime();
  if (!Number.isFinite(millis)) return 0;
  return Math.max(0, millis / (365 * 24 * 60 * 60 * 1000));
}

export function bsPriceAndGreeks(input: {
  S: number;
  K: number;
  r: number;
  q: number;
  sigma: number;
  T: number;
  type: "PUT" | "CALL";
}) {
  const { S, K, r, q, sigma, T, type } = input;
  if (T <= 0 || sigma <= 0) {
    return {
      price: type === "CALL" ? Math.max(S - K, 0) : Math.max(K - S, 0),
      greeks: { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 },
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normalCDF(type === "CALL" ? d1 : -d1);
  const Nd2 = normalCDF(type === "CALL" ? d2 : -d2);
  const discountQ = Math.exp(-q * T);
  const discountR = Math.exp(-r * T);

  const price =
    type === "CALL"
      ? S * discountQ * normalCDF(d1) - K * discountR * normalCDF(d2)
      : K * discountR * normalCDF(-d2) - S * discountQ * normalCDF(-d1);

  const pdf = normalPDF(d1);
  const delta =
    type === "CALL" ? discountQ * normalCDF(d1) : discountQ * (normalCDF(d1) - 1);
  const gamma = (discountQ * pdf) / (S * sigma * sqrtT);
  const vega = S * discountQ * pdf * sqrtT;
  const thetaBase = (-S * discountQ * pdf * sigma) / (2 * sqrtT);
  const theta =
    type === "CALL"
      ? thetaBase - r * K * discountR * normalCDF(d2) + q * S * discountQ * normalCDF(d1)
      : thetaBase + r * K * discountR * normalCDF(-d2) - q * S * discountQ * normalCDF(-d1);
  const rho =
    type === "CALL"
      ? K * T * discountR * normalCDF(d2)
      : -K * T * discountR * normalCDF(-d2);

  return {
    price,
    greeks: { delta, gamma, vega, theta, rho },
  };
}

function validateInputs(input: {
  S: number;
  K: number | null;
  sigma: number | null;
  ratio: number | null;
  fx: number;
}) {
  const { S, K, sigma, ratio, fx } = input;
  if (!Number.isFinite(S) || S <= 0) throw new Error("Invalid spot (S).");
  if (!Number.isFinite(K ?? NaN) || (K as number) <= 0) throw new Error("Invalid strike (K).");
  if (!Number.isFinite(sigma ?? NaN) || (sigma as number) <= 0) {
    throw new Error("Invalid volatility (sigma).");
  }
  if (!Number.isFinite(ratio ?? NaN) || (ratio as number) <= 0) {
    throw new Error("Invalid ratio (Bezugsverhältnis).");
  }
  if (!Number.isFinite(fx) || fx <= 0) throw new Error("Invalid FX rate.");
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getValue(section: Record<string, RawValue>, key: string): number | null {
  const needle = normalizeLabel(key);
  for (const [label, entry] of Object.entries(section)) {
    if (normalizeLabel(label).includes(needle)) {
      const value = entry?.value;
      if (typeof value === "number") return value;
    }
  }
  return null;
}

function getRaw(section: Record<string, RawValue>, key: string): string | null {
  const needle = normalizeLabel(key);
  for (const [label, entry] of Object.entries(section)) {
    if (normalizeLabel(label).includes(needle)) {
      return entry?.raw ?? null;
    }
  }
  return null;
}

function extractDateFromDescription(description: string): string | null {
  if (!description) return null;
  const matches = description.match(/\b\d{2}\.\d{2}\.\d{4}\b/g);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1] ?? null;
}

function normalPDF(x: number) {
  const invSqrtTwoPi = 0.3989422804014327;
  return invSqrtTwoPi * Math.exp(-0.5 * x * x);
}

function normalCDF(x: number) {
  // Abramowitz-Stegun approximation.
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const p = 0.2316419;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const pdf = normalPDF(absX);
  const poly = (((a5 * t + a4) * t + a3) * t + a2) * t + a1;
  const cdf = 1 - pdf * poly * t;
  return sign === 1 ? cdf : 1 - cdf;
}

/*
Example usage:

import { priceWarrant } from "./warrantPricer";

const result = priceWarrant(payload, {
  valuationDate: "2026-01-31",
  spot: 146.59,
  dividendYield: 0,
  riskFreeRate: 0.03,
  fx: { underlyingPerWarrant: 1 },
  underlyingCurrency: "USD",
});
*/
