import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { updateStandaloneOptionsPosition } from "@/lib/store/options-positions";

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
        name?: string;
        isin?: string;
        side?: "put" | "call";
        size?: number;
        entryPrice?: number;
        pricingMode?: "market" | "model";
        marketPrice?: number;
      }
    | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: Parameters<typeof updateStandaloneOptionsPosition>[2] = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (payload.isin !== undefined) {
    const trimmed = payload.isin.trim();
    if (trimmed.length < 6) {
      return NextResponse.json({ error: "Invalid ISIN" }, { status: 400 });
    }
    updates.isin = trimmed;
  }

  if (payload.side !== undefined) {
    updates.side = payload.side;
  }

  if (payload.size !== undefined) {
    if (!Number.isFinite(payload.size) || payload.size <= 0) {
      return NextResponse.json({ error: "Invalid size" }, { status: 400 });
    }
    updates.size = payload.size;
  }

  if (payload.entryPrice !== undefined) {
    if (!Number.isFinite(payload.entryPrice) || payload.entryPrice < 0) {
      return NextResponse.json({ error: "Invalid entry price" }, { status: 400 });
    }
    updates.entryPrice = payload.entryPrice;
  }

  if (payload.pricingMode !== undefined) {
    updates.pricingMode = payload.pricingMode;
  }

  if (payload.marketPrice !== undefined) {
    if (!Number.isFinite(payload.marketPrice) || payload.marketPrice < 0) {
      return NextResponse.json({ error: "Invalid market price" }, { status: 400 });
    }
    updates.marketPrice = payload.marketPrice;
  }

  const updated = await updateStandaloneOptionsPosition(
    guard.user.id,
    resolvedParams.id,
    updates
  );

  if (!updated) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  return NextResponse.json({ position: updated });
}
