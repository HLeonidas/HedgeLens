import { z } from "zod";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { priceEuropeanCallPut } from "@/lib/pricing/blackScholes";
import { greeks } from "@/lib/pricing/greeks";
import { yearFraction } from "@/lib/pricing/utils";
import { getPositionByIdForUser } from "@/lib/store/projects";

export const runtime = "nodejs";

type ScenarioResult = {
  fairValue: number | null;
  intrinsicValue: number | null;
  timeValue: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  impliedVolatilityUsed: number | null;
  breakEven: number | null;
  premium: number | null;
  omega: number | null;
  absChange: number | null;
  relChange: number | null;
  currency: string;
  valuationDate: string | null;
};

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
};

const scenarioSchema = z.object({
  underlyingPrice: z.preprocess(toNumber, z.number().finite().gt(0)).optional(),
  rate: z.preprocess(toNumber, z.number().finite()).optional(),
  volatility: z.preprocess(toNumber, z.number().finite().gt(0)).optional(),
  dividendYield: z.preprocess(toNumber, z.number().finite().min(0)).optional(),
  fxRate: z.preprocess(toNumber, z.number().finite().gt(0)).optional(),
  valuationDate: z.string().optional(),
});

const instrumentSchema = z.object({
  isin: z.string().min(1),
  side: z.enum(["call", "put"]),
  strike: z.preprocess(toNumber, z.number().finite().gt(0)),
  expiry: z.string(),
  ratio: z.preprocess(toNumber, z.number().finite().gt(0)).optional(),
  dividendYield: z.preprocess(toNumber, z.number().finite().min(0)).optional(),
  currency: z.string().optional(),
  price: z.preprocess(toNumber, z.number().finite().min(0)).optional(),
});

const requestSchema = z.object({
  positionId: z.string().min(1).optional(),
  instrument: instrumentSchema.optional(),
  scenarios: z.array(scenarioSchema).min(1).max(5),
  referencePriceOverride: z.preprocess(toNumber, z.number().finite().min(0)).optional(),
});

function computeIntrinsicValue(type: "call" | "put", S: number, K: number) {
  return Math.max(type === "call" ? S - K : K - S, 0);
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const { positionId, scenarios, referencePriceOverride, instrument } = parsed.data;
  const positionResult = positionId
    ? await getPositionByIdForUser(guard.user.id, positionId)
    : null;

  if (!positionResult && !instrument) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  const position = positionResult?.position ?? null;
  const project = positionResult?.project ?? null;
  const ratio = position?.ratio ?? instrument?.ratio ?? 1;
  const defaultDividendYield = position?.dividendYield ?? instrument?.dividendYield ?? 0;
  const referencePrice =
    referencePriceOverride ??
    position?.marketPrice ??
    position?.computed?.fairValue ??
    instrument?.price ??
    null;
  const strike = position?.strike ?? instrument?.strike ?? null;
  const expiry = position?.expiry ?? instrument?.expiry ?? null;
  const side = position?.side ?? instrument?.side ?? "call";
  if (side === "spot") {
    return NextResponse.json(
      { error: "Spot positions are not supported in this calculator" },
      { status: 400 }
    );
  }
  const optionSide = side;
  const currency = project?.baseCurrency ?? instrument?.currency ?? "EUR";

  const outputs: ScenarioResult[] = scenarios.map((scenario) => {
    const valuationDate = scenario.valuationDate ?? null;
    const valuation = valuationDate ? new Date(valuationDate) : null;

    if (
      !scenario.underlyingPrice ||
      scenario.rate === undefined ||
      scenario.volatility === undefined ||
      !valuationDate ||
      !strike ||
      !expiry
    ) {
      return {
        fairValue: null,
        intrinsicValue: null,
        timeValue: null,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        impliedVolatilityUsed: null,
        breakEven: null,
        premium: null,
        omega: null,
        absChange: null,
        relChange: null,
        currency,
        valuationDate,
      };
    }

    const expiryDate = new Date(expiry);
    const T = valuation ? yearFraction(valuation, expiryDate) : 0;
    const dividendYield = scenario.dividendYield ?? defaultDividendYield;
    const intrinsic = computeIntrinsicValue(optionSide, scenario.underlyingPrice, strike);

    const rawPrice =
      T <= 0
        ? intrinsic
        : priceEuropeanCallPut({
            S: scenario.underlyingPrice,
            K: strike,
            T,
            r: scenario.rate,
            q: dividendYield,
            sigma: scenario.volatility,
            type: optionSide,
          });

    const withRatio = rawPrice * ratio;
    const fxRate = scenario.fxRate ?? 1;
    const fairValue = Number((withRatio * fxRate).toFixed(6));
    const intrinsicValue = Number((intrinsic * ratio * fxRate).toFixed(6));
    const timeValue = Number(Math.max(0, fairValue - intrinsicValue).toFixed(6));

    const greeksOutput =
      T <= 0
        ? { delta: 0, gamma: 0, theta: 0, vega: 0 }
        : greeks({
            S: scenario.underlyingPrice,
            K: strike,
            T,
            r: scenario.rate,
            q: dividendYield,
            sigma: scenario.volatility,
            type: optionSide,
          });

    const breakEven =
      optionSide === "call" ? strike + rawPrice / ratio : strike - rawPrice / ratio;
    const premium = scenario.underlyingPrice
      ? (breakEven - scenario.underlyingPrice) / scenario.underlyingPrice
      : null;
    const omega =
      fairValue > 0 ? (greeksOutput.delta * scenario.underlyingPrice) / fairValue : null;

    const absChange = referencePrice !== null ? fairValue - referencePrice : null;
    const relChange =
      referencePrice !== null && referencePrice !== 0
        ? (absChange! / referencePrice) * 100
        : null;

    return {
      fairValue,
      intrinsicValue,
      timeValue,
      delta: Number(greeksOutput.delta.toFixed(6)),
      gamma: Number(greeksOutput.gamma.toFixed(6)),
      theta: Number(greeksOutput.theta.toFixed(6)),
      vega: Number(greeksOutput.vega.toFixed(6)),
      impliedVolatilityUsed: scenario.volatility,
      breakEven: Number(breakEven.toFixed(6)),
      premium: premium !== null ? Number(premium.toFixed(6)) : null,
      omega: omega !== null ? Number(omega.toFixed(6)) : null,
      absChange: absChange !== null ? Number(absChange.toFixed(6)) : null,
      relChange: relChange !== null ? Number(relChange.toFixed(4)) : null,
      currency,
      valuationDate,
    };
  });

  return NextResponse.json({ referencePrice, results: outputs });
}
