import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { createProject, listProjects } from "@/lib/store/projects";
import { validateCreateProject } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const projects = await listProjects(guard.user.id, 50);
  return NextResponse.json({ projects, page: 1, pageSize: 50 });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = validateCreateProject(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const project = await createProject(guard.user.id, parsed.data);
  return NextResponse.json({ project }, { status: 201 });
}
