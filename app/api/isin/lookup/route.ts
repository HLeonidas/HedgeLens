import { NextResponse } from "next/server";

import { fetchHtmlWithCache } from "@/lib/onvista/fetch";
import { buildOptionscheinInput } from "@/lib/onvista/optionscheinInput";
import { parseCalculatorPage } from "@/lib/onvista/parseCalculator";
import { parseDetailsPage } from "@/lib/onvista/parseDetails";
import { resolveProductUrlBySearch } from "@/lib/onvista/resolve";
import { getOnvistaImportForIsin, storeOnvistaImportForIsin } from "@/lib/onvista/storage";
import { priceWarrant, type WarrantPayload } from "@/lib/warrantPricer";

export const runtime = "nodejs";

function toGermanDate(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

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
    const computed = optionscheinInput.computedSnapshot?.computed ?? null;
    const needsTheta =
      computed &&
      (computed.theta === null || computed.theta === undefined) &&
      pricingInputs.valuationDate &&
      Number.isFinite(pricingInputs.underlyingPrice) &&
      Number.isFinite(pricingInputs.volatility) &&
      Number.isFinite(pricingInputs.rate) &&
      Number.isFinite(instrument.strike) &&
      Boolean(instrument.expiry);

    const computedWithTheta = needsTheta
      ? (() => {
          try {
          const payload: WarrantPayload = {
            details: {
              stammdaten: {
                basispreis: { raw: String(instrument.strike), value: instrument.strike },
                bezugsverhältnis: { raw: String(instrument.ratio ?? 1), value: instrument.ratio ?? 1 },
                typ: { raw: instrument.warrantType.toUpperCase(), value: null },
                währung: { raw: instrument.currency, value: null },
              },
              handelsdaten: {
                "letzter handelstag": {
                  raw: toGermanDate(instrument.expiry) ?? instrument.expiry,
                  value: null,
                },
              },
              volatilitaet: {
                "implizite volatilität": {
                  raw: String(pricingInputs.volatility),
                  value: pricingInputs.volatility,
                },
              },
            },
          };

          const pricing = priceWarrant(payload, {
            valuationDate: pricingInputs.valuationDate!,
            spot: pricingInputs.underlyingPrice!,
            dividendYield: pricingInputs.dividendYield ?? 0,
            riskFreeRate: pricingInputs.rate!,
            fx: { underlyingPerWarrant: 1 / (pricingInputs.fxRate ?? 1) },
            underlyingCurrency: instrument.currency,
          });

          return {
            ...computed,
            theta: Number(pricing.results.greeks.theta.toFixed(6)),
          };
          } catch {
            return computed;
          }
        })()
      : computed;

    return NextResponse.json({
      isin: instrument.isin,
      name: instrument.name ?? undefined,
      issuer: instrument.issuer ?? undefined,
      type: instrument.warrantType,
      underlying: instrument.underlyingSymbol,
      underlyingName: instrument.underlyingName ?? undefined,
      strike: instrument.strike,
      expiry: instrument.expiry,
      currency: instrument.currency,
      ratio: instrument.ratio,
      settlementType: instrument.settlementType ?? undefined,
      multiplier: instrument.multiplier ?? undefined,
      price: pricingInputs.marketPrice ?? undefined,
      bid: pricingInputs.bid ?? undefined,
      ask: pricingInputs.ask ?? undefined,
      underlyingPrice: pricingInputs.underlyingPrice ?? undefined,
      volatility: pricingInputs.volatility ?? undefined,
      rate: pricingInputs.rate ?? undefined,
      dividendYield: pricingInputs.dividendYield ?? undefined,
      fxRate: pricingInputs.fxRate ?? undefined,
      valuationDate: pricingInputs.valuationDate ?? undefined,
      computed: computedWithTheta ?? undefined,
      fetchedAt: importData.scrapedAt,
      source: "onvista",
    });
  } catch {
    return NextResponse.json({ error: "ISIN lookup failed" }, { status: 502 });
  }
}
