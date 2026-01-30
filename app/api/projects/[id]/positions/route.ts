import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
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

  const position = await addPosition(guard.user.id, resolvedParams.id, parsed.data);
  if (!position) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ position }, { status: 201 });
}
