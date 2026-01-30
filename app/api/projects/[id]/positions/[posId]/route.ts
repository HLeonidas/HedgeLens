import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { deletePosition } from "@/lib/store/projects";

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
