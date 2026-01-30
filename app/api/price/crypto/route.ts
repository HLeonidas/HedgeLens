import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { symbol?: string } | null;

  if (!body?.symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const symbol = body.symbol.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  return NextResponse.json({
    symbol,
    name: symbol === "BTC" ? "Bitcoin" : symbol,
    price: 42000,
    currency: "USD",
    asOf: new Date().toISOString(),
  });
}