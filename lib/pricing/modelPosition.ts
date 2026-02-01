import { generateTimeValueCurve } from "@/lib/pricing/timeValueCurve";
import { priceWarrant, type WarrantPayload } from "@/lib/warrantPricer";

type ModelPricingInput = {
  S: number;
  K: number;
  expiry: string;
  r: number;
  q?: number;
  sigma: number;
  type: "call" | "put";
  now?: Date;
  ratio?: number;
  fxRate?: number;
  currency?: string;
};

type ComputedOutput = {
  fairValue: number;
  intrinsicValue: number;
  timeValue: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  asOf: string;
};

function round(value: number, decimals = 6) {
  return Number(value.toFixed(decimals));
}

export function computeModelPricing(input: ModelPricingInput) {
  const now = input.now ?? new Date();
  const ratio = input.ratio ?? 1;
  const fxRate = input.fxRate ?? 1;
  const currency = input.currency ?? "EUR";
  const valuationDate = now.toISOString().slice(0, 10);
  const expiryRaw = toGermanDate(input.expiry) ?? input.expiry;

  const payload: WarrantPayload = {
    details: {
      stammdaten: {
        basispreis: { raw: String(input.K), value: input.K },
        bezugsverhältnis: { raw: String(ratio), value: ratio },
        typ: { raw: input.type.toUpperCase(), value: null },
        währung: { raw: currency, value: null },
      },
      handelsdaten: {
        "letzter handelstag": { raw: expiryRaw, value: null },
      },
      volatilitaet: {
        "implizite volatilität": { raw: String(input.sigma), value: input.sigma },
      },
    },
  };

  const pricing = priceWarrant(payload, {
    valuationDate,
    spot: input.S,
    dividendYield: input.q ?? 0,
    riskFreeRate: input.r,
    fx: { underlyingPerWarrant: 1 / fxRate },
    underlyingCurrency: currency,
  });

  const fairValue = pricing.results.fairValue;
  const intrinsicValue = pricing.results.intrinsicValue;
  const timeValue = pricing.results.timeValue;
  const { delta, gamma, theta, vega } = pricing.results.greeks;

  const computed: ComputedOutput = {
    fairValue: round(fairValue),
    intrinsicValue: round(intrinsicValue),
    timeValue: round(timeValue),
    delta: round(delta),
    gamma: round(gamma),
    theta: round(theta),
    vega: round(vega),
    asOf: now.toISOString(),
  };

  const timeValueCurve = generateTimeValueCurve({
    S: input.S,
    K: input.K,
    r: input.r,
    q: input.q,
    sigma: input.sigma,
    type: input.type,
    expiry: input.expiry,
    now,
  });

  return { computed, timeValueCurve };
}

function toGermanDate(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}
