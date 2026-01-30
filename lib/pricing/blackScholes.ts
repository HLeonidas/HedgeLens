import { normalCDF } from "@/lib/pricing/utils";

type BlackScholesInput = {
  S: number;
  K: number;
  T: number;
  r: number;
  q?: number;
  sigma: number;
  type: "call" | "put";
};

export function priceEuropeanCallPut(input: BlackScholesInput) {
  const { S, K, T, r, sigma, type } = input;
  const q = input.q ?? 0;

  if (!Number.isFinite(S) || !Number.isFinite(K) || !Number.isFinite(T)) return 0;
  if (S <= 0 || K <= 0) return 0;

  if (T <= 0 || sigma <= 0) {
    const forward = S * Math.exp(-q * Math.max(T, 0));
    const discountedStrike = K * Math.exp(-r * Math.max(T, 0));
    if (type === "call") {
      return Math.max(forward - discountedStrike, 0);
    }
    return Math.max(discountedStrike - forward, 0);
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  if (type === "call") {
    return S * Math.exp(-q * T) * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  }

  return K * Math.exp(-r * T) * normalCDF(-d2) - S * Math.exp(-q * T) * normalCDF(-d1);
}
