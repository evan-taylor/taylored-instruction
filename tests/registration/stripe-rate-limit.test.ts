import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimitedHttpClient } from "../../shared/stripe-rate-limit";

type Reply = { status: number; headers?: Record<string, string> };

let clock = 0;
beforeEach(() => {
  clock = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => clock);
});
afterEach(() => vi.restoreAllMocks());

function setup(
  replies: Reply[],
  {
    searchIntervalMs = 0,
    deadline = Number.POSITIVE_INFINITY,
    jitter = 0.5,
  } = {}
) {
  const sent: { path: string; at: number; key: unknown }[] = [];
  const sleeps: number[] = [];
  const client = rateLimitedHttpClient(
    {
      getClientName: () => "fake",
      makeRequest: async (_host, _port, path, _method, headers) => {
        await Promise.resolve();
        sent.push({ path, at: clock, key: headers["Idempotency-Key"] });
        const reply = replies.shift() ?? { status: 200 };
        return {
          getStatusCode: () => reply.status,
          getHeaders: () => reply.headers ?? {},
          getRawResponse: () => null,
          toStream: () => null,
          toJSON: async () => {
            await Promise.resolve();
            return {};
          },
        };
      },
    },
    {
      retries: 3,
      baseMs: 1000,
      maxMs: 16_000,
      searchIntervalMs,
      deadline,
      sleep: async (ms) => {
        await Promise.resolve();
        sleeps.push(ms);
        clock += ms;
      },
      random: () => jitter,
    }
  );
  const request = (path: string) =>
    client.makeRequest(
      "api.stripe.com",
      "443",
      path,
      "POST",
      { "Idempotency-Key": "key-1" },
      "",
      "https",
      80_000
    );
  return { sent, sleeps, request };
}

describe("rate limited Stripe HTTP client", () => {
  it("retries a 429 with jittered exponential backoff, then succeeds", async () => {
    const { request, sleeps, sent } = setup([
      { status: 429 },
      { status: 429 },
      { status: 200 },
    ]);
    const response = await request("/v1/customers");
    expect(response.getStatusCode()).toBe(200);
    expect(sent).toHaveLength(3);
    expect(sleeps).toEqual([500, 1000]);
    expect(new Set(sent.map((s) => s.key))).toEqual(new Set(["key-1"]));
  });
  it("waits the full Retry-After, even past the backoff cap", async () => {
    const { request, sleeps } = setup([
      { status: 429, headers: { "retry-after": "120" } },
      { status: 200 },
    ]);
    expect((await request("/v1/customers")).getStatusCode()).toBe(200);
    expect(sleeps).toEqual([120_000]);
  });
  it("hands the 429 back when the wait would pass the deadline", async () => {
    const { request, sent, sleeps } = setup(
      [{ status: 429, headers: { "retry-after": "30" } }],
      { deadline: 1_000_000 + 10_000 }
    );
    expect((await request("/v1/customers")).getStatusCode()).toBe(429);
    expect(sent).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });
  it("hands the 429 back once its retries are used up", async () => {
    const { request, sent } = setup(
      Array.from({ length: 5 }, () => ({ status: 429 }))
    );
    expect((await request("/v1/customers")).getStatusCode()).toBe(429);
    expect(sent).toHaveLength(4);
  });
  it("does not retry other errors", async () => {
    const { request, sent } = setup([{ status: 400 }]);
    expect((await request("/v1/customers")).getStatusCode()).toBe(400);
    expect(sent).toHaveLength(1);
  });
  it("spaces every Search send, retries included, but not other requests", async () => {
    const { request, sent, sleeps } = setup(
      [{ status: 200 }, { status: 429 }, { status: 200 }, { status: 200 }],
      { searchIntervalMs: 250, jitter: 0 }
    );
    await request("/v1/customers/search");
    await request("/v1/customers/search");
    const before = sleeps.length;
    await request("/v1/customers");
    expect(sleeps).toHaveLength(before);
    await request("/v1/customers/search");
    const searches = sent
      .filter((s) => s.path === "/v1/customers/search")
      .map((s) => s.at);
    expect(searches).toHaveLength(4);
    for (const [index, at] of searches.slice(1).entries()) {
      expect(at - (searches[index] ?? 0)).toBeGreaterThanOrEqual(250);
    }
  });
});
