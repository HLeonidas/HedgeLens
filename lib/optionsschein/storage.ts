import "server-only";

import { randomUUID } from "crypto";

import { getRedis } from "@/lib/redis";
import { getProject } from "@/lib/store/projects";
import { optionscheinCreateSchema, optionscheinUpdateSchema } from "@/lib/optionsschein/schema";
import type {
  Optionschein,
  OptionscheinCreateInput,
  OptionscheinUpdateInput,
} from "@/lib/optionsschein/types";

function optionscheinKey(id: string) {
  return `optionschein:${id}`;
}

function userOptionscheinKey(userId: string) {
  return `user:${userId}:optionscheine`;
}

function projectOptionscheinKey(projectId: string) {
  return `project:${projectId}:optionscheine`;
}

function normalizePosition(position?: OptionscheinCreateInput["position"] | null) {
  if (!position) {
    return {
      projectId: null,
      entryPrice: null,
      quantity: null,
    } as const;
  }

  return {
    projectId: position.projectId,
    entryPrice: position.entryPrice,
    quantity: position.quantity,
  } as const;
}

export async function createOptionschein(userId: string, input: OptionscheinCreateInput) {
  const redis = getRedis();
  const parsed = optionscheinCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid optionschein input");
  }

  const position = parsed.data.position ?? null;
  if (position?.projectId) {
    const project = await getProject(userId, position.projectId);
    if (!project) return null;
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const normalized = normalizePosition(position);

  const base = {
    id,
    ownerId: userId,
    instrument: parsed.data.instrument,
    pricingInputs: parsed.data.pricingInputs,
    computedSnapshot: parsed.data.computedSnapshot ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const optionschein: Optionschein = normalized.projectId
    ? {
        ...base,
        projectId: normalized.projectId,
        entryPrice: normalized.entryPrice!,
        quantity: normalized.quantity!,
      }
    : {
        ...base,
        projectId: null,
        entryPrice: null,
        quantity: null,
      };

  await redis.set(optionscheinKey(id), optionschein);
  await redis.zadd(userOptionscheinKey(userId), {
    score: Date.parse(now),
    member: id,
  });

  if (optionschein.projectId) {
    await redis.zadd(projectOptionscheinKey(optionschein.projectId), {
      score: Date.parse(now),
      member: id,
    });
  }

  return optionschein;
}

export async function getOptionschein(userId: string, id: string) {
  const redis = getRedis();
  const stored = await redis.get<Optionschein>(optionscheinKey(id));
  if (!stored || stored.ownerId !== userId) return null;
  return stored;
}

export async function listOptionscheine(userId: string, limit = 200) {
  const redis = getRedis();
  const ids = await redis.zrange<string[]>(userOptionscheinKey(userId), 0, limit - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  const entries = await Promise.all(ids.map((id) => redis.get<Optionschein>(optionscheinKey(id))));
  return entries.filter((entry): entry is Optionschein => Boolean(entry));
}

export async function listProjectOptionscheine(userId: string, projectId: string, limit = 200) {
  const redis = getRedis();
  const project = await getProject(userId, projectId);
  if (!project) return [];

  const ids = await redis.zrange<string[]>(projectOptionscheinKey(projectId), 0, limit - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  const entries = await Promise.all(ids.map((id) => redis.get<Optionschein>(optionscheinKey(id))));
  return entries.filter((entry): entry is Optionschein => Boolean(entry));
}

export async function updateOptionschein(
  userId: string,
  id: string,
  input: OptionscheinUpdateInput
) {
  const redis = getRedis();
  const parsed = optionscheinUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid optionschein update");
  }

  const existing = await redis.get<Optionschein>(optionscheinKey(id));
  if (!existing || existing.ownerId !== userId) return null;

  let nextProjectId = existing.projectId ?? null;
  let nextEntryPrice = existing.entryPrice ?? null;
  let nextQuantity = existing.quantity ?? null;

  if ("position" in parsed.data) {
    const position = parsed.data.position ?? null;
    if (position?.projectId) {
      const project = await getProject(userId, position.projectId);
      if (!project) return null;
    }
    const normalized = normalizePosition(position);
    nextProjectId = normalized.projectId;
    nextEntryPrice = normalized.entryPrice;
    nextQuantity = normalized.quantity;
  }

  const now = new Date().toISOString();
  const updatedBase = {
    ...existing,
    ...parsed.data,
    id: existing.id,
    ownerId: existing.ownerId,
    instrument: parsed.data.instrument ?? existing.instrument,
    pricingInputs: parsed.data.pricingInputs ?? existing.pricingInputs,
    computedSnapshot:
      "computedSnapshot" in parsed.data
        ? parsed.data.computedSnapshot ?? null
        : existing.computedSnapshot ?? null,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const updated: Optionschein =
    nextProjectId
      ? {
          ...updatedBase,
          projectId: nextProjectId,
          entryPrice: nextEntryPrice!,
          quantity: nextQuantity!,
        }
      : {
          ...updatedBase,
          projectId: null,
          entryPrice: null,
          quantity: null,
        };

  await redis.set(optionscheinKey(id), updated);
  await redis.zadd(userOptionscheinKey(userId), {
    score: Date.parse(now),
    member: id,
  });

  if (existing.projectId && existing.projectId !== updated.projectId) {
    await redis.zrem(projectOptionscheinKey(existing.projectId), id);
  }
  if (updated.projectId) {
    await redis.zadd(projectOptionscheinKey(updated.projectId), {
      score: Date.parse(now),
      member: id,
    });
  }

  return updated;
}

export async function deleteOptionschein(userId: string, id: string) {
  const redis = getRedis();
  const existing = await redis.get<Optionschein>(optionscheinKey(id));
  if (!existing || existing.ownerId !== userId) return false;

  await redis.del(optionscheinKey(id));
  await redis.zrem(userOptionscheinKey(userId), id);
  if (existing.projectId) {
    await redis.zrem(projectOptionscheinKey(existing.projectId), id);
  }

  return true;
}
