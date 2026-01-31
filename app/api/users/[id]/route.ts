import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";
import { requireActiveUser } from "@/lib/users";

export const runtime = "nodejs";

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  provider_account_id: string | null;
  active: boolean;
  role?: "admin" | "enduser";
  created_at: string;
  updated_at: string;
};

type UpdatePayload = {
  name?: string | null;
  active?: boolean;
  role?: "admin" | "enduser";
};

function gateToResponse(status: "unauthenticated" | "inactive" | "missing") {
  if (status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (status === "inactive") {
    return NextResponse.json({ error: "Inactive user" }, { status: 403 });
  }
  return NextResponse.json({ error: "User not provisioned" }, { status: 403 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireActiveUser();
  if (gate.status !== "ok") {
    return gateToResponse(gate.status);
  }

  const payload = (await request.json().catch(() => null)) as UpdatePayload | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (
    payload.role !== undefined &&
    payload.role !== "admin" &&
    payload.role !== "enduser"
  ) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (payload.active !== undefined && typeof payload.active !== "boolean") {
    return NextResponse.json({ error: "Invalid active flag" }, { status: 400 });
  }

  if (payload.name !== undefined && payload.name !== null && typeof payload.name !== "string") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const redis = getRedis();
  const { id: userId } = await params;
  const stored = await redis.get<UserRecord>(`user:${userId}`);
  if (!stored) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const next: UserRecord = {
    ...stored,
    role: stored.role ?? "enduser",
  };

  if (payload.name !== undefined) {
    const trimmed = payload.name?.trim() ?? "";
    next.name = trimmed ? trimmed : null;
  }

  if (payload.active !== undefined) {
    next.active = payload.active;
  }

  if (payload.role !== undefined) {
    next.role = payload.role;
  }

  next.updated_at = new Date().toISOString();

  await redis.set(`user:${userId}`, next);

  return NextResponse.json({ user: next });
}
