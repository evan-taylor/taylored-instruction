import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Lazy initialization to avoid errors during build time
let _db: PostgresJsDatabase | null = null;

function getConnectionString(): string {
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

  return connectionString;
}

function initializeDb(): PostgresJsDatabase {
  if (_db) {
    return _db;
  }

  const connectionString = getConnectionString();

  // For Supabase, ensure SSL and disable prepared statements when using pgbouncer.
  // See: https://orm.drizzle.team/docs/get-started-postgresql#with-postgresjs
  const client = postgres(connectionString, {
    ssl: "require",
    prepare: false,
    max: 1,
  });

  _db = drizzle(client);
  return _db;
}

// Export a getter that initializes the db lazily
export const db = new Proxy({} as PostgresJsDatabase, {
  get(_target, prop) {
    const database = initializeDb();
    return database[prop as keyof PostgresJsDatabase];
  },
});

export type DB = PostgresJsDatabase;
