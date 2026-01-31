import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";
import { requireActiveUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireActiveUser();

  if (gate.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (gate.status === "inactive") {
    return NextResponse.json({ error: "Inactive user" }, { status: 403 });
  }

  if (gate.status === "missing") {
    return NextResponse.json({ error: "User not provisioned" }, { status: 403 });
  }

  return NextResponse.json({ user: gate.user });
}

export async function PUT(request: Request) {
  const gate = await requireActiveUser();

  if (gate.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (gate.status === "inactive") {
    return NextResponse.json({ error: "Inactive user" }, { status: 403 });
  }

  if (gate.status === "missing") {
    return NextResponse.json({ error: "User not provisioned" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { preferred_currency?: string }
    | null;

  const currency = (body?.preferred_currency ?? "").trim().toUpperCase();
  if (!currency) {
    return NextResponse.json({ error: "preferred_currency required" }, { status: 400 });
  }

  const allowed = new Set([
    "EUR",
    "USD",
    "GBP",
    "CHF",
    "JPY",
    "AUD",
    "CAD",
    "SEK",
    "NOK",
    "DKK",
  ]);
  if (!allowed.has(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const redis = getRedis();
  const stored = await redis.get<typeof gate.user>(`user:${gate.user.id}`);
  if (!stored) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = {
    ...stored,
    preferred_currency: currency,
    updated_at: new Date().toISOString(),
  };

  await redis.set(`user:${gate.user.id}`, updated);

  return NextResponse.json({ user: updated });
}
