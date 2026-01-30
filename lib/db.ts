import "server-only";

import postgres from "postgres";

const globalForDb = globalThis as typeof globalThis & {
  sql?: ReturnType<typeof postgres>;
};

export function getDb() {
  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL or DATABASE_URL.");
  }

  if (!globalForDb.sql) {
    globalForDb.sql = postgres(connectionString, {
      ssl: "require",
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return globalForDb.sql;
}
