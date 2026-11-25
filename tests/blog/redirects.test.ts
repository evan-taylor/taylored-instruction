import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { blogRedirects } from "@/lib/blogRedirects";

type Redirect = { source: string; destination: string; permanent?: boolean };
type NextConfig = { redirects: () => Promise<Redirect[]> };

const nextConfig = createRequire(import.meta.url)(
  "../../next.config.js"
) as NextConfig;
const slugPathPattern = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entries = Object.entries(blogRedirects);
const sources = new Set(Object.keys(blogRedirects));

describe("blog redirect map", () => {
  it("maps single Revnu slug paths to other slug paths", () => {
    for (const [from, to] of entries) {
      expect(from).toMatch(slugPathPattern);
      expect(to).toMatch(slugPathPattern);
      expect(to).not.toBe(from);
    }
  });

  it("never redirects to a path that is itself redirected", () => {
    const chained = entries.filter(([, to]) => sources.has(to));
    expect(chained).toEqual([]);
  });

  it("resolves every path in one hop without loops", () => {
    const redirects: Record<string, string> = blogRedirects;
    for (const start of sources) {
      const seen = new Set([start]);
      let current = redirects[start];
      while (current && Object.hasOwn(redirects, current)) {
        expect(seen.has(current)).toBe(false);
        seen.add(current);
        current = redirects[current];
      }
      expect(seen.size).toBe(1);
    }
  });
});

describe("next.config blog redirects", () => {
  it("issues one permanent redirect per mapped post", async () => {
    const rules = await nextConfig.redirects();
    const blogRules = rules.filter(({ source }) => source.startsWith("/blog/"));

    expect(blogRules).toEqual(
      entries.map(([from, to]) => ({
        source: `/blog${from}`,
        destination: `/blog${to}`,
        permanent: true,
      }))
    );
    const ruleSources = new Set(rules.map(({ source }) => source));
    for (const { destination } of blogRules) {
      expect(ruleSources.has(destination)).toBe(false);
    }
  });
});
