import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { listPositions, listProjects } from "@/lib/store/projects";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const queryRaw = searchParams.get("q") ?? "";
  const query = queryRaw.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const normalized = query.toLowerCase();
  const projects = await listProjects(guard.user.id, 100);

  const projectMatches = projects.filter((project) => {
    const haystack = `${project.name} ${project.underlyingSymbol ?? ""} ${project.baseCurrency}`.toLowerCase();
    return haystack.includes(normalized);
  });

  const positionsByProject = await Promise.all(
    projects.map(async (project) => ({
      project,
      positions: await listPositions(project.id),
    }))
  );

  const positionMatches = positionsByProject.flatMap(({ project, positions }) => {
    return positions
      .filter((position) => {
        const haystack = `${position.isin} ${position.name ?? ""} ${position.underlyingSymbol ?? ""} ${project.name}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .map((position) => ({ project, position }));
  });

  const results = [
    ...projectMatches.map((project) => ({
      type: "project" as const,
      id: project.id,
      projectId: project.id,
      title: project.name,
      subtitle: project.underlyingSymbol
        ? `Project • ${project.underlyingSymbol.replace(/\s+/g, "").toUpperCase()}`
        : "Project",
    })),
    ...positionMatches.map(({ project, position }) => ({
      type: "position" as const,
      id: position.id,
      projectId: project.id,
      title: position.name ?? position.isin,
      subtitle: `${project.name} • ${position.isin}`,
      isin: position.isin,
    })),
  ];

  return NextResponse.json({ results });
}
