import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const redis = getRedis();
    await redis.ping();
    return NextResponse.json({ ok: true, db: true, time: timestamp });
  } catch (error) {
    return NextResponse.json({ ok: false, db: false, time: timestamp }, { status: 500 });
  }
}
