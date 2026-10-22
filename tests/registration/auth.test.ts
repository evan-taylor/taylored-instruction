import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

afterEach(() => vi.unstubAllEnvs());

it("only advertises Google sign-in when both credentials are configured", async () => {
  const t = convexTest(schema, modules);
  vi.stubEnv("AUTH_GOOGLE_ID", "");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "");
  expect(await t.query(api.auth.availableProviders, {})).toEqual({
    google: false,
  });
  vi.stubEnv("AUTH_GOOGLE_ID", "test-client");
  expect(await t.query(api.auth.availableProviders, {})).toEqual({
    google: false,
  });
  vi.stubEnv("AUTH_GOOGLE_SECRET", "test-secret");
  expect(await t.query(api.auth.availableProviders, {})).toEqual({
    google: true,
  });
});
