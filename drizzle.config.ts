import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: (() => {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          "Missing DATABASE_URL environment variable for Drizzle"
        );
      }
      return url;
    })(),
  },
  verbose: true,
  strict: true,
});
