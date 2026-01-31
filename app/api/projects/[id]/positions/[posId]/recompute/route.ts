import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { computeModelPricing } from "@/lib/pricing/modelPosition";
import { getPosition, updatePosition } from "@/lib/store/projects";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; posId: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const position = await getPosition(guard.user.id, resolvedParams.id, resolvedParams.posId);

  if (!position) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  if (position.pricingMode !== "model") {
    return NextResponse.json({ error: "Position is not in model mode" }, { status: 400 });
  }
  if (position.side === "spot") {
    return NextResponse.json({ error: "Spot position cannot be recomputed" }, { status: 400 });
  }

  const modelResult = computeModelPricing({
    S: position.underlyingPrice ?? 0,
    K: position.strike ?? 0,
    expiry: position.expiry ?? new Date().toISOString(),
    r: position.rate ?? 0,
    q: position.dividendYield ?? 0,
    sigma: position.volatility ?? 0,
    type: position.side,
  });

  const updated = await updatePosition(guard.user.id, resolvedParams.id, resolvedParams.posId, {
    computed: modelResult.computed,
    timeValueCurve: modelResult.timeValueCurve,
  });

  if (!updated) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  return NextResponse.json({ position: updated });
}
