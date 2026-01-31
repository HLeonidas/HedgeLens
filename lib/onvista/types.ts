export type RawValue = {
  label: string;
  raw: string;
  value: number | null;
};

export type OnvistaCalculatorData = {
  isin: string;
  wkn?: string | null;
  name?: string | null;
  issuer?: string | null;
  productUrl?: string | null;
  kpis: Record<string, RawValue>;
  scenarioDefaults: Record<string, RawValue>;
  meta: {
    valuationDate?: string | null;
    maxDate?: string | null;
    calcDate?: string | null;
  };
};

export type OnvistaDetailsData = {
  stammdaten: Record<string, RawValue>;
  description?: string | null;
  kennzahlen: Record<string, RawValue>;
  handelsdaten: Record<string, RawValue>;
  hebel: Record<string, RawValue>;
  volatilitaet: Record<string, RawValue>;
  laufzeit: Record<string, RawValue>;
  zinsniveau: Record<string, RawValue>;
  weitereKurse: Array<Record<string, RawValue>>;
};

export type OnvistaImportData = {
  calculator: OnvistaCalculatorData;
  details: OnvistaDetailsData;
  sourceUrls: string[];
  scrapedAt: string;
  htmlHash?: string | null;
};
