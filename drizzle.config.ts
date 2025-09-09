import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Prefer DIRECT_URL if available; falls back to DATABASE_URL.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
  // Note: current drizzle-kit version here does not support specifying schemas.
  // It will pull from the default ('public'). We model auth.users in db/schema.ts.
});
