import "server-only";

import { getOrFetchExchangeRate } from "@/lib/exchange-rate";
import { listPositions, listProjects, Position, Project } from "@/lib/store/projects";
import {
  AggregatedDashboard,
  MODEL_REFRESH_HOURS,
  ProjectHighlight,
  STALE_PRICE_DAYS,
} from "@/types/dashboard";

type RatioSummary = {
  totalPuts: number;
  totalCalls: number;
  ratio: number | null;
};

type ValueSummary = {
  totalMarketValue: number;
  totalIntrinsicValue: number;
  totalTimeValue: number;
};

type ProjectDetail = {
  project: Project;
  positions: Position[];
  ratioSummary: RatioSummary;
  valueSummary: ValueSummary;
};

export async function getDashboardData(userId: string, preferredCurrencyRaw: string) {
  const preferredCurrency = normalizeCurrency(preferredCurrencyRaw) || "EUR";
  const projects = await listProjects(userId, 50);
  if (projects.length === 0) {
    return {
      aggregated: emptyAggregates(),
      preferredCurrency,
      generatedAt: new Date().toISOString(),
    };
  }

  const details = await Promise.all(
    projects.map(async (project) => {
      const positions = await listPositions(project.id);
      return {
        project,
        positions,
        ratioSummary: computeRatioSummary(positions),
        valueSummary: computeValueSummary(positions),
      };
    })
  );

  const { aggregated, warnings } = await computeAggregates(details, preferredCurrency);

  return {
    aggregated,
    preferredCurrency,
    generatedAt: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function emptyAggregates(): AggregatedDashboard {
  return {
    totals: { projects: 0, positions: 0, marketValue: 0, intrinsicValue: 0, timeValue: 0 },
    ratio: { puts: 0, calls: 0, value: null },
    exposuresByCurrency: [],
    stalePriceProjects: [],
    missingPositionsProjects: [],
    ratioAlerts: [],
    depressedRatioAlerts: [],
    modelRefreshQueue: [],
    trendSeries: [],
    highlights: [],
    recentActivity: [],
  };
}

function computeRatioSummary(positions: Position[]): RatioSummary {
  const totalPuts = positions
    .filter((position) => position.side === "put")
    .reduce((sum, position) => sum + position.size, 0);
  const totalCalls = positions
    .filter((position) => position.side === "call")
    .reduce((sum, position) => sum + position.size, 0);
  const ratio = totalCalls > 0 ? totalPuts / totalCalls : null;

  return { totalPuts, totalCalls, ratio };
}

function computeValueSummary(positions: Position[]): ValueSummary {
  return positions.reduce(
    (acc, position) => {
      const multiplier = position.size * (position.ratio ?? 1);

      if (position.pricingMode === "model" && position.computed) {
        acc.totalMarketValue += position.computed.fairValue * multiplier;
        acc.totalIntrinsicValue += position.computed.intrinsicValue * multiplier;
        acc.totalTimeValue += position.computed.timeValue * multiplier;
      } else if (position.marketPrice !== undefined) {
        acc.totalMarketValue += position.marketPrice * multiplier;
      }

      return acc;
    },
    { totalMarketValue: 0, totalIntrinsicValue: 0, totalTimeValue: 0 }
  );
}

async function computeAggregates(details: ProjectDetail[], preferredCurrency: string) {
  const warnings: string[] = [];
  const result: AggregatedDashboard = {
    totals: { projects: details.length, positions: 0, marketValue: 0, intrinsicValue: 0, timeValue: 0 },
    ratio: { puts: 0, calls: 0, value: null },
    exposuresByCurrency: [],
    stalePriceProjects: [],
    missingPositionsProjects: [],
    ratioAlerts: [],
    depressedRatioAlerts: [],
    modelRefreshQueue: [],
    trendSeries: [],
    highlights: [],
    recentActivity: [],
  };

  if (!details.length) return { aggregated: result, warnings };

  const exposures = new Map<string, number>();
  const trend = new Map<number, number>();
  const fxRates = await loadFxRates(details, preferredCurrency, warnings);

  const stalePriceMs = STALE_PRICE_DAYS * 24 * 60 * 60 * 1000;
  const modelRefreshMs = MODEL_REFRESH_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  let totalPositions = 0;
  let totalMarketValue = 0;
  let totalIntrinsicValue = 0;
  let totalTimeValue = 0;
  let totalPuts = 0;
  let totalCalls = 0;

  for (const detail of details) {
    const ratioSummary = detail.ratioSummary ?? { totalPuts: 0, totalCalls: 0, ratio: null };
    totalPuts += ratioSummary.totalPuts;
    totalCalls += ratioSummary.totalCalls;

    totalPositions += detail.positions.length;

    if (ratioSummary.ratio !== null) {
      if (ratioSummary.ratio >= 1.2) {
        result.ratioAlerts.push({
          id: detail.project.id,
          name: detail.project.name,
          ratio: ratioSummary.ratio,
        });
      } else if (ratioSummary.ratio <= 0.8) {
        result.depressedRatioAlerts.push({
          id: detail.project.id,
          name: detail.project.name,
          ratio: ratioSummary.ratio,
        });
      }
    }

    if (!detail.positions.length) {
      result.missingPositionsProjects.push({
        id: detail.project.id,
        name: detail.project.name,
      });
    }

    const priceStamp = detail.project.underlyingLastPriceUpdatedAt
      ? Date.parse(detail.project.underlyingLastPriceUpdatedAt)
      : NaN;
    if (!Number.isFinite(priceStamp) || now - priceStamp > stalePriceMs) {
      const ageDays = Number.isFinite(priceStamp)
        ? Math.round((now - priceStamp) / (24 * 60 * 60 * 1000))
        : null;
      result.stalePriceProjects.push({
        id: detail.project.id,
        name: detail.project.name,
        ageDays,
      });
    }

    for (const position of detail.positions) {
      const exposureValue = resolvePositionValue(position);
      if (exposureValue !== null) {
        const currency = resolvePositionCurrency(detail, position);
        exposures.set(currency, (exposures.get(currency) ?? 0) + exposureValue);

        const converted = convertValue(exposureValue, currency, preferredCurrency, fxRates);
        if (converted !== null) {
          totalMarketValue += converted;
        } else if (currency !== preferredCurrency) {
          warnings.push(`FX rate missing for ${currency}/${preferredCurrency}.`);
        }
      }

      if (position.pricingMode === "model" && position.computed) {
        const currency = resolvePositionCurrency(detail, position);
        const fx = convertValue(1, currency, preferredCurrency, fxRates);
        if (fx === null && currency !== preferredCurrency) {
          warnings.push(`FX rate missing for ${currency}/${preferredCurrency}.`);
          continue;
        }
        const multiplier = position.size * (position.ratio ?? 1) * (fx ?? 1);
        totalIntrinsicValue += position.computed.intrinsicValue * multiplier;
        totalTimeValue += position.computed.timeValue * multiplier;
      }

      if (position.pricingMode === "model") {
        const stamp = position.computed?.asOf ? Date.parse(position.computed.asOf) : NaN;
        if (!Number.isFinite(stamp) || now - stamp > modelRefreshMs) {
          const ageHours = Number.isFinite(stamp) ? Math.round((now - stamp) / (60 * 60 * 1000)) : null;
          result.modelRefreshQueue.push({
            projectName: detail.project.name,
            position: position.name ?? position.isin,
            ageHours,
          });
        }
      }

      if (position.timeValueCurve?.length) {
        const multiplier = position.size * (position.ratio ?? 1);
        const currency = resolvePositionCurrency(detail, position);
        const fx = convertValue(1, currency, preferredCurrency, fxRates);
        if (fx === null && currency !== preferredCurrency) {
          warnings.push(`FX rate missing for ${currency}/${preferredCurrency}.`);
          continue;
        }
        const fxMultiplier = fx ?? 1;
        for (const point of position.timeValueCurve) {
          trend.set(
            point.day,
            (trend.get(point.day) ?? 0) + point.value * multiplier * fxMultiplier
          );
        }
      }
    }

    result.highlights.push(toProjectHighlight(detail, preferredCurrency, fxRates, warnings));
  }

  result.totals = {
    projects: details.length,
    positions: totalPositions,
    marketValue: totalMarketValue,
    intrinsicValue: totalIntrinsicValue,
    timeValue: totalTimeValue,
  };

  result.ratio = {
    puts: totalPuts,
    calls: totalCalls,
    value: totalCalls > 0 ? totalPuts / totalCalls : null,
  };

  result.exposuresByCurrency = Array.from(exposures.entries())
    .map(([currency, value]) => ({ currency, value }))
    .sort((a, b) => b.value - a.value);

  result.trendSeries = Array.from(trend.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, value]) => [day, Number(value.toFixed(2))]);

  result.highlights.sort((a, b) => b.marketValue - a.marketValue);
  result.recentActivity = [...result.highlights]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 10);

  return { aggregated: result, warnings: dedupeWarnings(warnings) };
}

