export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type InstrumentType = 'put' | 'call';
export type PositionSide = 'put' | 'call';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  preferences?: Record<string, unknown>;
  riskProfile?: RiskProfile;
}

export interface Project {
  id: string;
  ownerUid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  baseCurrency: string;
  ratios?: {
    putCount: number;
    callCount: number;
    ratio: number;
  };
  constraints?: {
    maxLoss?: number;
    minReturn?: number;
    maxVolatility?: number;
    horizonDays?: number;
  };
}

export interface Instrument {
  isin: string;
  name: string;
  issuer: string;
  type: InstrumentType;
  underlying: string;
  strike: number;
  expiry: string;
  currency: string;
  price: number;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
  fetchedAt: string;
}

export interface Position {
  id: string;
  projectId: string;
  isin: string;
  side: PositionSide;
  size: number;
  entryPrice: number;
  date: string;
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  volatility: number;
  drift: number;
  horizonDays: number;
  steps: number;
  createdAt: string;
}

export interface Analytics {
  id: string;
  projectId: string;
  expectedReturn: number;
  variance: number;
  var95: number;
  bestRatioSet?: {
    putCount: number;
    callCount: number;
    ratio: number;
  };
  timeValueCurve: Array<{ day: number; value: number }>;
}

export interface Investment {
  id: string;
  ownerUid: string;
  isin: string;
  name: string;
  shares: number;
  buyInPrice: number;
  currentPrice: number;
  expectedPrice?: number;
  currency: string;
  updatedAt: string;
}

export interface CryptoPosition {
  id: string;
  ownerUid: string;
  symbol: string;
  name: string;
  shares: number;
  buyInPrice: number;
  currentPrice: number;
  expectedPrice?: number;
  currency: string;
  updatedAt: string;
}

export interface IsinLookupRequest {
  isin: string;
}

export interface IsinLookupResponse extends Instrument {}

export interface PriceIsinRequest {
  isin: string;
}

export interface PriceIsinResponse {
  isin: string;
  name: string;
  price: number;
  currency: string;
  asOf: string;
}

export interface PriceCryptoRequest {
  symbol: string;
}

export interface PriceCryptoResponse {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  asOf: string;
}

export interface SimulateRequest {
  projectId: string;
  positions: Array<{ isin: string; size: number; entryPrice: number }>;
  scenario: {
    volatility: number;
    drift: number;
    horizonDays: number;
    steps: number;
  };
}

export interface SimulateResponse {
  expectedReturn: number;
  variance: number;
  var95: number;
  timeValueCurve: Array<{ day: number; value: number }>;
  outcomes: Array<{ pnl: number }>;
}

export interface OptimizeRequest {
  projectId: string;
  objective: 'max_return' | 'min_risk' | 'best_ratio';
  constraints: { maxLoss?: number; minReturn?: number };
  searchSpace: { putMin: number; putMax: number; callMin: number; callMax: number };
}

export interface OptimizeResponse {
  bestRatio: { putCount: number; callCount: number; ratio: number };
  expectedReturn: number;
  variance: number;
  var95: number;
}
