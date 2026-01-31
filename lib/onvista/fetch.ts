import "server-only";

import { createHash } from "crypto";

import { getRedis } from "@/lib/redis";

const originLastFetch = new Map<string, number>();

export type FetchHtmlResult = {
  html: string;
  /** Final URL after redirects (important for /suche redirects). */
  finalUrl: string;
  status: number;
  contentType: string | null;
  fromCache: boolean;
};

export async function fetchHtmlWithCache(
  url: string,
  options?: { cacheSeconds?: number }
): Promise<FetchHtmlResult> {
  const cacheSeconds = options?.cacheSeconds ?? 60 * 60 * 24;
  const redis = getRedis();
  const cacheKey = `onvista:html:${hash(url)}`;

  const cached = await redis.get<string>(cacheKey);
  if (cached) {
    return {
      html: cached,
      finalUrl: url,
      status: 200,
      contentType: "text/html",
      fromCache: true,
    };
  }

  await rateLimit(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "HedgeLens/1.0 (onvista-importer)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.7",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Onvista request failed (${response.status})`);
  }
  const html = await response.text();
  const finalUrl = response.url || url;
  const contentType = response.headers.get("content-type");

  try {
    await redis.set(cacheKey, html, { ex: cacheSeconds });
  } catch {
    // ignore cache failures
  }

  return {
    html,
    finalUrl,
    status: response.status,
    contentType,
    fromCache: false,
  };
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function rateLimit(url: string) {
  const origin = new URL(url).origin;
  const now = Date.now();
  const last = originLastFetch.get(origin) ?? 0;
  const elapsed = now - last;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
  originLastFetch.set(origin, Date.now());
}
