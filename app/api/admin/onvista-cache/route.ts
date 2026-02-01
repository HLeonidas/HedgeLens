import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-guard";
import { getRedis } from "@/lib/redis";
import type { OnvistaImportData } from "@/lib/onvista/types";

export const runtime = "nodejs";

type CacheEntry = {
  isin: string;
  scrapedAt: string;
  sourceUrls: string[];
};

export async function GET() {
  const guard = await requireApiUser();
  if ("response" in guard) return guard.response;
  if (guard.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redis = getRedis();
  const match = "onvista:import:isin:*";
  const keys: string[] = [];
  let cursor: number | string = 0;

  while (true) {
    const result = await redis.scan(cursor, { match, count: 200 });
    if (Array.isArray(result)) {
      cursor = result[0] ?? 0;
      keys.push(...(result[1] ?? []));
    } else if (result && typeof result === "object" && "cursor" in result && "keys" in result) {
      cursor = (result as { cursor: number; keys: string[] }).cursor;
      keys.push(...(result as { cursor: number; keys: string[] }).keys);
    } else {
      break;
    }

    if (cursor === 0 || cursor === "0") break;
  }

  if (keys.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const entries = await Promise.all(
    keys.map(async (key) => {
      const data = await redis.get<OnvistaImportData>(key);
      if (!data) return null;
      const isin = key.split(":").pop() ?? "";
      return {
        isin,
        scrapedAt: data.scrapedAt,
        sourceUrls: data.sourceUrls ?? [],
      } satisfies CacheEntry;
    })
  );

  const filtered = entries.filter((entry): entry is CacheEntry => Boolean(entry));
  filtered.sort((a, b) => Date.parse(b.scrapedAt) - Date.parse(a.scrapedAt));

  return NextResponse.json({ entries: filtered });
}
