import * as cheerio from "cheerio";

import { normalizeLabel, parseGermanNumber, parsePercent, toRawValue } from "@/lib/onvista/normalize";
import type { OnvistaDetailsData, RawValue } from "@/lib/onvista/types";

export function parseDetailsPage(html: string): OnvistaDetailsData {
  const $ = cheerio.load(html);

  const nextData = extractNextData($);
  const fromNext = nextData ? parseDetailsFromNextData(nextData) : null;

  const fromDom = parseDetailsFromDom($);
  const details = mergeDetails(fromNext, fromDom);

  return details;
}

function parseDetailsFromDom($: cheerio.CheerioAPI): OnvistaDetailsData {
  const stammdaten = parseTableSection($, "Stammdaten");
  const optionscheinTableSections = parseOptionsscheinKennzahlenTable($);
  const kennzahlen = mergeSection(
    parseTableSection($, "Optionsschein-Kennzahlen"),
    optionscheinTableSections?.kennzahlen
  );
  const handelsdaten = mergeSection(
    parseTableSection($, "Handelsdaten"),
    optionscheinTableSections?.handelsdaten
  );
  const hebel = mergeSection(parseTableSection($, "Hebel"), optionscheinTableSections?.hebel);
  const volatilitaet = mergeSection(
    parseTableSection($, "Volatilität"),
    optionscheinTableSections?.volatilitaet
  );
  const laufzeit = mergeSection(parseTableSection($, "Laufzeit"), optionscheinTableSections?.laufzeit);
  const zinsniveau = mergeSection(
    parseTableSection($, "Zinsniveau"),
    optionscheinTableSections?.zinsniveau
  );
  const weitereKurse = parseWeitereKurse($);

  const description = extractDescription($);

  return {
    stammdaten,
    description,
    kennzahlen,
    handelsdaten,
    hebel,
    volatilitaet,
    laufzeit,
    zinsniveau,
    weitereKurse,
  };
}

function mergeDetails(primary: OnvistaDetailsData | null, fallback: OnvistaDetailsData): OnvistaDetailsData {
  if (!primary) return fallback;
  return {
    stammdaten: { ...fallback.stammdaten, ...primary.stammdaten },
    description: primary.description ?? fallback.description ?? null,
    kennzahlen: { ...fallback.kennzahlen, ...primary.kennzahlen },
    handelsdaten: { ...primary.handelsdaten, ...fallback.handelsdaten },
    hebel: { ...fallback.hebel, ...primary.hebel },
    volatilitaet: { ...fallback.volatilitaet, ...primary.volatilitaet },
    laufzeit: { ...fallback.laufzeit, ...primary.laufzeit },
    zinsniveau: { ...fallback.zinsniveau, ...primary.zinsniveau },
    weitereKurse: primary.weitereKurse.length ? primary.weitereKurse : fallback.weitereKurse,
  };
}

function parseTableSection($: cheerio.CheerioAPI, heading: string) {
  const table = findTableByTitle($, heading);
  if (!table) return {};
  const rows = table.find("tr");
  const result: Record<string, RawValue> = {};
  rows.each((_, row) => {
    const cells = $(row).find("th,td");
    if (cells.length < 2) return;
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const label = $(cells[i]).text().trim();
      const value = $(cells[i + 1]).text().trim();
      if (!label || !value) continue;
      const normalized = normalizeLabel(label);
      const parsed = parseValue(normalized, value);
      result[normalized] = toRawValue(label, value, parsed);
    }
  });
  return result;
}

function mergeSection(primary: Record<string, RawValue>, fallback?: Record<string, RawValue>) {
  if (!fallback) return primary;
  return { ...fallback, ...primary };
}

