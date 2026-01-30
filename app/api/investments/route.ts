import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { createInvestment, listInvestments } from "@/lib/store/investments";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const investments = await listInvestments(guard.user.id);
  return NextResponse.json({ investments });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const payload = (await request.json().catch(() => null)) as
    | {
        name?: string;
        isin?: string;
        shares?: number;
        buyInPrice?: number;
        currentPrice?: number;
        expectedPrice?: number;
        currency?: string;
      }
    | null;

  const name = payload?.name?.trim() || "New Position";
  const isin = payload?.isin?.trim() || "NEWPOS";
  const shares = payload?.shares ?? 1;
  const buyInPrice = payload?.buyInPrice ?? 0;
  const currentPrice = payload?.currentPrice ?? 0;
  const expectedPrice = payload?.expectedPrice ?? currentPrice;
  const currency = payload?.currency?.trim().toUpperCase() || "EUR";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (isin.length < 6) {
    return NextResponse.json({ error: "Invalid ISIN" }, { status: 400 });
  }
  if (!Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "Invalid shares" }, { status: 400 });
  }
  if (!Number.isFinite(buyInPrice) || buyInPrice < 0) {
    return NextResponse.json({ error: "Invalid buy-in price" }, { status: 400 });
  }
  if (!Number.isFinite(currentPrice) || currentPrice < 0) {
    return NextResponse.json({ error: "Invalid current price" }, { status: 400 });
  }
  if (!Number.isFinite(expectedPrice) || expectedPrice < 0) {
    return NextResponse.json({ error: "Invalid expected price" }, { status: 400 });
  }

  const investment = await createInvestment(guard.user.id, {
    name,
    isin,
    shares,
    buyInPrice,
    currentPrice,
    expectedPrice,
    currency,
  });

  return NextResponse.json({ investment }, { status: 201 });
}
