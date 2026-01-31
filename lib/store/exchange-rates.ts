import "server-only";

import { getRedis } from "@/lib/redis";

export type ExchangeRate = {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
  source: "alpha_vantage" | "manual";
};

const MAX_AGE_MS = 48 * 60 * 60 * 1000;

function rateKey(from: string, to: string) {
  return `fx:${from.toUpperCase()}:${to.toUpperCase()}`;
}

export async function getExchangeRate(from: string, to: string) {
  const redis = getRedis();
  return redis.get<ExchangeRate>(rateKey(from, to));
}

export async function setExchangeRate(
  from: string,
  to: string,
  rate: number,
  source: ExchangeRate["source"],
  fetchedAt = new Date().toISOString()
) {
  const redis = getRedis();
  const payload: ExchangeRate = {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    rate,
    fetchedAt,
    source,
  };
  await redis.set(rateKey(from, to), payload);
  return payload;
}

export function isRateFresh(rate: ExchangeRate | null) {
  if (!rate?.fetchedAt) return false;
  const ts = Date.parse(rate.fetchedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= MAX_AGE_MS;
}
