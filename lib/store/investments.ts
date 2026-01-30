import "server-only";

import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";

export type InvestmentStatus = "open" | "sold";

export type Investment = {
  id: string;
  ownerId: string;
  isin: string;
  name: string;
  shares: number;
  buyInPrice: number;
  currentPrice: number;
  expectedPrice?: number;
  currency: string;
  status?: InvestmentStatus;
  soldPrice?: number;
  soldAt?: string;
  createdAt: string;
  updatedAt: string;
};

function investmentKey(investmentId: string) {
  return `investment:${investmentId}`;
}

function userInvestmentsKey(userId: string) {
  return `user:${userId}:investments`;
}

export async function listInvestments(userId: string, limit = 200) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(userInvestmentsKey(userId), 0, limit - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  const investments = await Promise.all(
    ids.map((id) => redis.get<Investment>(investmentKey(id)))
  );

  return investments.filter((investment): investment is Investment => Boolean(investment));
}

export async function createInvestment(
  userId: string,
  input: {
    name: string;
    isin: string;
    shares: number;
    buyInPrice: number;
    currentPrice: number;
    expectedPrice?: number;
    currency: string;
  }
) {
  const redis = getRedis();
  const now = new Date().toISOString();
  const investmentId = randomUUID();

  const investment: Investment = {
    id: investmentId,
    ownerId: userId,
    name: input.name,
    isin: input.isin,
    shares: input.shares,
    buyInPrice: input.buyInPrice,
    currentPrice: input.currentPrice,
    expectedPrice: input.expectedPrice,
    currency: input.currency,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(investmentKey(investmentId), investment);
  await redis.zadd(userInvestmentsKey(userId), {
    score: Date.parse(now),
    member: investmentId,
  });

  return investment;
}

export async function getInvestment(userId: string, investmentId: string) {
  const redis = getRedis();
  const investment = await redis.get<Investment>(investmentKey(investmentId));
  if (!investment) return null;
  if (investment.ownerId !== userId) return null;
  return investment;
}

export async function updateInvestment(
  userId: string,
  investmentId: string,
  input: Partial<Omit<Investment, "id" | "ownerId" | "createdAt">>
) {
  const redis = getRedis();
  const investment = await redis.get<Investment>(investmentKey(investmentId));
  if (!investment || investment.ownerId !== userId) return null;

  const now = new Date().toISOString();
  const updated: Investment = {
    ...investment,
    ...input,
    id: investment.id,
    ownerId: investment.ownerId,
    createdAt: investment.createdAt,
    updatedAt: now,
  };

  await redis.set(investmentKey(investmentId), updated);
  await redis.zadd(userInvestmentsKey(userId), {
    score: Date.parse(updated.updatedAt),
    member: investmentId,
  });

  return updated;
}
