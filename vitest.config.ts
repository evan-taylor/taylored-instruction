import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/registration/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
