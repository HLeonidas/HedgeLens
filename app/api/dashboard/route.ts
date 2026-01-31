import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getDashboardData } from "@/lib/dashboard";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const data = await getDashboardData(guard.user.id, guard.user.preferred_currency);
  return NextResponse.json(data);
}
