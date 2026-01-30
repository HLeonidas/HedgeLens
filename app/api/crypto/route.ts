import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { createCryptoPosition, listCryptoPositions } from "@/lib/store/crypto";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const positions = await listCryptoPositions(guard.user.id);
  return NextResponse.json({ positions });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const payload = (await request.json().catch(() => null)) as
    | {
        symbol?: string;
        name?: string;
        shares?: number;
        buyInPrice?: number;
        currentPrice?: number;
        expectedPrice?: number;
        currency?: string;
      }
    | null;

  const name = payload?.name?.trim() || "New Crypto";
  const symbol = payload?.symbol?.trim() || "NEW";
  const shares = payload?.shares ?? 1;
  const buyInPrice = payload?.buyInPrice ?? 0;
  const currentPrice = payload?.currentPrice ?? 0;
  const expectedPrice = payload?.expectedPrice ?? currentPrice;
  const currency = payload?.currency?.trim().toUpperCase() || "EUR";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
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

  const position = await createCryptoPosition(guard.user.id, {
    name,
    symbol,
    shares,
    buyInPrice,
    currentPrice,
    expectedPrice,
    currency,
  });

  return NextResponse.json({ position }, { status: 201 });
}
