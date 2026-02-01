import { NextResponse } from "next/server";

import { fetchHtmlWithCache } from "@/lib/onvista/fetch";
import { buildOptionscheinInput } from "@/lib/onvista/optionscheinInput";
import { parseCalculatorPage } from "@/lib/onvista/parseCalculator";
import { parseDetailsPage } from "@/lib/onvista/parseDetails";
import { resolveProductUrlBySearch } from "@/lib/onvista/resolve";
import { getOnvistaImportForIsin, storeOnvistaImportForIsin } from "@/lib/onvista/storage";

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

  try {
    let importData = await getOnvistaImportForIsin(isin);
    if (!importData) {
      const calculatorUrl = `https://www.onvista.de/derivate/optionsschein-rechner#${encodeURIComponent(isin)}`;
      const calculatorResponse = await fetchHtmlWithCache(calculatorUrl);
      const calculator = parseCalculatorPage(calculatorResponse.html, isin);
      if (!calculator.productUrl) {
        const resolved = await resolveProductUrlBySearch(isin);
        if (resolved) {
          calculator.productUrl = resolved;
        } else {
          return NextResponse.json({ error: "ISIN not found" }, { status: 404 });
        }
      }

      const detailsResponse = await fetchHtmlWithCache(calculator.productUrl);
      const details = parseDetailsPage(detailsResponse.html);

      importData = {
        calculator,
        details,
        sourceUrls: [calculatorUrl, calculator.productUrl],
        scrapedAt: new Date().toISOString(),
      };

      await storeOnvistaImportForIsin(isin, importData);
    }

    const optionscheinInput = buildOptionscheinInput(importData);
    const instrument = optionscheinInput.instrument;
    const pricingInputs = optionscheinInput.pricingInputs;

    return NextResponse.json({
      isin: instrument.isin,
      name: instrument.name ?? undefined,
      type: instrument.warrantType,
      underlying: instrument.underlyingSymbol,
      strike: instrument.strike,
      expiry: instrument.expiry,
      currency: instrument.currency,
      ratio: instrument.ratio,
      price: pricingInputs.marketPrice ?? undefined,
      underlyingPrice: pricingInputs.underlyingPrice ?? undefined,
      volatility: pricingInputs.volatility ?? undefined,
      rate: pricingInputs.rate ?? undefined,
      dividendYield: pricingInputs.dividendYield ?? undefined,
      fxRate: pricingInputs.fxRate ?? undefined,
      valuationDate: pricingInputs.valuationDate ?? undefined,
      fetchedAt: importData.scrapedAt,
      source: "onvista",
    });
  } catch {
    return NextResponse.json({ error: "ISIN lookup failed" }, { status: 502 });
  }
}
