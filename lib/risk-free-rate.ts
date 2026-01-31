import { RiskFreeRate, getRiskFreeRate } from "@/lib/store/risk-free-rates";

export type RiskFreeRateResult = { rate: RiskFreeRate } | { error: string };

export async function getRiskFreeRateOrError(
  region: RiskFreeRate["region"]
): Promise<RiskFreeRateResult> {
  const existing = await getRiskFreeRate(region);
  if (!existing) {
    return { error: "Risk free rate not set" } as const;
  }
  return { rate: existing } as const;
}
