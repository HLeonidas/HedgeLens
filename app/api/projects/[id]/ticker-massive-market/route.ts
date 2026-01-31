import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getProject, updateProjectMassiveMarket } from "@/lib/store/projects";

export const runtime = "nodejs";

type MassiveResponse = Record<string, unknown>;

type RequestBody = {
  symbol?: string;
  market?: "stocks" | "crypto";
};

function normalizeSymbol(symbol: string, market: "stocks" | "crypto") {
  const trimmed = symbol.trim();
  if (!trimmed) return "";
  if (market === "crypto") {
    return trimmed.toUpperCase();
  }
  const parts = trimmed.split(":");
  return (parts[parts.length - 1] || trimmed).trim().toUpperCase();
}

function buildMarketUrl(symbol: string, market: "stocks" | "crypto", apiKey: string) {
  if (market === "crypto") {
    return `https://api.massive.com/v2/snapshot/locale/global/markets/crypto/tickers/${encodeURIComponent(
      symbol
    )}?apiKey=${encodeURIComponent(apiKey)}`;
  }

  return `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
    symbol
  )}?apiKey=${encodeURIComponent(apiKey)}`;
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

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const market = body?.market ?? "stocks";
  const rawSymbol = body?.symbol ?? project.underlyingSymbol ?? "";
  const symbol = normalizeSymbol(rawSymbol, market);

  if (!symbol) {
    return NextResponse.json({ error: "Underlying symbol is missing" }, { status: 400 });
  }

  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Massive API key missing" }, { status: 500 });
  }

  const url = buildMarketUrl(symbol, market, apiKey);
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return NextResponse.json(
      { error: text || "Massive market request failed" },
      { status: 502 }
    );
  }

  const payload = (await response.json().catch(() => null)) as MassiveResponse | null;
  if (!payload || Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Massive response leer." }, { status: 502 });
  }

  const fetchedAt = new Date().toISOString();
  const marketInfo = {
    source: "massive" as const,
    symbol,
    market,
    payload,
  };

  const updated = await updateProjectMassiveMarket(guard.user.id, id, { marketInfo, fetchedAt });
  if (!updated) {
    return NextResponse.json({ error: "Unable to store market info" }, { status: 500 });
  }

  return NextResponse.json({ marketInfo: updated.massiveMarketInfo, fetchedAt });
}
