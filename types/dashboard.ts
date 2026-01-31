export const STALE_PRICE_DAYS = 3;
export const MODEL_REFRESH_HOURS = 24;

export type ProjectHighlight = {
  id: string;
  name: string;
  positions: number;
  ratio: number | null;
  marketValue: number;
  riskProfile: "conservative" | "balanced" | "aggressive" | null;
  baseCurrency: string;
  color?: string | null;
  underlyingSymbol?: string | null;
  lastPrice?: number | null;
  lastPriceCurrency?: string | null;
  logoUrl?: string | null;
  updatedAt: string;
};

export type AggregatedDashboard = {
  totals: {
    projects: number;
    positions: number;
    marketValue: number;
    intrinsicValue: number;
    timeValue: number;
  };
  ratio: { puts: number; calls: number; value: number | null };
  exposuresByCurrency: Array<{ currency: string; value: number }>;
  stalePriceProjects: Array<{ id: string; name: string; ageDays: number | null }>;
  missingPositionsProjects: Array<{ id: string; name: string }>;
  ratioAlerts: Array<{ id: string; name: string; ratio: number }>;
  depressedRatioAlerts: Array<{ id: string; name: string; ratio: number }>;
  modelRefreshQueue: Array<{ projectName: string; position: string; ageHours: number | null }>;
  trendSeries: Array<[number, number]>;
  highlights: ProjectHighlight[];
  recentActivity: ProjectHighlight[];
};

export type DashboardResponse = {
  aggregated: AggregatedDashboard;
  preferredCurrency: string;
  generatedAt: string;
  warnings?: string[];
};
