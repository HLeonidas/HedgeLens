import "server-only";

import { neon } from "@neondatabase/serverless";

const globalForDb = globalThis as typeof globalThis & {
  sql?: ReturnType<typeof neon>;
};

export function getDb() {
  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL or DATABASE_URL.");
  }

  if (!globalForDb.sql) {
    globalForDb.sql = neon(connectionString);
  }

  return globalForDb.sql;
}
