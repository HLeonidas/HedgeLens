import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { computeModelPricing } from "@/lib/pricing/modelPosition";
import { addPosition } from "@/lib/store/projects";
import { validateCreatePosition } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const body = await request.json().catch(() => null);
  const parsed = validateCreatePosition(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.data;
  const ratio = input.ratio ?? 1;
  const dividendYield = input.dividendYield ?? 0;

  const modelResult =
    input.pricingMode === "model" && input.side !== "spot"
      ? computeModelPricing({
          S: input.underlyingPrice ?? 0,
          K: input.strike ?? 0,
          expiry: input.expiry ?? new Date().toISOString(),
          r: input.rate ?? 0,
          q: dividendYield,
          sigma: input.volatility ?? 0,
          type: input.side,
          ratio,
          fxRate: 1,
          currency: input.currency,
        })
      : null;

  const position = await addPosition(guard.user.id, resolvedParams.id, {
    ...input,
    ratio,
    dividendYield,
    computed: modelResult?.computed,
    timeValueCurve: modelResult?.timeValueCurve,
  });
  if (!position) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ position }, { status: 201 });
}
