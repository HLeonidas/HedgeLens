import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { isin?: string } | null;

  if (!body?.isin) {
    return NextResponse.json({ error: "Missing ISIN" }, { status: 400 });
  }

  const isin = body.isin.trim().toUpperCase();

  if (!isin) {
    return NextResponse.json({ error: "Invalid ISIN" }, { status: 400 });
  }

  return NextResponse.json({
    isin,
    name: "Sample Instrument",
    price: 12.34,
    currency: "EUR",
    asOf: new Date().toISOString(),
  });
}