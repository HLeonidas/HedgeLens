import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { createProject, updateProjectMassiveTicker } from "@/lib/store/projects";

export const runtime = "nodejs";

type MassiveResponse = Record<string, unknown>;

type RequestBody = {
  symbol?: string;
  color?: string;
};

function normalizeSymbol(symbol: string) {
  const trimmed = symbol.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(":");
  return (parts[parts.length - 1] || trimmed).trim().toUpperCase();
}

function truncate(value: string, max = 220) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const rawSymbol = body?.symbol ?? "";
  const symbol = normalizeSymbol(rawSymbol);

  if (!symbol) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }

  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Massive API key missing" }, { status: 500 });
  }

  const url = `https://api.massive.com/v3/reference/tickers/${encodeURIComponent(
    symbol
  )}?apiKey=${encodeURIComponent(apiKey)}`;
  const overviewRes = await fetch(url);

  if (!overviewRes.ok) {
    const text = await overviewRes.text().catch(() => "");
    return NextResponse.json(
      { error: text || "Massive request failed" },
      { status: 502 }
    );
  }

  const overview = (await overviewRes.json().catch(() => null)) as MassiveResponse | null;
  if (!overview || Object.keys(overview).length === 0) {
    return NextResponse.json({ error: "Massive response leer." }, { status: 502 });
  }

  const results =
    (overview as Record<string, unknown>).results && typeof (overview as Record<string, unknown>).results === "object"
      ? ((overview as Record<string, unknown>).results as Record<string, unknown>)
      : (overview as Record<string, unknown>);

  const nameRaw =
    results.name ||
    results.company_name ||
    results.ticker ||
    symbol;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : symbol;
  const descriptionRaw =
    results.description ||
    results.long_description;
  const description =
    typeof descriptionRaw === "string" ? truncate(descriptionRaw) : undefined;
  const currencyRaw =
    results.currency ||
    results.currency_name;
  const baseCurrency = typeof currencyRaw === "string" ? currencyRaw.trim() : "EUR";

  const project = await createProject(guard.user.id, {
    name,
    baseCurrency,
    description,
    underlyingSymbol: symbol,
    color: body?.color?.trim() || undefined,
  });

  const tickerInfo = {
    source: "massive" as const,
    symbol,
    payload: overview,
  };

  const fetchedAt = new Date().toISOString();
  await updateProjectMassiveTicker(guard.user.id, project.id, { tickerInfo, fetchedAt });

  return NextResponse.json({ project }, { status: 201 });
}
