import "server-only";

import { getRedis } from "@/lib/redis";
import type { OnvistaImportData } from "@/lib/onvista/types";

function importKey(id: string) {
  return `onvista:import:${id}`;
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
