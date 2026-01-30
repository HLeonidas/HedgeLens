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

  return NextResponse.json({ project, positions, ratioSummary });
}
