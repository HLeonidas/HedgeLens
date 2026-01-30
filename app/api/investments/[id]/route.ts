import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getInvestment, updateInvestment } from "@/lib/store/investments";

export const runtime = "nodejs";

type UpdatePayload = {
  status?: "open" | "sold";
  soldPrice?: number;
  name?: string;
  isin?: string;
  shares?: number;
  buyInPrice?: number;
  expectedPrice?: number;
  currentPrice?: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const resolvedParams = await params;
  const investment = await getInvestment(guard.user.id, resolvedParams.id);
  if (!investment) {
    return NextResponse.json({ error: "Investment not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as UpdatePayload | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.status === "sold") {
    if (typeof payload.soldPrice !== "number" || Number.isNaN(payload.soldPrice)) {
      return NextResponse.json({ error: "Missing soldPrice" }, { status: 400 });
    }
  }

  const updates: Parameters<typeof updateInvestment>[2] = {};
  if (payload.status === "sold") {
    updates.status = "sold";
    updates.soldPrice = payload.soldPrice;
    updates.soldAt = new Date().toISOString();
  } else {
    if (typeof payload.name === "string") {
      const trimmed = payload.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      updates.name = trimmed;
    }

    if (typeof payload.isin === "string") {
      const trimmed = payload.isin.trim();
      if (trimmed.length < 6) {
        return NextResponse.json({ error: "Invalid ISIN" }, { status: 400 });
      }
      updates.isin = trimmed;
    }

    if (payload.shares !== undefined) {
      if (typeof payload.shares !== "number" || Number.isNaN(payload.shares) || payload.shares <= 0) {
        return NextResponse.json({ error: "Invalid shares" }, { status: 400 });
      }
      updates.shares = payload.shares;
    }

    if (payload.buyInPrice !== undefined) {
      if (
        typeof payload.buyInPrice !== "number" ||
        Number.isNaN(payload.buyInPrice) ||
        payload.buyInPrice < 0
      ) {
        return NextResponse.json({ error: "Invalid buy-in price" }, { status: 400 });
      }
      updates.buyInPrice = payload.buyInPrice;
    }

    if (payload.expectedPrice !== undefined) {
      if (
        typeof payload.expectedPrice !== "number" ||
        Number.isNaN(payload.expectedPrice) ||
        payload.expectedPrice < 0
      ) {
        return NextResponse.json({ error: "Invalid expected price" }, { status: 400 });
      }
      updates.expectedPrice = payload.expectedPrice;
    }

    if (payload.currentPrice !== undefined) {
      if (
        typeof payload.currentPrice !== "number" ||
        Number.isNaN(payload.currentPrice) ||
        payload.currentPrice < 0
      ) {
        return NextResponse.json({ error: "Invalid current price" }, { status: 400 });
      }
      updates.currentPrice = payload.currentPrice;
    }
  }

  const updated = await updateInvestment(guard.user.id, resolvedParams.id, updates);

  if (!updated) {
    return NextResponse.json({ error: "Investment not found" }, { status: 404 });
  }

  return NextResponse.json({ investment: updated });
}
