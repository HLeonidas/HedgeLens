import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { fetchHtmlWithCache } from "@/lib/onvista/fetch";
import { parseCalculatorPage } from "@/lib/onvista/parseCalculator";
import { parseDetailsPage } from "@/lib/onvista/parseDetails";
import { resolveProductUrlBySearch } from "@/lib/onvista/resolve";
import { buildOptionscheinInput } from "@/lib/onvista/optionscheinInput";
import { getOnvistaImportForIsin, storeOnvistaImportForIsin } from "@/lib/onvista/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const payload = (await request.json().catch(() => null)) as { isin?: string } | null;
  const isin = payload?.isin?.trim().toUpperCase() ?? "";
  if (!isValidIsin(isin)) {
    return NextResponse.json({ ok: false, error: "Invalid ISIN" }, { status: 400 });
  }

  try {
    const cached = await getOnvistaImportForIsin(isin);
    if (cached) {
      const optionscheinInput = buildOptionscheinInput(cached);
      return NextResponse.json({ ok: true, data: cached, optionscheinInput, cached: true });
    }

    const calculatorUrl = `https://www.onvista.de/derivate/optionsschein-rechner#${encodeURIComponent(isin)}`;
    const calculatorResponse = await fetchHtmlWithCache(calculatorUrl);
    const calculator = parseCalculatorPage(calculatorResponse.html, isin);
    if (!calculator.productUrl) {
      const resolved = await resolveProductUrlBySearch(isin);
      if (resolved) {
        calculator.productUrl = resolved;
      } else {
        return NextResponse.json({ ok: false, error: "ISIN not found" }, { status: 404 });
      }
    }

    const detailsResponse = await fetchHtmlWithCache(calculator.productUrl);
    const details = parseDetailsPage(detailsResponse.html);

    const importData = {
      calculator,
      details,
      sourceUrls: [calculatorUrl, calculator.productUrl],
      scrapedAt: new Date().toISOString(),
      htmlHash: hash(calculatorResponse.html + detailsResponse.html),
    };

    const optionscheinInput = buildOptionscheinInput(importData);
    await storeOnvistaImportForIsin(isin, importData);
    return NextResponse.json({ ok: true, data: importData, optionscheinInput });

    // const created = await createOptionschein(guard.user.id, optionscheinInput);
    // if (!created) {
    //   return NextResponse.json({ ok: false, error: "Unable to store optionschein" }, { status: 500 });
    // }
    //
    // await storeOnvistaImport(created.id, importData);
    //
    // return NextResponse.json({ ok: true, optionscheinId: created.id, data: importData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onvista import failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function isValidIsin(isin: string) {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