function parseOptionsscheinKennzahlenTable($: cheerio.CheerioAPI) {
  const table = findTableByTitle($, "Optionsschein-Kennzahlen");
  if (!table) return null;

  const sections = {
    kennzahlen: {} as Record<string, RawValue>,
    handelsdaten: {} as Record<string, RawValue>,
    hebel: {} as Record<string, RawValue>,
    volatilitaet: {} as Record<string, RawValue>,
    laufzeit: {} as Record<string, RawValue>,
    zinsniveau: {} as Record<string, RawValue>,
  };

  let current: keyof typeof sections = "kennzahlen";

  table.find("tr").each((_, row) => {
    const cells = $(row).find("th,td");
    if (cells.length === 0) return;

    if (cells.length === 1) {
      const label = $(cells[0]).text().trim();
      if (!label) return;
      const normalized = normalizeLabel(label);
      const section = mapSectionHeader(normalized);
      if (section) current = section;
      return;
    }

    if (cells.length < 2) return;
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const label = $(cells[i]).text().trim();
      const value = $(cells[i + 1]).text().trim();
      if (!label) continue;
      if (!value) {
        const normalized = normalizeLabel(label);
        const section = mapSectionHeader(normalized);
        if (section) current = section;
        continue;
      }
      const normalized = normalizeLabel(label);
      const parsed = parseValue(normalized, value);
      sections[current][normalized] = toRawValue(label, value, parsed);
    }
  });

  return sections;
}

function mapSectionHeader(normalized: string) {
  if (normalized.includes("handelsdaten")) return "handelsdaten";
  if (normalized.includes("hebel")) return "hebel";
  if (normalized.includes("volatil")) return "volatilitaet";
  if (normalized.includes("laufzeit")) return "laufzeit";
  if (normalized.includes("zinsniveau")) return "zinsniveau";
  if (normalized.includes("kennzahlen")) return "kennzahlen";
  return null;
}

function parseWeitereKurse($: cheerio.CheerioAPI) {
  const table = findTableByTitle($, "Weitere Kurse");
  if (!table) return [];
  const entries: Array<Record<string, RawValue>> = [];
  const rows = table.find("tbody tr");
  rows.each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length === 0) return;
    const entry: Record<string, RawValue> = {};
    cells.each((cellIndex, cell) => {
      const header =
        table.find("thead th").eq(cellIndex).text().trim() || `col_${cellIndex}`;
      const key = normalizeLabel(header);
      const value = $(cell).text().trim();
      entry[key] = toRawValue(header, value, parseValue(key, value));
    });
    entries.push(entry);
  });
  return entries;
}

function extractDescription($: cheerio.CheerioAPI) {
  const heading = $("h2, h3")
    .filter((_, el) => normalizeLabel($(el).text()).includes("produktbeschreibung"))
    .first();
  if (heading.length === 0) return null;

  // Product description is usually within the same section; take first paragraph in that section
  const section = heading.closest("section");
  const paragraph = (section.length ? section : heading.parent())
    .find("p")
    .first()
    .text()
    .trim();

  return paragraph || null;
}

function parseValue(label: string, raw: string) {
  if (label.includes("datum") || label.includes("tag") || label.includes("laufzeit")) {
    return null;
  }
  if (
    label.includes("volatil") ||
    label.includes("aufgeld") ||
    label.includes("%") ||
    label.includes("prozent") ||
    label.includes("spread %")
  ) {
    const pct = parsePercent(raw);
    if (pct !== null) return pct;
  }
  return parseGermanNumber(raw);
}

function extractNextData($: cheerio.CheerioAPI) {
  const scriptText = $("#__NEXT_DATA__").first().text().trim();
  if (!scriptText) return null;
  try {
    return JSON.parse(scriptText);
  } catch {
    return null;
  }
}

