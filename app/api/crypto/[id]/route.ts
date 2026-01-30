import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { updateCryptoPosition } from "@/lib/store/crypto";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const payload = (await request.json().catch(() => null)) as
    | {
        symbol?: string;
        name?: string;
        shares?: number;
        buyInPrice?: number;
        currentPrice?: number;
        expectedPrice?: number;
      }
    | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: Parameters<typeof updateCryptoPosition>[2] = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (payload.symbol !== undefined) {
    const trimmed = payload.symbol.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }
    updates.symbol = trimmed;
  }

  if (payload.shares !== undefined) {
    if (!Number.isFinite(payload.shares) || payload.shares <= 0) {
      return NextResponse.json({ error: "Invalid shares" }, { status: 400 });
    }
    updates.shares = payload.shares;
  }

  if (payload.buyInPrice !== undefined) {
    if (!Number.isFinite(payload.buyInPrice) || payload.buyInPrice < 0) {
      return NextResponse.json({ error: "Invalid buy-in price" }, { status: 400 });
    }
    updates.buyInPrice = payload.buyInPrice;
  }

  if (payload.currentPrice !== undefined) {
    if (!Number.isFinite(payload.currentPrice) || payload.currentPrice < 0) {
      return NextResponse.json({ error: "Invalid current price" }, { status: 400 });
    }
    updates.currentPrice = payload.currentPrice;
  }

  if (payload.expectedPrice !== undefined) {
    if (!Number.isFinite(payload.expectedPrice) || payload.expectedPrice < 0) {
      return NextResponse.json({ error: "Invalid expected price" }, { status: 400 });
    }
    updates.expectedPrice = payload.expectedPrice;
  }

  const updated = await updateCryptoPosition(guard.user.id, resolvedParams.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  return NextResponse.json({ position: updated });
}
