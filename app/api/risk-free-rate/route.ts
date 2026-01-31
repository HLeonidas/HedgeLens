import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getRiskFreeRateOrError } from "@/lib/risk-free-rate";
import { setRiskFreeRate } from "@/lib/store/risk-free-rates";

export const runtime = "nodejs";

function normalizeRegion(value?: string | null) {
  const raw = (value ?? "").trim().toUpperCase();
  if (raw === "US" || raw === "EU") return raw;
  return "";
}

export async function GET(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const region = normalizeRegion(searchParams.get("region"));

  if (!region) {
    return NextResponse.json({ error: "region required" }, { status: 400 });
  }

  const result = await getRiskFreeRateOrError(region as "US" | "EU");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ rate: result.rate });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;
  if (guard.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { region?: string; rate?: number }
    | null;

  const region = normalizeRegion(body?.region);
  if (!region) {
    return NextResponse.json({ error: "region required" }, { status: 400 });
  }

  if (body?.rate === undefined || !Number.isFinite(body.rate)) {
    return NextResponse.json({ error: "rate required" }, { status: 400 });
  }

  const stored = await setRiskFreeRate(region as "US" | "EU", Number(body.rate), "manual");
  return NextResponse.json({ rate: stored });
}
