import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { computeModelPricing } from "@/lib/pricing/modelPosition";
import { deleteProject, getProject, listPositions, updateProject } from "@/lib/store/projects";
import { validateUpdateProject } from "@/lib/validators";

export const runtime = "nodejs";

function computeRatioSummary(positions: Array<{ side: string; size: number }>) {
  const totalPuts = positions
    .filter((position) => position.side === "put")
    .reduce((sum, position) => sum + position.size, 0);
  const totalCalls = positions
    .filter((position) => position.side === "call")
    .reduce((sum, position) => sum + position.size, 0);
  const ratio = totalCalls > 0 ? totalPuts / totalCalls : null;

  return { totalPuts, totalCalls, ratio };
}

function computeValueSummary(
  positions: Array<{
    pricingMode?: "market" | "model";
    size: number;
    ratio?: number;
    marketPrice?: number;
    computed?: { fairValue: number; intrinsicValue: number; timeValue: number };
  }>
) {
  return positions.reduce(
    (acc, position) => {
      const multiplier = position.size * (position.ratio ?? 1);

      if (position.pricingMode === "model" && position.computed) {
        acc.totalMarketValue += position.computed.fairValue * multiplier;
        acc.totalIntrinsicValue += position.computed.intrinsicValue * multiplier;
        acc.totalTimeValue += position.computed.timeValue * multiplier;
      } else if (position.marketPrice !== undefined) {
        acc.totalMarketValue += position.marketPrice * multiplier;
      }

      return acc;
    },
    { totalMarketValue: 0, totalIntrinsicValue: 0, totalTimeValue: 0 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const project = await getProject(guard.user.id, resolvedParams.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const positions = await listPositions(project.id);
  const enrichedPositions = positions.map((position) => {
    if (
      position.side === "spot" ||
      position.pricingMode !== "model" ||
      position.underlyingPrice === undefined ||
      position.strike === undefined ||
      !position.expiry ||
      position.volatility === undefined ||
      position.rate === undefined
    ) {
      return position;
    }

    const model = computeModelPricing({
      S: position.underlyingPrice,
      K: position.strike,
      expiry: position.expiry,
      r: position.rate,
      q: position.dividendYield ?? 0,
      sigma: position.volatility,
      type: position.side,
      ratio: position.ratio ?? 1,
      fxRate: 1,
      currency: position.currency,
    });

    return { ...position, computed: model.computed };
  });

  const ratioSummary = computeRatioSummary(enrichedPositions);
  const valueSummary = computeValueSummary(enrichedPositions);

  return NextResponse.json({
    project,
    positions: enrichedPositions,
    ratioSummary,
    valueSummary,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const success = await deleteProject(guard.user.id, resolvedParams.id);
  if (!success) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const body = await request.json().catch(() => null);
  const parsed = validateUpdateProject(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await updateProject(guard.user.id, resolvedParams.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project: updated });
}
