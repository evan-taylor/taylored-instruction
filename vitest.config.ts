import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: [
      "tests/blog/**/*.test.{ts,tsx}",
      "tests/registration/**/*.test.{ts,tsx}",
      "tests/seo/**/*.test.{ts,tsx}",
    ],
    server: { deps: { inline: ["convex-test"] } },
  },
});
