import "server-only";

import { ExchangeRate, getExchangeRate, isRateFresh, setExchangeRate } from "@/lib/store/exchange-rates";

export type ExchangeRateResult = { rate: ExchangeRate } | { error: string };

type AlphaRateResponse = {
  "Realtime Currency Exchange Rate"?: Record<string, string>;
  Note?: string;
  "Error Message"?: string;
  Information?: string;
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

async function fetchAlphaRate(from: string, to: string): Promise<{ rate: number } | { error: string }> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return { error: "Alpha Vantage API key missing" } as const;
  }

  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${encodeURIComponent(
    from
  )}&to_currency=${encodeURIComponent(to)}&apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  if (!response.ok) {
    return { error: "Alpha Vantage request failed" } as const;
  }

  const payload = (await response.json().catch(() => null)) as AlphaRateResponse | null;
  const remoteError = payload?.Note || payload?.["Error Message"] || payload?.Information || null;
  if (remoteError) {
    return { error: remoteError } as const;
  }

  const data = payload?.["Realtime Currency Exchange Rate"];
  const rateRaw = data?.["5. Exchange Rate"];
  const parsed = rateRaw ? Number(rateRaw) : NaN;
  if (!Number.isFinite(parsed)) {
    return { error: "Invalid exchange rate response" } as const;
  }

  return { rate: parsed } as const;
}

export async function getOrFetchExchangeRate(
  fromRaw: string,
  toRaw: string,
  options: { force?: boolean } = {}
): Promise<ExchangeRateResult> {
  const from = normalize(fromRaw);
  const to = normalize(toRaw);
  const force = options.force ?? false;

  if (!from || !to) {
    return { error: "from/to required" } as const;
  }

  const existing = await getExchangeRate(from, to);
  if (existing && isRateFresh(existing) && !force) {
    return { rate: existing } as const;
  }

  const fetched = await fetchAlphaRate(from, to);
  if ("error" in fetched) {
    return { error: fetched.error } as const;
  }

  const stored = await setExchangeRate(from, to, fetched.rate, "alpha_vantage");
  return { rate: stored } as const;
}
