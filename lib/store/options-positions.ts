import "server-only";

import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";

export type StandaloneOptionsPosition = {
  id: string;
  ownerId: string;
  projectId?: string | null;
  name?: string;
  isin: string;
  side: "put" | "call";
  size: number;
  entryPrice: number;
  pricingMode: "market" | "model";
  marketPrice?: number;
  computed?: { fairValue: number };
  createdAt: string;
  updatedAt: string;
};

function optionsPositionKey(positionId: string) {
  return `options_position:${positionId}`;
}

function userOptionsPositionsKey(userId: string) {
  return `user:${userId}:options_positions`;
}

export async function listStandaloneOptionsPositions(userId: string, limit = 200) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(userOptionsPositionsKey(userId), 0, limit - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  const positions = await Promise.all(
    ids.map((id) => redis.get<StandaloneOptionsPosition>(optionsPositionKey(id)))
  );

  return positions.filter(
    (position): position is StandaloneOptionsPosition => Boolean(position)
  );
}

export async function createStandaloneOptionsPosition(
  userId: string,
  input: {
    name?: string;
    isin: string;
    side: "put" | "call";
    size: number;
    entryPrice: number;
    pricingMode: "market" | "model";
    marketPrice?: number;
  }
) {
  const redis = getRedis();
  const now = new Date().toISOString();
  const positionId = randomUUID();

  const position: StandaloneOptionsPosition = {
    id: positionId,
    ownerId: userId,
    projectId: null,
    name: input.name,
    isin: input.isin,
    side: input.side,
    size: input.size,
    entryPrice: input.entryPrice,
    pricingMode: input.pricingMode,
    marketPrice: input.marketPrice,
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(optionsPositionKey(positionId), position);
  await redis.zadd(userOptionsPositionsKey(userId), {
    score: Date.parse(now),
    member: positionId,
  });

  return position;
}

export async function updateStandaloneOptionsPosition(
  userId: string,
  positionId: string,
  input: Partial<Omit<StandaloneOptionsPosition, "id" | "ownerId" | "createdAt">>
) {
  const redis = getRedis();
  const existing = await redis.get<StandaloneOptionsPosition>(optionsPositionKey(positionId));
  if (!existing || existing.ownerId !== userId) return null;

  const now = new Date().toISOString();
  const updated: StandaloneOptionsPosition = {
    ...existing,
    ...input,
    id: existing.id,
    ownerId: existing.ownerId,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  await redis.set(optionsPositionKey(positionId), updated);
  await redis.zadd(userOptionsPositionsKey(userId), {
    score: Date.parse(updated.updatedAt),
    member: positionId,
  });

  return updated;
}
