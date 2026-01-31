import "server-only";

import { randomUUID } from "crypto";

import { auth } from "@/auth";
import { getRedis } from "@/lib/redis";
import type { Redis } from "@upstash/redis";

export type UserRole = "admin" | "enduser";
export type PreferredCurrency = "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "AUD" | "CAD" | "SEK" | "NOK" | "DKK";

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  provider_account_id: string | null;
  active: boolean;
  role: UserRole;
  preferred_currency: PreferredCurrency;
  created_at: string;
  updated_at: string;
};

type StoredUser = DbUser;

export type RequireActiveUserResult =
  | { status: "ok"; user: DbUser }
  | { status: "unauthenticated" }
  | { status: "inactive"; user: DbUser }
  | { status: "missing" };

export async function upsertUserFromOAuth(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: string | null;
  providerAccountId?: string | null;
}) {
  if (!input.email) {
    throw new Error("Missing email from OAuth provider.");
  }

  const redis = getRedis();
  const now = new Date();
  const emailKey = `user_email:${input.email.toLowerCase()}`;
  const existingId = await redis.get<string>(emailKey);
  const id = existingId ?? randomUUID();

  const existingUser = existingId ? await getStoredUser(id, redis) : null;
  const createdAt = existingUser?.created_at ?? now.toISOString();
  const active = existingUser?.active ?? false;
  const role: UserRole = existingUser?.role ?? "enduser";
  const preferredCurrency: PreferredCurrency =
    existingUser?.preferred_currency ?? "EUR";
  const user: StoredUser = {
    id,
    email: input.email,
    name: input.name ?? null,
    image: input.image ?? null,
    provider: input.provider ?? null,
    provider_account_id: input.providerAccountId ?? null,
    active,
    role,
    preferred_currency: preferredCurrency,
    created_at: createdAt,
    updated_at: now.toISOString(),
  };

  await redis.set(`user:${id}`, user);
  await redis.set(emailKey, id);
  await redis.zadd("users:all", { score: new Date(createdAt).getTime(), member: id });

  return user;
}

export async function requireActiveUser(): Promise<RequireActiveUserResult> {
  const session = await auth();
  if (!session?.user) {
    return { status: "unauthenticated" };
  }

  const userId = session.user.id;
  const email = session.user.email ?? null;
  if (!userId && !email) {
    return { status: "missing" };
  }

  const redis = getRedis();
  let user: StoredUser | null = null;
  if (userId) {
    user = await getStoredUser(userId, redis);
  }

  if (!user && email) {
    const mappedId = await redis.get<string>(`user_email:${email.toLowerCase()}`);
    if (mappedId) {
      user = await getStoredUser(mappedId, redis);
    }
  }

  if (!user) {
    return { status: "missing" };
  }

  if (!user.active) {
    return { status: "inactive", user };
  }

  return { status: "ok", user };
}

async function getStoredUser(id: string, redis: Redis) {
  const stored = await redis.get<StoredUser>(`user:${id}`);
  if (!stored) return null;
  let patched = stored;
  if (!patched.role) {
    patched = { ...patched, role: "enduser" };
  }
  if (!patched.preferred_currency) {
    patched = { ...patched, preferred_currency: "EUR" };
  }
  if (patched !== stored) {
    await redis.set(`user:${id}`, patched);
    return patched;
  }
  return stored;
}
