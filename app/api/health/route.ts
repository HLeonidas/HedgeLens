import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const sql = getDb();
    await sql`select 1 as ok`;
    return NextResponse.json({ ok: true, db: true, time: timestamp });
  } catch (error) {
    return NextResponse.json({ ok: false, db: false, time: timestamp }, { status: 500 });
  }
}