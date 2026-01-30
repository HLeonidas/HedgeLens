import "server-only";

import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";

export type CryptoPosition = {
  id: string;
  ownerId: string;
  symbol: string;
  name: string;
  shares: number;
  buyInPrice: number;
  currentPrice: number;
  expectedPrice?: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

function cryptoPositionKey(positionId: string) {
  return `crypto_position:${positionId}`;
}

function userCryptoPositionsKey(userId: string) {
  return `user:${userId}:crypto_positions`;
}

export async function listCryptoPositions(userId: string, limit = 200) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(userCryptoPositionsKey(userId), 0, limit - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  const positions = await Promise.all(
    ids.map((id) => redis.get<CryptoPosition>(cryptoPositionKey(id)))
  );

  return positions.filter((position): position is CryptoPosition => Boolean(position));
}

export async function createCryptoPosition(
  userId: string,
  input: {
    symbol: string;
    name: string;
    shares: number;
    buyInPrice: number;
    currentPrice: number;
    expectedPrice?: number;
    currency: string;
  }
) {
  const redis = getRedis();
  const now = new Date().toISOString();
  const positionId = randomUUID();

  const position: CryptoPosition = {
    id: positionId,
    ownerId: userId,
    symbol: input.symbol,
    name: input.name,
    shares: input.shares,
    buyInPrice: input.buyInPrice,
    currentPrice: input.currentPrice,
    expectedPrice: input.expectedPrice,
    currency: input.currency,
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(cryptoPositionKey(positionId), position);
  await redis.zadd(userCryptoPositionsKey(userId), {
    score: Date.parse(now),
    member: positionId,
  });

  return position;
}

export async function updateCryptoPosition(
  userId: string,
  positionId: string,
  input: Partial<Omit<CryptoPosition, "id" | "ownerId" | "createdAt">>
) {
  const redis = getRedis();
  const existing = await redis.get<CryptoPosition>(cryptoPositionKey(positionId));
  if (!existing || existing.ownerId !== userId) return null;

  const now = new Date().toISOString();
  const updated: CryptoPosition = {
    ...existing,
    ...input,
    id: existing.id,
    ownerId: existing.ownerId,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  await redis.set(cryptoPositionKey(positionId), updated);
  await redis.zadd(userCryptoPositionsKey(userId), {
    score: Date.parse(updated.updatedAt),
    member: positionId,
  });

  return updated;
}
