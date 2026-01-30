import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { computeModelPricing } from "@/lib/pricing/modelPosition";
import { deletePosition, getPosition, updatePosition } from "@/lib/store/projects";
import { validatePositionAfterMerge, validateUpdatePosition } from "@/lib/validators";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; posId: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const deleted = await deletePosition(
    guard.user.id,
    resolvedParams.id,
    resolvedParams.posId
  );
  if (!deleted) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; posId: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const body = await request.json().catch(() => null);
  const parsed = validateUpdatePosition(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await getPosition(guard.user.id, resolvedParams.id, resolvedParams.posId);
  if (!existing) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  const merged = {
    ...existing,
    ...parsed.data,
  };
  const normalizedPricingMode = merged.pricingMode ?? "market";
  const ratio = merged.ratio ?? 1;
  const dividendYield = merged.dividendYield ?? 0;

  const validation = validatePositionAfterMerge({
    isin: merged.isin,
    side: merged.side,
    size: merged.size,
    entryPrice: merged.entryPrice,
    pricingMode: normalizedPricingMode,
    underlyingSymbol: merged.underlyingSymbol,
    underlyingPrice: merged.underlyingPrice,
    strike: merged.strike,
    expiry: merged.expiry,
    volatility: merged.volatility,
    rate: merged.rate,
    dividendYield,
    ratio,
    marketPrice: merged.marketPrice,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const modelResult =
    normalizedPricingMode === "model"
      ? computeModelPricing({
          S: merged.underlyingPrice ?? 0,
          K: merged.strike ?? 0,
          expiry: merged.expiry ?? new Date().toISOString(),
          r: merged.rate ?? 0,
          q: dividendYield,
          sigma: merged.volatility ?? 0,
          type: merged.side,
        })
      : null;

  const updated = await updatePosition(guard.user.id, resolvedParams.id, resolvedParams.posId, {
    ...parsed.data,
    pricingMode: normalizedPricingMode,
    ratio,
    dividendYield,
    computed: modelResult?.computed,
    timeValueCurve: modelResult?.timeValueCurve,
    marketPrice: normalizedPricingMode === "market" ? merged.marketPrice : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  return NextResponse.json({ position: updated });
}
