import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Use the Supabase Postgres connection string.
// Prefer pooled connection (DATABASE_URL/POSTGRES_URL/POSTGRES_PRISMA_URL) at runtime,
// and fall back to DIRECT_URL for non-pooled/direct connections (e.g., migrations).
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DIRECT_URL ||
  "";

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
