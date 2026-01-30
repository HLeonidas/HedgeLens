import { normalCDF, normalPDF } from "@/lib/pricing/utils";

type GreeksInput = {
  S: number;
  K: number;
  T: number;
  r: number;
  q?: number;
  sigma: number;
  type: "call" | "put";
};

export function greeks(input: GreeksInput) {
  const { S, K, T, r, sigma, type } = input;
  const q = input.q ?? 0;

  if (!Number.isFinite(S) || !Number.isFinite(K) || !Number.isFinite(T)) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  }

  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const pdf = normalPDF(d1);
  const discountQ = Math.exp(-q * T);
  const discountR = Math.exp(-r * T);

  const delta =
    type === "call"
      ? discountQ * normalCDF(d1)
      : discountQ * (normalCDF(d1) - 1);

  const gamma = (discountQ * pdf) / (S * sigma * sqrtT);

  const vega = S * discountQ * pdf * sqrtT;

  const thetaBase = (-S * discountQ * pdf * sigma) / (2 * sqrtT);
  const theta =
    type === "call"
      ? thetaBase - r * K * discountR * normalCDF(d2) + q * S * discountQ * normalCDF(d1)
      : thetaBase + r * K * discountR * normalCDF(-d2) - q * S * discountQ * normalCDF(-d1);

  return { delta, gamma, theta, vega };
}
