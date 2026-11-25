import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const { POST } = await import("@/app/api/revnu-revalidate/route");
const {
  buildRevnuSitemap,
  fetchRevnuPost,
  getRevnuPosts,
  resolveRevnuPost,
  rewriteRevnuBodyLinks,
} = await import("@/lib/revnu");
const { revalidateTag } = await import("next/cache");

const apiKey = "rvc_test_key";

const summary = (slug: string, overrides: Record<string, unknown> = {}) => ({
  slug,
  title: `Title ${slug}`,
  canonicalPath: `/${slug}`,
  canonicalUrl: `https://tayloredinstruction.com/blog/${slug}`,
  metaDescription: `About ${slug}`,
  heroImageUrl: null,
  publishedAt: Date.UTC(2026, 0, 1),
  updatedAt: Date.UTC(2026, 0, 2),
  ...overrides,
});

const postResponse = (
  slug: string,
  overrides: Record<string, unknown> = {}
) => ({
  redirected: false,
  post: { ...summary(slug), body: { html: "<p>Hi</p>", markdown: "Hi" } },
  headMeta: {},
  jsonLd: [],
  ...overrides,
});

type Route = (url: URL) => { status: number; body?: unknown };

const mockFetch = (route: Route) => {
  const fetchMock = vi.fn((input: string) => {
    const { status, body } = route(new URL(input));
    return Promise.resolve(Response.json(body ?? {}, { status }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const listRoute =
  (posts: ReturnType<typeof summary>[], post?: Record<string, unknown>) =>
  (url: URL) =>
    url.pathname.endsWith("/posts")
      ? { status: 200, body: { posts, cursor: null } }
      : { status: post ? 200 : 404, body: post };

beforeEach(() => {
  vi.stubEnv("REVNU_CONTENT_API_KEY", apiKey);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Revnu post list", () => {
  it("follows the cursor until it is null", async () => {
    const pages: Record<string, { posts: unknown[]; cursor: string | null }> = {
      "": { posts: [summary("a")], cursor: "page 2" },
      "page 2": { posts: [summary("b")], cursor: "page/3" },
      "page/3": { posts: [summary("c")], cursor: null },
    };
    const fetchMock = mockFetch((url) => ({
      status: 200,
      body: pages[url.searchParams.get("cursor") ?? ""],
    }));

    const posts = await getRevnuPosts();

    expect(posts.map((post) => post.slug)).toEqual(["a", "b", "c"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [input, init] of fetchMock.mock.calls as unknown as [
      string,
      RequestInit,
    ][]) {
      expect(new URL(input).searchParams.get("limit")).toBe("200");
      expect(init.headers).toEqual({ Authorization: `Bearer ${apiKey}` });
    }
  });

  it("fails instead of returning a partial list", async () => {
    vi.useFakeTimers();
    mockFetch((url) =>
      url.searchParams.has("cursor")
        ? { status: 429 }
        : { status: 200, body: { posts: [summary("a")], cursor: "next" } }
    );

    const result = expect(getRevnuPosts()).rejects.toThrow("429");
    await vi.runAllTimersAsync();
    await result;
  });

  it("skips Revnu when no key is configured", async () => {
    vi.stubEnv("REVNU_CONTENT_API_KEY", "");
    const fetchMock = mockFetch(() => ({ status: 200 }));

    await expect(getRevnuPosts()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

type Reply = { status: number; headers?: Record<string, string> };

const mockReplies = (replies: Reply[]) => {
  const fetchMock = vi.fn(() => {
    const { status, headers } = replies.shift() ?? { status: 200 };
    return Promise.resolve(
      Response.json(status === 200 ? postResponse("a") : {}, {
        status,
        headers,
      })
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("Revnu rate limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("retries 429 and 5xx responses until one succeeds", async () => {
    const fetchMock = mockReplies([
      { status: 429 },
      { status: 503 },
      { status: 200 },
    ]);

    const post = fetchRevnuPost("a");
    await vi.runAllTimersAsync();

    await expect(post).resolves.toMatchObject({ post: { slug: "a" } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("waits as long as Retry-After asks", async () => {
    const fetchMock = mockReplies([
      { status: 429, headers: { "Retry-After": "3" } },
      { status: 200 },
    ]);

    const post = fetchRevnuPost("a");
    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(post).resolves.not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails once retries are exhausted", async () => {
    const fetchMock = mockReplies(
      Array.from({ length: 10 }, () => ({ status: 429 }))
    );

    const result = expect(fetchRevnuPost("a")).rejects.toThrow("429");
    await vi.runAllTimersAsync();

    await result;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("fails without waiting when Retry-After exceeds the wait budget", async () => {
    const fetchMock = mockReplies([
      { status: 429, headers: { "Retry-After": "120" } },
      { status: 200 },
    ]);

    await expect(fetchRevnuPost("a")).rejects.toThrow("429");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry other client errors", async () => {
    const fetchMock = mockReplies([{ status: 401 }, { status: 200 }]);

    await expect(fetchRevnuPost("a")).rejects.toThrow("401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps at most four requests in flight until their bodies are read", async () => {
    let inFlight = 0;
    let peak = 0;
    const body = new TextEncoder().encode(JSON.stringify(postResponse("a")));
    const fetchMock = vi.fn(() => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      const stream = new ReadableStream({
        async start(controller) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          controller.enqueue(body);
          inFlight -= 1;
          controller.close();
        },
      });
      return Promise.resolve(new Response(stream, { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const posts = Promise.all(
      Array.from({ length: 10 }, (_, index) => fetchRevnuPost(`post-${index}`))
    );
    await vi.runAllTimersAsync();

    await expect(posts).resolves.toHaveLength(10);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(peak).toBe(4);
  });
});

describe("Revnu post resolution", () => {
  it("serves a post that is in the list", async () => {
    mockFetch(listRoute([summary("a")], postResponse("a")));

    const resolution = await resolveRevnuPost("/a");

    expect(resolution?.kind).toBe("post");
  });

  it("treats a post missing from the list as removed", async () => {
    mockFetch(listRoute([summary("other")], postResponse("a")));

    await expect(resolveRevnuPost("/a")).resolves.toBeNull();
  });

  it("returns nothing for an unknown slug", async () => {
    mockFetch(listRoute([summary("other")]));

    await expect(resolveRevnuPost("/missing")).resolves.toBeNull();
  });

  it("redirects an old slug to the listed canonical path", async () => {
    mockFetch(
      listRoute(
        [summary("new-slug")],
        postResponse("new-slug", { redirected: true })
      )
    );

    await expect(resolveRevnuPost("/old-slug")).resolves.toEqual({
      kind: "redirect",
      canonicalPath: "/new-slug",
    });
  });

  it("serves a removed post again once it is back in the list", async () => {
    mockFetch(listRoute([], postResponse("a")));
    await expect(resolveRevnuPost("/a")).resolves.toBeNull();

    mockFetch(listRoute([summary("a")], postResponse("a")));
    await expect(resolveRevnuPost("/a")).resolves.not.toBeNull();
  });
});

describe("Revnu body links", () => {
  it("moves links to other posts under /blog and leaves other site links alone", () => {
    const html = [
      '<a href="/cpr-basics">post</a>',
      '<a href="/guides/aed#steps">nested post</a>',
      '<a href="/classes">classes</a>',
      '<a href="/blog/cpr-basics">already prefixed</a>',
      '<a href="//cdn.example.com/x">protocol-relative</a>',
      '<a href="https://tayloredinstruction.com/blog">absolute</a>',
    ].join("");

    expect(rewriteRevnuBodyLinks(html, ["/cpr-basics", "/guides/aed"])).toBe(
      [
        '<a href="/blog/cpr-basics">post</a>',
        '<a href="/blog/guides/aed#steps">nested post</a>',
        '<a href="/classes">classes</a>',
        '<a href="/blog/cpr-basics">already prefixed</a>',
        '<a href="//cdn.example.com/x">protocol-relative</a>',
        '<a href="https://tayloredinstruction.com/blog">absolute</a>',
      ].join("")
    );
  });
});

describe("Revnu sitemap", () => {
  it("lists every post with updatedAt, falling back to publishedAt", () => {
    const sitemap = buildRevnuSitemap([
      summary("edited"),
      summary("unedited", { updatedAt: null }),
    ]);

    expect(sitemap).toEqual([
      {
        url: "https://tayloredinstruction.com/blog/edited",
        lastModified: new Date(Date.UTC(2026, 0, 2)),
      },
      {
        url: "https://tayloredinstruction.com/blog/unedited",
        lastModified: new Date(Date.UTC(2026, 0, 1)),
      },
    ]);
  });
});

describe("Revnu revalidation endpoint", () => {
  it("rejects requests without the revalidation key", () => {
    vi.stubEnv("REVNU_REVALIDATE_KEY", "secret");

    const response = POST(
      new Request(
        "https://tayloredinstruction.com/api/revnu-revalidate?key=x",
        {
          method: "POST",
        }
      )
    );

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires cached Revnu data immediately", () => {
    vi.stubEnv("REVNU_REVALIDATE_KEY", "secret");

    const response = POST(
      new Request(
        "https://tayloredinstruction.com/api/revnu-revalidate?key=secret",
        { method: "POST" }
      )
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("revnu", { expire: 0 });
  });
});
