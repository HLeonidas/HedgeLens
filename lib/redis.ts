import "server-only";

import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: Redis;
};

export function getRedis() {
  if (!globalForRedis.redis) {
    globalForRedis.redis = Redis.fromEnv();
  }

  return globalForRedis.redis;
}
