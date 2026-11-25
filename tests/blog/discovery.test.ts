import { afterEach, describe, expect, it, vi } from "vitest";

const fetchAllRevnuPosts = vi.fn();
const fetchRevnuPost = vi.fn();

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
  it("serves Revnu paths and calls everything else missing", async () => {
    fetchAllRevnuPosts.mockResolvedValue([revnuSummary("revnu-post", 1)]);
    fetchRevnuPost.mockResolvedValue(null);

    await expect(getBlogPathStatus("/revnu-post")).resolves.toBe("servable");
    await expect(getBlogPathStatus("/no-such-post")).resolves.toBe("missing");
  });

  it("treats a post dropped from the Revnu list as missing after the next refresh", async () => {
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
    fetchAllRevnuPosts.mockResolvedValue([revnuSummary("new-slug", 1)]);
    fetchRevnuPost.mockResolvedValue({ post: revnuSummary("new-slug", 1) });

    await expect(getBlogPathStatus("/old-slug")).resolves.toBe("servable");
  });

  it("only trusts stale lists to prove a post exists, and waits before retrying", async () => {
    fetchAllRevnuPosts.mockResolvedValueOnce([revnuSummary("kept", 1)]);
    fetchAllRevnuPosts.mockRejectedValue(new Error("Revnu down"));
    fetchRevnuPost.mockResolvedValue(null);

    await expect(getBlogPathStatus("/kept", 0)).resolves.toBe("servable");
    await expect(getBlogPathStatus("/kept", 61_000)).resolves.toBe("servable");
    await expect(getBlogPathStatus("/new-post", 61_000)).resolves.toBe(
      "unknown"
    );
    await expect(getBlogPathStatus("/new-post", 90_000)).resolves.toBe(
      "unknown"
    );
    expect(fetchAllRevnuPosts).toHaveBeenCalledTimes(2);
  });

  it("stops serving an old slug once its target leaves the list", async () => {
    fetchAllRevnuPosts.mockResolvedValueOnce([revnuSummary("target", 1)]);
    fetchAllRevnuPosts.mockResolvedValue([]);
    fetchRevnuPost.mockResolvedValue({ post: revnuSummary("target", 1) });

    await expect(getBlogPathStatus("/old-slug", 0)).resolves.toBe("servable");
    await expect(getBlogPathStatus("/old-slug", 61_000)).resolves.toBe(
      "missing"
    );
  });

  it("does not 404 anything while the post list is unreachable", async () => {
    fetchAllRevnuPosts.mockRejectedValue(new Error("Revnu down"));

    await expect(getBlogPathStatus("/anything")).resolves.toBe("unknown");
  });
});

describe("llms.txt", () => {
  it("lists every Revnu article, newest first", () => {
    const text = buildLlmsTxt(
      [
        revnuSummary("older", Date.UTC(2026, 0, 1)),
        revnuSummary("fresh", Date.UTC(2026, 0, 2)),
      ],
      []
    );

    const articles = text.split("## Articles\n\n")[1]?.trim().split("\n");
    expect(text.startsWith("# Taylored Instruction\n")).toBe(true);
    expect(articles).toEqual([
      "- [Revnu fresh](https://tayloredinstruction.com/blog/fresh): About fresh",
      "- [Revnu older](https://tayloredinstruction.com/blog/older): About older",
    ]);
  });

  it("lists service pages and catalog courses with a one-line summary", () => {
    const text = buildLlmsTxt(
      [],
      [
        {
          slug: "bls-provider",
          title: "BLS Provider",
          description: "Hands-on BLS skills.\nSecond   sentence here.",
        },
        {
          slug: "lifeguarding-blended",
          title: "Lifeguarding",
          description: "",
        },
      ]
    );

    const courses = text
      .split("## Courses\n\n")[1]
      ?.split("\n\n")[0]
      ?.split("\n");
    expect(courses).toContain(
      "- [AHA BLS Certification](https://tayloredinstruction.com/bls): American Heart Association BLS certification for healthcare professionals, with in-person and blended options."
    );
    expect(courses).toContain(
      "- [BLS Provider](https://tayloredinstruction.com/courses/bls-provider): Hands-on BLS skills."
    );
    expect(courses).toContain(
      "- [Lifeguarding](https://tayloredinstruction.com/courses/lifeguarding-blended)"
    );
    expect(text).toContain("## Facts\n");
  });
});
