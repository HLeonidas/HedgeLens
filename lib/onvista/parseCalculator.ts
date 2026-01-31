import * as cheerio from "cheerio";

import {
  normalizeLabel,
  parseGermanNumber,
  parsePercent,
  parseDateGerman,
} from "@/lib/onvista/normalize";
import type { OnvistaCalculatorData, RawValue } from "@/lib/onvista/types";

/**
 * Parse https://www.onvista.de/derivate/optionsschein-rechner#{ISIN}
 *
 * The calculator page has two important parts:
 * 1) "Ausgewählt zur Berechnung" (selected product + product detail link)
 * 2) KPI tiles row (Basispreis, Aufgeld, Break Even, Delta, Omega, Impl. Volatilität, Bewertungstag)
 * 3) Scenario defaults table (the "aktuell" values live in the LEFT label cell)
 */
export function parseCalculatorPage(html: string, isin: string): OnvistaCalculatorData {
  const $ = cheerio.load(html);

  // --- 1) Selected product block ---
  const selectedBlock = findSelectedProductBlock($);
  const productAnchor =
    selectedBlock
      .find('a[href*="/derivate/Optionsscheine/"]')
      .first() || null;

  const productUrl = absolutizeUrl(
    productAnchor?.attr("href") || null
  );

  const productName = productAnchor?.text().trim() || null;

  const sublineText = selectedBlock.find(".subline").first().text().trim();
  const wkn = extractWkn(sublineText) || null;
  const issuer = extractIssuerFromProductName(productName) || null;

  // --- 2) KPI tiles row ---
  const kpis: Record<string, RawValue> = {};
  const kpiLabels = [
    "Basispreis",
    "Aufgeld",
    "Break Even",
    "Delta",
    "Omega",
    "Impl. Volatilität",
    "Bewertungstag",
  ];

  for (const label of kpiLabels) {
    const rv = readKpiTileValue($, label);
    if (rv) kpis[normalizeLabel(label)] = rv;
  }

  // --- 3) Scenario defaults ("aktuell" values) ---
  const scenarioDefaults: Record<string, RawValue> = {};
  const scenarioLabels = [
    "Kurs Basiswert",
    "Zinssatz",
    "Volatilität",
    "Wechselkurs",
    "Berechnungstag",
  ];

  for (const label of scenarioLabels) {
    const rv = readCurrentScenarioValue($, label);
    if (rv) scenarioDefaults[normalizeLabel(label)] = rv;
  }

  const calcDateRaw = readCurrentScenarioValue($, "Berechnungstag")?.raw ?? null;
  const maxDateRaw = $("input#maxDate").attr("value") || null;
  const valuationDateRaw = kpis[normalizeLabel("Bewertungstag")]?.raw ?? null;

  const meta = {
    calcDate: calcDateRaw ? parseDateGerman(calcDateRaw) : null,
    maxDate: maxDateRaw ? parseDateGerman(maxDateRaw) ?? maxDateRaw : null,
    valuationDate: valuationDateRaw ? parseDateGerman(valuationDateRaw) : null,
  };

  return {
    isin,
    wkn,
    name: productName,
    issuer,
    productUrl: productUrl || null,
    kpis,
    scenarioDefaults,
    meta,
  };
}

/** Find the block that contains the selected product ("Ausgewählt zur Berechnung"). */
function findSelectedProductBlock($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  const pre = $("div.headline__pre")
    .filter((_, el) => normalizeLabel($(el).text()).includes("ausgewahlt"))
    .first();

  if (pre.length) {
    // product info is in the next container in DOM
    const container = pre.closest("div");
    if (container.length) return container;
  }

  // fallback: nearest area around the first product link
  const anyProductLink = $('a[href*="/derivate/Optionsscheine/"]').first();
  return anyProductLink.closest("div") || $("body");
}

/** Read KPI tile value (works with the div-tile structure used by Onvista). */
function readKpiTileValue($: cheerio.CheerioAPI, label: string): RawValue | null {
  const target = normalizeLabel(label);

  // the label appears in a <span> inside the tile
  const labelSpan = $("span")
    .filter((_, el) => normalizeLabel($(el).text()) === target)
    .first();

  if (!labelSpan.length) return null;

  // tile container is the nearest parent that contains both label and value
  const tile = labelSpan.closest("div");
  // prefer numeric from data[value]
  const dataEl = tile.find("data[value]").first();
  if (dataEl.length) {
    const valueAttr = dataEl.attr("value") || "";
    const rawText = dataEl.text().trim();
    const raw = valueAttr || rawText;
    const val = parseTileValue(label, rawText, valueAttr);
    return { label, raw: rawText || raw, value: val };
  }

  // Bewertungstag is plain text inside the value container
  const valueText = tile.parent().find("div.text-xl, div.text-lg").first().text().trim();
  if (!valueText) return null;

  // keep raw as display text (e.g. 18.06.2026) and do not force numeric
  return { label, raw: valueText, value: null };
}

function parseTileValue(label: string, rawText: string, valueAttr: string): number | null {
  const l = normalizeLabel(label);
  // prefer attr numeric if present
  const raw = valueAttr || rawText;

  if (l.includes("aufgeld") || l.includes("volatil")) return parsePercent(rawText) ?? parseGermanNumber(raw);
  return parseGermanNumber(raw);
}

/**
 * Scenario rows look like:
 *  TD1: label + "aktuell <data value=...>..."
 *  TD2..: inputs for scenario values
 * We want the "aktuell" value in TD1.
 */
function readCurrentScenarioValue($: cheerio.CheerioAPI, label: string): RawValue | null {
  const target = normalizeLabel(label);

  const row = $("tr")
    .filter((_, el) => {
      const firstTdText = $(el).find("td").first().text();
      return normalizeLabel(firstTdText).includes(target);
    })
    .first();

  if (!row.length) return null;

  const firstCell = row.find("td").first();

  // "aktuell" value is usually in <data value="..."> inside the first cell
  const dataEl = firstCell.find("data[value]").first();
  if (dataEl.length) {
    const valueAttr = dataEl.attr("value") || "";
    const rawText = dataEl.text().trim();
    const raw = rawText || valueAttr;

    // parse percent for volatility row
    const val =
      target.includes("volatil")
        ? parsePercent(rawText) ?? parseGermanNumber(valueAttr || rawText)
        : parseGermanNumber(valueAttr || rawText);

    return { label, raw, value: val };
  }

  // calculation day: <time datetime="...">31.01.2026</time>
  const timeEl = firstCell.find("time").first();
  if (timeEl.length) {
    const rawText = timeEl.text().trim();
    return { label, raw: rawText, value: null };
  }

  return null;
}

function extractWkn(subline: string): string | null {
  // e.g. "WKN VH1VXK · ISIN DE000VH1VXK0"
  const m = subline.match(/WKN\s+([A-Z0-9]+)/i);
  return m?.[1] ?? null;
}

function extractIssuerFromProductName(name: string | null): string | null {
  if (!name) return null;
  // often starts with issuer (e.g. "BANK VONTOBEL/PUT/...")
  const first = name.split("/")[0]?.trim();
  if (!first) return null;
  // avoid generic titles
  if (normalizeLabel(first).includes("optionsschein")) return null;
  return first;
}

function absolutizeUrl(href: string | null): string | null {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `https://www.onvista.de${href.startsWith("/") ? "" : "/"}${href}`;
}
