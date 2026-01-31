import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getOnvistaImport } from "@/lib/onvista/storage";
import { listOptionscheine } from "@/lib/optionsschein/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const { searchParams } = new URL(request.url);
  const isin = (searchParams.get("isin") ?? "").trim().toUpperCase();
  if (!isin) {
    return NextResponse.json({ ok: false, error: "isin required" }, { status: 400 });
  }

  const optionscheine = await listOptionscheine(guard.user.id, 500);
  const match = optionscheine.find((item) => item.instrument.isin.toUpperCase() === isin);
  if (!match) {
    return NextResponse.json({ ok: false, error: "Onvista data not found" }, { status: 404 });
  }

  const data = await getOnvistaImport(match.id);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Onvista data not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
