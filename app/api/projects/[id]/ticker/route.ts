import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getProject, updateProjectTicker } from "@/lib/store/projects";

export const runtime = "nodejs";

type AlphaOverview = Record<string, string>;
type AlphaQuote = Record<string, string>;

function normalizeSymbol(symbol: string) {
  const trimmed = symbol.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(":");
  return (parts[parts.length - 1] || trimmed).trim().toUpperCase();
}

export async function POST(
  request: Request,
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

  const body = (await request.json().catch(() => null)) as
    | { type?: "overview" | "quote" }
    | null;
  const type = body?.type ?? "overview";

  let overview: AlphaOverview = {};
  let quote: AlphaQuote = {};

  if (type === "overview") {
    const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${encodeURIComponent(apiKey)}`;
    const overviewRes = await fetch(overviewUrl);
    if (!overviewRes.ok) {
      return NextResponse.json({ error: "Alpha Vantage request failed" }, { status: 502 });
    }
    overview = (await overviewRes.json().catch(() => null)) as AlphaOverview | null;
    const remoteError =
      overview?.Note || overview?.["Error Message"] || overview?.Information || null;
    if (remoteError) {
      return NextResponse.json({ error: remoteError }, { status: 502 });
    }
    if (!overview || Object.keys(overview).length === 0) {
      return NextResponse.json({ error: "Alpha Vantage response leer." }, { status: 502 });
    }
  } else {
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${encodeURIComponent(apiKey)}`;
    const quoteRes = await fetch(quoteUrl);
    if (!quoteRes.ok) {
      return NextResponse.json({ error: "Alpha Vantage request failed" }, { status: 502 });
    }
    const quotePayload = (await quoteRes.json().catch(() => null)) as
      | { "Global Quote"?: AlphaQuote }
      | { Note?: string }
      | null;
    const quoteError =
      (quotePayload && "Note" in quotePayload && quotePayload.Note) ||
      (quotePayload && "Error Message" in quotePayload && quotePayload["Error Message"]) ||
      (quotePayload && "Information" in quotePayload && quotePayload.Information) ||
      null;
    if (quoteError) {
      return NextResponse.json({ error: quoteError }, { status: 502 });
    }
    quote =
      quotePayload && "Global Quote" in quotePayload && quotePayload["Global Quote"]
        ? quotePayload["Global Quote"]
        : {};
    if (Object.keys(quote).length === 0) {
      return NextResponse.json({ error: "Alpha Vantage response leer." }, { status: 502 });
    }
  }
  const fetchedAt = new Date().toISOString();

  const tickerInfo = {
    source: "alpha_vantage" as const,
    symbol,
    overview: overview ?? {},
    quote,
  };

  const updated = await updateProjectTicker(guard.user.id, id, { tickerInfo, fetchedAt });
  if (!updated) {
    return NextResponse.json({ error: "Unable to store ticker info" }, { status: 500 });
  }

  return NextResponse.json({ tickerInfo: updated.tickerInfo, fetchedAt: updated.tickerFetchedAt });
}
