import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getProject, listPositions } from "@/lib/store/projects";

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
  const ratioSummary = computeRatioSummary(positions);
  const valueSummary = computeValueSummary(positions);

  return NextResponse.json({ project, positions, ratioSummary, valueSummary });
}