function toProjectHighlight(
  detail: ProjectDetail,
  preferredCurrency: string,
  fxRates: Map<string, number>,
  warnings: string[]
): ProjectHighlight {
  const marketValue = computeProjectMarketValue(
    detail,
    preferredCurrency,
    fxRates,
    warnings
  );
  const logoUrl = getMassiveIcon(detail.project.massiveTickerInfo?.payload ?? null);

  return {
    id: detail.project.id,
    name: detail.project.name,
    positions: detail.positions.length,
    ratio: detail.ratioSummary.ratio ?? null,
    marketValue,
    riskProfile: detail.project.riskProfile,
    baseCurrency: preferredCurrency,
    color: detail.project.color ?? null,
    underlyingSymbol: detail.project.underlyingSymbol ?? null,
    lastPrice: detail.project.underlyingLastPrice ?? null,
    lastPriceCurrency:
      detail.project.underlyingLastPriceCurrency ??
      detail.project.tickerInfo?.overview?.Currency ??
      detail.project.baseCurrency ??
      null,
    logoUrl,
    updatedAt: detail.project.updatedAt,
  };
}

function resolvePositionValue(position: Position): number | null {
  const ratio = position.ratio ?? 1;

  const unit =
    position.computed?.fairValue ??
    position.marketPrice ??
    position.entryPrice ??
    null;

  if (unit == null || !Number.isFinite(unit)) return null;

  const value = position.size * unit * (position.side === "spot" ? 1 : ratio);
  if (!Number.isFinite(value)) return null;
  return value;
}

