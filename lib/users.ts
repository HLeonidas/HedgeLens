import "server-only";

import { randomUUID } from "crypto";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  provider_account_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

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

  const sql = getDb();
  const now = new Date();
  const id = randomUUID();

  const [user] = (await sql`
    insert into users (
      id,
      email,
      name,
      image,
      provider,
      provider_account_id,
      active,
      created_at,
      updated_at
    )
    values (
      ${id},
      ${input.email},
      ${input.name ?? null},
      ${input.image ?? null},
      ${input.provider ?? null},
      ${input.providerAccountId ?? null},
      true,
      ${now},
      ${now}
    )
    on conflict (email) do update set
      name = excluded.name,
      image = excluded.image,
      provider = excluded.provider,
      provider_account_id = excluded.provider_account_id,
      updated_at = excluded.updated_at
    returning
      id,
      email,
      name,
      image,
      provider,
      provider_account_id,
      active,
      created_at,
      updated_at
  `) as DbUser[];

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

  const sql = getDb();
  let [user] = (await sql`
      select
        id,
        email,
        name,
        image,
        provider,
        provider_account_id,
        active,
        created_at,
        updated_at
      from users
      where id = ${userId ?? ""}
    `) as DbUser[];

  if (!user && email) {
    [user] = (await sql`
      select
        id,
        email,
        name,
        image,
        provider,
        provider_account_id,
        active,
        created_at,
        updated_at
      from users
      where email = ${email}
    `) as DbUser[];
  }

  if (!user) {
    return { status: "missing" };
  }

  if (!user.active) {
    return { status: "inactive", user };
  }

  return { status: "ok", user };
}
