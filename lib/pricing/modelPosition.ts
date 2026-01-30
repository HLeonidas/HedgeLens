import { priceEuropeanCallPut } from "@/lib/pricing/blackScholes";
import { greeks } from "@/lib/pricing/greeks";
import { generateTimeValueCurve } from "@/lib/pricing/timeValueCurve";
import { yearFraction } from "@/lib/pricing/utils";

type ModelPricingInput = {
  S: number;
  K: number;
  expiry: string;
  r: number;
  q?: number;
  sigma: number;
  type: "call" | "put";
  now?: Date;
};

type ComputedOutput = {
  fairValue: number;
  intrinsicValue: number;
  timeValue: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  asOf: string;
};

function round(value: number, decimals = 6) {
  return Number(value.toFixed(decimals));
}

export function computeModelPricing(input: ModelPricingInput) {
  const now = input.now ?? new Date();
  const T = yearFraction(now, input.expiry);

  const fairValue = priceEuropeanCallPut({
    S: input.S,
    K: input.K,
    T,
    r: input.r,
    q: input.q,
    sigma: input.sigma,
    type: input.type,
  });

  const intrinsicValue = Math.max(
    input.type === "call" ? input.S - input.K : input.K - input.S,
    0
  );
  const timeValue = Math.max(0, fairValue - intrinsicValue);

  const { delta, gamma, theta, vega } = greeks({
    S: input.S,
    K: input.K,
    T,
    r: input.r,
    q: input.q,
    sigma: input.sigma,
    type: input.type,
  });

  const computed: ComputedOutput = {
    fairValue: round(fairValue),
    intrinsicValue: round(intrinsicValue),
    timeValue: round(timeValue),
    delta: round(delta),
    gamma: round(gamma),
    theta: round(theta),
    vega: round(vega),
    asOf: now.toISOString(),
  };

  const timeValueCurve = generateTimeValueCurve({
    S: input.S,
    K: input.K,
    r: input.r,
    q: input.q,
    sigma: input.sigma,
    type: input.type,
    expiry: input.expiry,
    now,
  });

  return { computed, timeValueCurve };
}