function resolvePositionCurrency(detail: ProjectDetail, position: Position): string {
  const entryCurrency = (position.currency ?? detail.project.baseCurrency ?? "EUR").toUpperCase();
  if (position.side !== "spot") return entryCurrency;
  const spotCurrency =
    detail.project.underlyingLastPriceCurrency ??
    detail.project.tickerInfo?.overview?.Currency ??
    detail.project.baseCurrency ??
    entryCurrency;
  return (spotCurrency ?? entryCurrency).toUpperCase();
}

function getMassiveIcon(payload?: Record<string, unknown> | null) {
  if (!payload) return null;
  const results =
    (payload as Record<string, unknown>).results &&
    typeof (payload as Record<string, unknown>).results === "object"
      ? ((payload as Record<string, unknown>).results as Record<string, unknown>)
      : payload;
  const branding = (results as { branding?: Record<string, unknown> }).branding;
  const iconUrl = branding?.icon_url || branding?.logo_url;
  if (typeof iconUrl === "string" && iconUrl.trim()) return iconUrl;
  if (typeof (results as any).icon_url === "string") return (results as any).icon_url;
  if (typeof (results as any).logo_url === "string") return (results as any).logo_url;
  return null;
}

function computeProjectMarketValue(
  detail: ProjectDetail,
  preferredCurrency: string,
  fxRates: Map<string, number>,
  warnings: string[]
) {
  let total = 0;
  for (const position of detail.positions) {
    const exposureValue = resolvePositionValue(position);
    if (exposureValue === null) continue;
    const currency = resolvePositionCurrency(detail, position);
    const converted = convertValue(exposureValue, currency, preferredCurrency, fxRates);
    if (converted === null) {
      if (currency !== preferredCurrency) {
        warnings.push(`FX rate missing for ${currency}/${preferredCurrency}.`);
      }
      continue;
    }
    total += converted;
  }
  return total;
}

function normalizeCurrency(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

function convertValue(
  value: number,
  from: string,
  to: string,
  fxRates: Map<string, number>
) {
  if (from === to) return value;
  const key = `${from}:${to}`;
  const rate = fxRates.get(key);
  if (!rate) return null;
  return value * rate;
}

function dedupeWarnings(warnings: string[]) {
  return Array.from(new Set(warnings));
}

async function loadFxRates(
  details: ProjectDetail[],
  preferredCurrency: string,
  warnings: string[]
) {
  const currencies = new Set<string>();
  for (const detail of details) {
    for (const position of detail.positions) {
      currencies.add(resolvePositionCurrency(detail, position));
    }
  }

  const rates = new Map<string, number>();
  await Promise.all(
    Array.from(currencies).map(async (currency) => {
      if (currency === preferredCurrency) {
        rates.set(`${currency}:${preferredCurrency}`, 1);
        return;
      }

      const direct = await getOrFetchExchangeRate(currency, preferredCurrency);
      if ("rate" in direct) {
        rates.set(`${currency}:${preferredCurrency}`, direct.rate.rate);
        return;
      }

      const inverse = await getOrFetchExchangeRate(preferredCurrency, currency);
      if ("rate" in inverse && inverse.rate.rate > 0) {
        rates.set(`${currency}:${preferredCurrency}`, 1 / inverse.rate.rate);
        return;
      }

      warnings.push(`FX rate missing for ${currency}/${preferredCurrency}.`);
    })
  );

  return rates;
}
