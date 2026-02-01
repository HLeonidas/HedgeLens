import "server-only";

import { getRedis } from "@/lib/redis";
import type { OnvistaImportData } from "@/lib/onvista/types";

function importKey(id: string) {
  return `onvista:import:${id}`;
}

function importIsinKey(isin: string) {
  return `onvista:import:isin:${isin.toUpperCase()}`;
}

export async function storeOnvistaImport(optionscheinId: string, data: OnvistaImportData) {
  const redis = getRedis();
  await redis.set(importKey(optionscheinId), data);
  return true;
}

export async function getOnvistaImport(optionscheinId: string) {
  const redis = getRedis();
  return redis.get<OnvistaImportData>(importKey(optionscheinId));
}

export async function storeOnvistaImportForIsin(isin: string, data: OnvistaImportData) {
  const redis = getRedis();
  // Cache ISIN imports for 1 day.
  await redis.set(importIsinKey(isin), data, { ex: 60 * 60 * 24 });
  return true;
}

export async function getOnvistaImportForIsin(isin: string) {
  const redis = getRedis();
  return redis.get<OnvistaImportData>(importIsinKey(isin));
}
