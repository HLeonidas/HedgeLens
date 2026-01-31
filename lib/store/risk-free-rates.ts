import "server-only";

import { getRedis } from "@/lib/redis";

export type RiskFreeRate = {
  region: "US" | "EU";
  rate: number;
  fetchedAt: string;
  source: "manual";
};

function rateKey(region: RiskFreeRate["region"]) {
  return `rfr:${region}`;
}

export async function getRiskFreeRate(region: RiskFreeRate["region"]) {
  const redis = getRedis();
  return redis.get<RiskFreeRate>(rateKey(region));
}

export async function setRiskFreeRate(
  region: RiskFreeRate["region"],
  rate: number,
  source: RiskFreeRate["source"],
  fetchedAt = new Date().toISOString()
) {
  const redis = getRedis();
  const payload: RiskFreeRate = {
    region,
    rate,
    fetchedAt,
    source,
  };
  await redis.set(rateKey(region), payload);
  return payload;
}
