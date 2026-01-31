import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getOrFetchExchangeRate } from "@/lib/exchange-rate";
import { setExchangeRate } from "@/lib/store/exchange-rates";

export const runtime = "nodejs";

function normalize(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

export async function GET(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const from = normalize(searchParams.get("from"));
  const to = normalize(searchParams.get("to"));
  const force = searchParams.get("force") === "1";

  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }
  if (force && guard.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const result = await getOrFetchExchangeRate(from, to, { force });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
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
    | { from?: string; to?: string; rate?: number; force?: boolean }
    | null;

  const from = normalize(body?.from);
  const to = normalize(body?.to);
  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }

  if (body?.rate !== undefined && Number.isFinite(body.rate)) {
    const stored = await setExchangeRate(from, to, Number(body.rate), "manual");
    return NextResponse.json({ rate: stored });
  }

  const fetched = await getOrFetchExchangeRate(from, to, { force: true });
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 502 });
  }

  return NextResponse.json({ rate: fetched.rate });
}
