import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getProject, updateProjectTicker } from "@/lib/store/projects";

export const runtime = "nodejs";

type AlphaOverview = {
  Symbol?: string;
  Name?: string;
  Exchange?: string;
  Currency?: string;
  Sector?: string;
  Industry?: string;
  Description?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  DividendYield?: string;
};

type AlphaQuote = {
  "01. symbol"?: string;
  "05. price"?: string;
  "07. latest trading day"?: string;
  "10. change percent"?: string;
};

function normalizeSymbol(symbol: string) {
  const trimmed = symbol.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(":");
  return (parts[parts.length - 1] || trimmed).trim().toUpperCase();
}

function parseNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const project = await getProject(guard.user.id, id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.underlyingSymbol) {
    return NextResponse.json({ error: "Underlying symbol is missing" }, { status: 400 });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Alpha Vantage API key missing" }, { status: 500 });
  }

  const symbol = normalizeSymbol(project.underlyingSymbol);
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;
  const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
    symbol
  )}&apikey=${encodeURIComponent(apiKey)}`;

  const [overviewRes, quoteRes] = await Promise.all([fetch(overviewUrl), fetch(quoteUrl)]);

  if (!overviewRes.ok || !quoteRes.ok) {
    return NextResponse.json({ error: "Alpha Vantage request failed" }, { status: 502 });
  }

  const overview = (await overviewRes.json().catch(() => null)) as AlphaOverview | null;
  const quotePayload = (await quoteRes.json().catch(() => null)) as
    | { "Global Quote"?: AlphaQuote }
    | { Note?: string }
    | null;

  if (!overview || ("Note" in (quotePayload ?? {}) && quotePayload && "Note" in quotePayload)) {
    return NextResponse.json({ error: "Alpha Vantage quota or invalid response" }, { status: 502 });
  }

  const quote = quotePayload && "Global Quote" in quotePayload ? quotePayload["Global Quote"] : undefined;
  const fetchedAt = new Date().toISOString();

  const tickerInfo = {
    source: "alpha_vantage" as const,
    symbol,
    name: overview.Name ?? null,
    exchange: overview.Exchange ?? null,
    currency: overview.Currency ?? null,
    sector: overview.Sector ?? null,
    industry: overview.Industry ?? null,
    description: overview.Description ?? null,
    marketCap: overview.MarketCapitalization ?? null,
    peRatio: overview.PERatio ?? null,
    dividendYield: overview.DividendYield ?? null,
    latestTradingDay: quote?.["07. latest trading day"] ?? null,
    price: parseNumber(quote?.["05. price"]),
    changePercent: quote?.["10. change percent"] ?? null,
  };

  const updated = await updateProjectTicker(guard.user.id, id, { tickerInfo, fetchedAt });
  if (!updated) {
    return NextResponse.json({ error: "Unable to store ticker info" }, { status: 500 });
  }

  return NextResponse.json({ tickerInfo: updated.tickerInfo, fetchedAt: updated.tickerFetchedAt });
}
