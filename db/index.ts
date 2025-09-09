import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Use the Supabase Postgres connection string.
// Prefer DIRECT_URL if present (no pgbouncer), otherwise DATABASE_URL (often with pgbouncer=true).
const connectionString =
  process.env.DIRECT_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL or DIRECT_URL for Drizzle. Check your .env."
  );
}

// For Supabase, ensure SSL and disable prepared statements when using pgbouncer.
// See: https://orm.drizzle.team/docs/get-started-postgresql#with-postgresjs
const client = postgres(connectionString, {
  ssl: "require",
  prepare: false,
  max: 1,
});

export const db = drizzle(client);

export type DB = typeof db;