function parseDetailsFromNextData(nextData: any): OnvistaDetailsData | null {
  const snapshot = nextData?.props?.pageProps?.data?.snapshot;
  if (!snapshot) return null;

  const instrument = snapshot.instrument ?? {};
  const issuer = snapshot.derivativesIssuer ?? {};
  const details = snapshot.derivativesDetails ?? {};
  const figures = snapshot.derivativesFigure ?? {};
  const underlying = snapshot.derivativesUnderlyingList?.list?.[0] ?? {};
  const barrier = underlying.derivativesBarrierList?.list?.find(
    (item: { typeBarrier?: string }) => item?.typeBarrier === "STRIKE"
  );

  const stammdaten: Record<string, RawValue> = {};
  addValue(stammdaten, "ISIN", instrument.isin, null);
  addValue(stammdaten, "WKN", instrument.wkn, null);
  addValue(stammdaten, "Produktname", details.officialName ?? instrument.name, null);
  addValue(stammdaten, "Emittent", issuer.name ?? details.nameProductIssuer, null);
  addValue(
    stammdaten,
    "Basiswert",
    underlying.instrument?.name ?? underlying.officialName ?? underlying.shortName,
    null
  );
  addValue(stammdaten, "Währung", details.isoCurrency ?? underlying.isoCurrency, null);
  addValue(stammdaten, "Bezugsverhältnis", underlying.coverRatio, asNumber(underlying.coverRatio));
  addValue(stammdaten, "Basispreis", barrier?.barrier, asNumber(barrier?.barrier));
  addValue(stammdaten, "Typ", details.nameExerciseRight, null);
  addValue(stammdaten, "Ausübungsart", details.nameExerciseStyle, null);
  addValue(stammdaten, "Auszahlungsmethode", details.nameTypeSettlement, null);

  const kennzahlen: Record<string, RawValue> = {};
  addValue(
    kennzahlen,
    "Kurs Basiswert aktuell",
    figures.priceUnderlyingCalculation ?? figures.priceUnderlying,
    asNumber(figures.priceUnderlyingCalculation ?? figures.priceUnderlying)
  );
  addValue(kennzahlen, "Break Even", figures.breakEven, asNumber(figures.breakEven));
  addValue(kennzahlen, "Fairer Wert (Black & Scholes)", figures.theoreticalValue, asNumber(figures.theoreticalValue));
  addValue(kennzahlen, "Innerer Wert", figures.intrinsicValue, asNumber(figures.intrinsicValue));
  addValue(kennzahlen, "Spread abs.", figures.spread, asNumber(figures.spread));
  addValue(kennzahlen, "Spread in %", figures.spreadAskPct, asPercent(figures.spreadAskPct));
  addValue(kennzahlen, "Homogenisierter Spread", figures.harmonisedSpread, asNumber(figures.harmonisedSpread));
  addValue(kennzahlen, "Aufgeld abs.", figures.premium, asNumber(figures.premium));
  addValue(kennzahlen, "Aufgeld p.a.", figures.premiumPerAnnum, asPercent(figures.premiumPerAnnum));
  addValue(kennzahlen, "Aktueller Briefkurs", snapshot.quote?.ask, asNumber(snapshot.quote?.ask));
  addValue(kennzahlen, "Aktueller Geldkurs", snapshot.quote?.bid, asNumber(snapshot.quote?.bid));
  addValue(kennzahlen, "Letzter Kurs", snapshot.quote?.last, asNumber(snapshot.quote?.last));

  const handelsdaten: Record<string, RawValue> = {};
  addValue(
    handelsdaten,
    "Letzter Handelstag",
    formatGermanDate(details.datetimeLastTradingDay),
    null
  );
  addValue(handelsdaten, "Bewertungstag", formatGermanDate(figures.datetimeCalculation), null);
  addValue(handelsdaten, "Rückzahlungstag", formatGermanDate(details.datetimePayment), null);

  const hebel: Record<string, RawValue> = {};
  addValue(hebel, "Delta", figures.delta, asNumber(figures.delta));
  addValue(hebel, "Gamma", figures.gamma, asNumber(figures.gamma));
  addValue(hebel, "Omega", figures.leverage, asNumber(figures.leverage));
  addValue(hebel, "Einfacher Hebel", figures.gearing, asNumber(figures.gearing));
  addValue(
    hebel,
    "Totalverlustwahrscheinlichkeit",
    figures.totalLossProbability,
    asNumber(figures.totalLossProbability)
  );

  const volatilitaet: Record<string, RawValue> = {};
  addValue(volatilitaet, "Implizite Volatilität", figures.impliedVolatility, asPercent(figures.impliedVolatility));
  addValue(volatilitaet, "Vega", figures.vega, asNumber(figures.vega));

  const laufzeit: Record<string, RawValue> = {};
  addValue(laufzeit, "Restlaufzeit", figures.daysUntilMaturity, asNumber(figures.daysUntilMaturity));
  addValue(laufzeit, "Tages-Theta in Prozent", figures.thetaDayPct, asPercent(figures.thetaDayPct));
  addValue(laufzeit, "Wochen-Theta in Prozent", figures.thetaWeekPct, asPercent(figures.thetaWeekPct));

  const zinsniveau: Record<string, RawValue> = {};
  addValue(zinsniveau, "Rho", figures.rho, asNumber(figures.rho));

  const weitereKurse = parseWeitereKurseFromQuoteList(snapshot.quoteList);

  return {
    stammdaten,
    description: normalizeDescription(details.description),
    kennzahlen,
    handelsdaten,
    hebel,
    volatilitaet,
    laufzeit,
    zinsniveau,
    weitereKurse,
  };
}

