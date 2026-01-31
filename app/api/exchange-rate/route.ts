import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import {
  ExchangeRate,
  getExchangeRate,
  isRateFresh,
  setExchangeRate,
} from "@/lib/store/exchange-rates";

export const runtime = "nodejs";

type AlphaRateResponse = {
  "Realtime Currency Exchange Rate"?: Record<string, string>;
  Note?: string;
  "Error Message"?: string;
  Information?: string;
};

async function fetchAlphaRate(from: string, to: string) {
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
  const remoteError =
    payload?.Note || payload?.["Error Message"] || payload?.Information || null;
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

function normalize(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

export async function GET(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const from = normalize(searchParams.get("from"));
  const to = normalize(searchParams.get("to"));
  const force = searchParams.get("force") === "1";

  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }

  const existing = await getExchangeRate(from, to);
  if (existing && isRateFresh(existing) && !force) {
    return NextResponse.json({ rate: existing });
  }

  const fetched = await fetchAlphaRate(from, to);
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 502 });
  }

  const stored = await setExchangeRate(from, to, fetched.rate, "alpha_vantage");
  return NextResponse.json({ rate: stored });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const body = (await request.json().catch(() => null)) as
    | { from?: string; to?: string; rate?: number; force?: boolean }
    | null;

  const from = normalize(body?.from);
  const to = normalize(body?.to);
  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }

  if (body?.rate !== undefined && Number.isFinite(body.rate)) {
    const stored = await setExchangeRate(from, to, Number(body.rate), "manual");
    return NextResponse.json({ rate: stored });
  }

  const fetched = await fetchAlphaRate(from, to);
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 502 });
  }

  const stored = await setExchangeRate(from, to, fetched.rate, "alpha_vantage");
  return NextResponse.json({ rate: stored });
}
