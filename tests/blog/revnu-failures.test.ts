import { afterEach, describe, expect, it, vi } from "vitest";

const getRevnuPosts = vi.fn();

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(() => ({ courses: [] })),
}));
vi.mock("@/lib/revnu", () => ({
  buildRevnuSitemap: vi.fn(() => []),
  getRevnuPosts,
  REVNU_CACHE_TAG: "revnu",
}));

const { default: blogSitemap } = await import("@/app/(marketing)/blog/sitemap");
const { GET: getRss } = await import("@/app/rss.xml/route");
const { GET: getLlmsTxt } = await import("@/app/llms.txt/route");

afterEach(() => {
  vi.clearAllMocks();
});

describe("Revnu list failures", () => {
  it.each([
    ["blog sitemap", blogSitemap],
    ["RSS feed", getRss],
    ["llms.txt", getLlmsTxt],
  ])("%s throws instead of publishing an empty list", async (_, render) => {
    getRevnuPosts.mockRejectedValue(
      new Error("Revnu post list request failed: 429")
    );

    await expect(render()).rejects.toThrow("429");
  });
});
