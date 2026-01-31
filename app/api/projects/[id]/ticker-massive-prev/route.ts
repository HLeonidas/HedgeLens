import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getProject, updateProjectMassivePrevBar } from "@/lib/store/projects";

export const runtime = "nodejs";

type MassiveResponse = Record<string, unknown>;

type RequestBody = {
  symbol?: string;
  adjusted?: boolean;
};

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

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const rawSymbol = body?.symbol ?? project.underlyingSymbol ?? "";
  const symbol = normalizeSymbol(rawSymbol);
  const adjusted = body?.adjusted ?? true;

  if (!symbol) {
    return NextResponse.json({ error: "Underlying symbol is missing" }, { status: 400 });
  }

  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Massive API key missing" }, { status: 500 });
  }

  const url = `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(
    symbol
  )}/prev?adjusted=${adjusted ? "true" : "false"}&apiKey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return NextResponse.json(
      { error: text || "Massive prev bar request failed" },
      { status: 502 }
    );
  }

  const payload = (await response.json().catch(() => null)) as MassiveResponse | null;
  if (!payload || Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Massive response leer." }, { status: 502 });
  }

  const fetchedAt = new Date().toISOString();
  const prevBarInfo = {
    source: "massive" as const,
    symbol,
    payload,
  };

  const updated = await updateProjectMassivePrevBar(guard.user.id, id, {
    prevBarInfo,
    fetchedAt,
  });
  if (!updated) {
    return NextResponse.json({ error: "Unable to store prev bar info" }, { status: 500 });
  }

  return NextResponse.json({
    prevBarInfo: updated.massivePrevBarInfo,
    fetchedAt,
    underlyingLastPrice: updated.underlyingLastPrice,
    underlyingLastPriceUpdatedAt: updated.underlyingLastPriceUpdatedAt,
    underlyingLastPriceSource: updated.underlyingLastPriceSource,
    underlyingLastPriceCurrency: updated.underlyingLastPriceCurrency,
  });
}
