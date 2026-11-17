import { afterEach, describe, expect, it, vi } from "vitest";

const getSanityBlogPaths = vi.fn();
const fetchAllRevnuPosts = vi.fn();
const fetchRevnuPost = vi.fn();

vi.mock("@/lib/blogRouting", () => ({ getSanityBlogPaths }));
vi.mock("@/lib/revnu", () => ({ fetchAllRevnuPosts, fetchRevnuPost }));

const { getBlogPathStatus, resetBlogPathIndex } = await import(
  "@/lib/blogPathIndex"
);
const { buildLlmsTxt } = await import("@/lib/llmsTxt");

const revnuSummary = (slug: string, publishedAt: number) => ({
  slug,
  title: `Revnu ${slug}`,
  canonicalPath: `/${slug}`,
  canonicalUrl: `https://tayloredinstruction.com/blog/${slug}`,
  metaDescription: `About ${slug}`,
  heroImageUrl: null,
  publishedAt,
  updatedAt: null,
});

afterEach(() => {
  resetBlogPathIndex();
  vi.resetAllMocks();
});

describe("blog path status", () => {
  it("serves Sanity and Revnu paths and calls everything else missing", async () => {
    getSanityBlogPaths.mockResolvedValue(new Set(["/sanity-post"]));
    fetchAllRevnuPosts.mockResolvedValue([revnuSummary("revnu-post", 1)]);
    fetchRevnuPost.mockResolvedValue(null);

    await expect(getBlogPathStatus("/sanity-post")).resolves.toBe("servable");
    await expect(getBlogPathStatus("/revnu-post")).resolves.toBe("servable");
    await expect(getBlogPathStatus("/no-such-post")).resolves.toBe("missing");
  });

  it("treats a post dropped from the Revnu list as missing after the next refresh", async () => {
    getSanityBlogPaths.mockResolvedValue(new Set());
    fetchAllRevnuPosts.mockResolvedValueOnce([revnuSummary("removed", 1)]);
    fetchAllRevnuPosts.mockResolvedValueOnce([]);
    fetchRevnuPost.mockResolvedValue({
      post: revnuSummary("removed", 1),
    });

    await expect(getBlogPathStatus("/removed", 0)).resolves.toBe("servable");
    await expect(getBlogPathStatus("/removed", 61_000)).resolves.toBe(
      "missing"
    );
  });

  it("keeps an old Revnu slug servable so the page can redirect it", async () => {
    getSanityBlogPaths.mockResolvedValue(new Set());
    fetchAllRevnuPosts.mockResolvedValue([revnuSummary("new-slug", 1)]);
    fetchRevnuPost.mockResolvedValue({ post: revnuSummary("new-slug", 1) });

    await expect(getBlogPathStatus("/old-slug")).resolves.toBe("servable");
  });

  it("does not 404 anything while the post lists are unreachable", async () => {
    getSanityBlogPaths.mockRejectedValue(new Error("Sanity down"));
    fetchAllRevnuPosts.mockResolvedValue([]);

    await expect(getBlogPathStatus("/anything")).resolves.toBe("unknown");
  });
});

describe("llms.txt", () => {
  it("lists every Sanity and Revnu article once, newest first", () => {
    const text = buildLlmsTxt({
      sanityPosts: [
        {
          slug: "shared",
          title: "Sanity shared",
          excerpt: "Sanity\nexcerpt",
          _updatedAt: "2025-01-01T00:00:00Z",
          publishedAt: "2025-01-01T00:00:00Z",
        },
      ],
      revnuPosts: [
        revnuSummary("shared", Date.UTC(2026, 0, 1)),
        revnuSummary("fresh", Date.UTC(2026, 0, 2)),
      ],
    });

    const articles = text.split("## Articles\n\n")[1]?.trim().split("\n");
    expect(text.startsWith("# Taylored Instruction\n")).toBe(true);
    expect(articles).toEqual([
      "- [Revnu fresh](https://tayloredinstruction.com/blog/fresh): About fresh",
      "- [Sanity shared](https://tayloredinstruction.com/blog/shared): Sanity excerpt",
    ]);
  });
});
