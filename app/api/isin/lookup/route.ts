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

  if (process.env.ISIN_PROVIDER_URL) {
    const providerResponse = await fetch(process.env.ISIN_PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ISIN_PROVIDER_KEY
          ? { Authorization: `Bearer ${process.env.ISIN_PROVIDER_KEY}` }
          : {}),
      },
      body: JSON.stringify({ isin }),
      cache: "no-store",
    });

    if (!providerResponse.ok) {
      return NextResponse.json({ error: "ISIN_PROVIDER_ERROR" }, { status: 502 });
    }

    const payload = await providerResponse.json();
    return NextResponse.json(payload);
  }

  return NextResponse.json({
    isin,
    name: "Sample Instrument",
    issuer: "Demo Issuer",
    type: "call",
    underlying: "DAX",
    strike: 19000,
    expiry: new Date(new Date().getFullYear() + 1, 5, 19).toISOString().slice(0, 10),
    currency: "EUR",
    price: 2.34,
    greeks: { delta: 0.42, theta: -0.03 },
    fetchedAt: new Date().toISOString(),
  });
}