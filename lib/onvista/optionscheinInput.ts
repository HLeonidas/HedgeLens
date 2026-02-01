import { parseDateGerman } from "@/lib/onvista/normalize";
import type { OnvistaImportData, RawValue } from "@/lib/onvista/types";
import type { OptionscheinCreateInput } from "@/lib/optionsschein/types";

export function buildOptionscheinInput(importData: OnvistaImportData): OptionscheinCreateInput {
  const { calculator, details } = importData;

  const basispreis =
    calculator.kpis["basispreis"]?.value ??
    findValue(details.stammdaten, ["basispreis"]) ??
    findValue(details.kennzahlen, ["basispreis"]);
  const breakEven =
    calculator.kpis["break even"]?.value ??
    calculator.kpis["break-even"]?.value ??
    findValue(details.kennzahlen, ["break even"]);
  const delta = calculator.kpis["delta"]?.value ?? findValue(details.hebel, ["delta"]);
  const omega = calculator.kpis["omega"]?.value ?? findValue(details.hebel, ["omega"]);
  const implVola =
    calculator.kpis["impl. volatilität"]?.value ??
    calculator.kpis["impl. volatilitaet"]?.value ??
    findValue(details.volatilitaet, ["impl. vola", "impl. volatil"]);

  const underlyingPrice =
    calculator.scenarioDefaults["kurs basiswert"]?.value ??
    calculator.scenarioDefaults["kurs basiswert aktuell"]?.value ??
    findValue(details.kennzahlen, [
      "kurs basiswert aktuell",
      "kurs basiswert",
      "basiswertkurs",
      "kurs basiswert aktuell",
    ]);
  const rate =
    calculator.scenarioDefaults["zinssatz"]?.value ??
    calculator.scenarioDefaults["zinssatz aktuell"]?.value ??
    0;
  const vol =
    calculator.scenarioDefaults["volatilität"]?.value ??
    calculator.scenarioDefaults["volatilitaet"]?.value ??
    implVola ??
    0.2;
  const fxRate =
    calculator.scenarioDefaults["wechselkurs"]?.value ??
    findValue(details.kennzahlen, ["wechselkurs"]) ??
    1;

  const valuationDate =
    calculator.meta.valuationDate ??
    calculator.meta.calcDate ??
    parseDateGerman(findRaw(details.handelsdaten, ["bewertungstag"]) ?? "") ??
    new Date().toISOString().slice(0, 10);

  const expiryRaw = findRaw(details.handelsdaten, [
    "letzter handelstag",
    "rueckzahlungstag",
    "rückzahlungstag",
  ]);
  const expiry = expiryRaw ? parseDateGerman(expiryRaw) ?? expiryRaw : valuationDate;

  const ratio = findValue(details.kennzahlen, ["bezugsverhältnis"]) ?? 1;
  const fairValue = findValue(details.kennzahlen, ["fairer wert"]);
  const intrinsicValue = findValue(details.kennzahlen, ["innerer wert"]);
  const timeValue = fairValue !== null && intrinsicValue !== null ? fairValue - intrinsicValue : null;
  const spreadAbs = findValue(details.kennzahlen, ["spread abs"]);
  const spreadPct = findValue(details.kennzahlen, ["spread %", "spread prozent"]);

  const bid = findValue(details.kennzahlen, ["aktueller geldkurs", "geldkurs", "bid"]);
  const ask = findValue(details.kennzahlen, ["aktueller briefkurs", "briefkurs", "ask"]);
  const last = findValue(details.kennzahlen, ["letzter kurs", "last"]);

  const warrantTypeRaw = findRaw(details.stammdaten, ["typ"]);
  const warrantType: "call" | "put" =
    warrantTypeRaw?.toLowerCase().includes("put") ? "put" : "call";

  const settlementRaw = findRaw(details.stammdaten, [
    "ausübungsart",
    "ausuebungsart",
    "auszahlungsmethode",
  ]);
  const settlementType: "cash" | "physical" =
    settlementRaw?.toLowerCase().includes("phys") ? "physical" : "cash";

  const issuer =
    calculator.issuer ?? findRaw(details.stammdaten, ["emittent", "issuer"]) ?? null;
  const name =
    calculator.name ??
    findRaw(details.stammdaten, ["produktname", "offizieller produktname"]) ??
    null;
  const underlyingName = findRaw(details.stammdaten, ["basiswert"]) ?? null;
  const underlyingSymbol = findRaw(details.stammdaten, ["basiswert"]) ?? "";
  const currency = findRaw(details.stammdaten, ["währung", "waehrung"]) ?? "EUR";

  const computedSnapshot = {
    inputHash: `${calculator.isin}:${valuationDate}:${underlyingPrice}:${vol}:${rate}`,
    computed: {
      fairValue: fairValue ?? null,
      intrinsicValue: intrinsicValue ?? null,
      timeValue: timeValue ?? null,
      breakEven: breakEven ?? null,
      agio: {
        absolute: findValue(details.kennzahlen, ["aufgeld abs"]) ?? null,
        percent: findValue(details.kennzahlen, ["aufgeld %", "aufgeld prozent"]) ?? null,
      },
      delta: delta ?? null,
      gamma: findValue(details.hebel, ["gamma"]) ?? null,
      theta: findValue(details.laufzeit, ["tages-theta", "theta"]) ?? null,
      vega: findValue(details.volatilitaet, ["vega"]) ?? null,
      omega: omega ?? null,
      asOf: valuationDate,
      warnings: spreadAbs !== null || spreadPct !== null ? undefined : undefined,
    },
  };

  const instrument = {
    isin: calculator.isin,
    name,
    issuer,
    warrantType,
    underlyingName,
    underlyingSymbol: underlyingSymbol || calculator.isin,
    strike: basispreis ?? 0,
    expiry,
    ratio: ratio ?? 1,
    currency,
    settlementType,
    multiplier: ratio ?? 1,
  };

  const pricingInputs = {
    valuationDate,
    underlyingPrice: underlyingPrice ?? 0,
    volatility: vol ?? 0.2,
    rate: rate ?? 0,
    dividendYield: 0,
    fxRate: fxRate ?? 1,
    marketPrice: last ?? null,
    bid: bid ?? null,
    ask: ask ?? null,
  };

  const input: OptionscheinCreateInput = {
    instrument,
    pricingInputs,
    computedSnapshot,
  };

  return input;
}

function findValue(section: Record<string, RawValue>, keys: string[]) {
  for (const key of keys) {
    const entry = Object.entries(section).find(([label]) => label.includes(key));
    if (entry?.[1]?.value !== undefined) return entry[1].value ?? null;
  }
  return null;
}

function findRaw(section: Record<string, RawValue>, keys: string[]) {
  for (const key of keys) {
    const entry = Object.entries(section).find(([label]) => label.includes(key));
    if (entry?.[1]?.raw) return entry[1].raw;
  }
  return null;
}
