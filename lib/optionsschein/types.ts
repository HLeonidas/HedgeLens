export type WarrantType = "call" | "put";

export type SettlementType = "cash" | "physical";

export type OptionscheinInstrument = {
  isin: string;
  name?: string | null;
  issuer?: string | null;
  warrantType: WarrantType;
  underlyingName?: string | null;
  underlyingSymbol: string;
  strike: number;
  expiry: string;
  ratio: number;
  currency: string;
  settlementType?: SettlementType | null;
  multiplier?: number | null;
};

export type OptionscheinPricingInputs = {
  valuationDate: string;
  underlyingPrice: number;
  volatility: number;
  rate: number;
  dividendYield: number;
  fxRate?: number | null;
  marketPrice?: number | null;
  bid?: number | null;
  ask?: number | null;
};

export type OptionscheinPositionFields = {
  projectId: string;
  entryPrice: number;
  quantity: number;
};

export type OptionscheinComputed = {
  fairValue: number | null;
  intrinsicValue: number | null;
  timeValue: number | null;
  breakEven: number | null;
  agio?: {
    absolute: number | null;
    percent: number | null;
  };
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  omega: number | null;
  asOf: string;
  warnings?: string[];
};

export type OptionscheinComputedSnapshot = {
  inputHash: string;
  computed: OptionscheinComputed;
};

export type OptionscheinBase = {
  id: string;
  ownerId: string;
  instrument: OptionscheinInstrument;
  pricingInputs: OptionscheinPricingInputs;
  createdAt: string;
  updatedAt: string;
  computedSnapshot?: OptionscheinComputedSnapshot | null;
};

export type OptionscheinStandalone = OptionscheinBase & {
  projectId?: null;
  entryPrice?: null;
  quantity?: null;
};

export type OptionscheinProjectBound = OptionscheinBase & OptionscheinPositionFields;

export type Optionschein = OptionscheinStandalone | OptionscheinProjectBound;

export type OptionscheinCreateInput = {
  instrument: OptionscheinInstrument;
  pricingInputs: OptionscheinPricingInputs;
  computedSnapshot?: OptionscheinComputedSnapshot | null;
  position?: OptionscheinPositionFields | null;
};

export type OptionscheinUpdateInput = Partial<{
  instrument: OptionscheinInstrument;
  pricingInputs: OptionscheinPricingInputs;
  computedSnapshot: OptionscheinComputedSnapshot | null;
  position: OptionscheinPositionFields | null;
}>;