function parseWeitereKurseFromQuoteList(quoteList: any) {
  const list = quoteList?.list;
  if (!Array.isArray(list)) return [];
  return list.map((quote: any) => {
    const entry: Record<string, RawValue> = {};
    const marketName = quote.market?.name ?? quote.market?.nameExchange ?? quote.market?.codeExchange ?? "Unbekannt";
    const currency = quote.isoCurrency ?? "";
    addValue(entry, "Kursquelle", marketName, null);
    addValue(entry, "Letzter Kurs", formatNumber(quote.last, currency), asNumber(quote.last));
    addValue(entry, "Geld", formatNumber(quote.bid, currency), asNumber(quote.bid));
    addValue(entry, "Brief", formatNumber(quote.ask, currency), asNumber(quote.ask));
    addValue(entry, "Zeit", quote.datetimeLast ?? "", null);
    addValue(entry, "Vol. 4 Wochen", quote.volume4Weeks, asNumber(quote.volume4Weeks));
    return entry;
  });
}

function addValue(section: Record<string, RawValue>, label: string, raw: unknown, value: number | null) {
  if (raw === null || raw === undefined || raw === "") return;
  const normalized = normalizeLabel(label);
  const rawText = formatRaw(raw);
  section[normalized] = toRawValue(label, rawText, value);
}

function formatRaw(raw: unknown) {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  return String(raw);
}

function normalizeDescription(description: unknown): string | null {
  if (!description) return null;
  if (typeof description === "string") return description.trim() || null;
  if (Array.isArray(description)) {
    const parts = description
      .map((item) => (item && typeof item === "object" ? (item as { value?: string }).value : ""))
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const joined = parts.join(" ").trim();
    return joined || null;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function asPercent(value: unknown): number | null {
  const num = asNumber(value);
  if (num === null) return null;
  if (Math.abs(num) > 1.5) return num / 100;
  return num;
}

function formatGermanDate(value: unknown) {
  if (!value || typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

function formatNumber(value: unknown, currency?: string) {
  const num = asNumber(value);
  if (num === null) return "";
  return currency ? `${num} ${currency}` : String(num);
}

/**
 * onvista tables are usually wrapped in multiple divs. The most stable anchor is
 * the table header cell text (thead th) such as "Handelsdaten", "Hebel", etc.
 *
 * We keep a secondary fallback: find a heading element and then search *within*
 * its nearest section for tables.
 */
function findTableByTitle($: cheerio.CheerioAPI, title: string) {
  const want = normalizeLabel(title);

  // Primary: match table header (thead th text)
  const byHeader = $("table")
    .filter((_, el) => {
      const thText = $(el).find("thead th").first().text();
      return normalizeLabel(thText).includes(want);
    })
    .first();
  if (byHeader.length) return byHeader;

  // Secondary: locate a heading and search within the closest section/container
  const headingEl = $("h2, h3, h4")
    .filter((_, el) => normalizeLabel($(el).text()).includes(want))
    .first();
  if (!headingEl.length) return null;

  const section = headingEl.closest("section");
  const scoped = (section.length ? section : headingEl.parent()).find("table").first();
  return scoped.length ? scoped : null;
}
