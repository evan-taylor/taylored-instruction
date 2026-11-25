import { describe, expect, it } from "vitest";
import { rateLimitedHttpClient } from "../../shared/stripe-rate-limit";

type Reply = { status: number; headers?: Record<string, string> };

function fakeClient(replies: Reply[]) {
  const paths: string[] = [];
  const idempotencyKeys: unknown[] = [];
  return {
    paths,
    idempotencyKeys,
    client: {
      getClientName: () => "fake",
      makeRequest: async (
        _host: string,
        _port: string,
        path: string,
        _method: string,
        headers: Record<string, string | number | string[]>
      ) => {
        await Promise.resolve();
        paths.push(path);
        idempotencyKeys.push(headers["Idempotency-Key"]);
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
  };
}

function setup(replies: Reply[], searchIntervalMs = 0) {
  const fake = fakeClient(replies);
  const sleeps: number[] = [];
  const client = rateLimitedHttpClient(fake.client, {
    retries: 3,
    baseMs: 1000,
    maxMs: 16_000,
    searchIntervalMs,
    sleep: async (ms) => {
      await Promise.resolve();
      sleeps.push(ms);
    },
    random: () => 0.5,
  });
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
  return { ...fake, sleeps, request };
}

describe("rate limited Stripe HTTP client", () => {
  it("retries a 429 with jittered exponential backoff, then succeeds", async () => {
    const { request, sleeps, paths, idempotencyKeys } = setup([
      { status: 429 },
      { status: 429 },
      { status: 200 },
    ]);
    const response = await request("/v1/customers");
    expect(response.getStatusCode()).toBe(200);
    expect(paths).toHaveLength(3);
    expect(sleeps).toEqual([500, 1000]);
    expect(new Set(idempotencyKeys)).toEqual(new Set(["key-1"]));
  });
  it("waits as long as Retry-After asks", async () => {
    const { request, sleeps } = setup([
      { status: 429, headers: { "retry-after": "3" } },
      { status: 200 },
    ]);
    expect((await request("/v1/customers")).getStatusCode()).toBe(200);
    expect(sleeps).toEqual([3000]);
  });
  it("hands the 429 back once its retries are used up", async () => {
    const { request, paths } = setup(
      Array.from({ length: 5 }, () => ({ status: 429 }))
    );
    expect((await request("/v1/customers")).getStatusCode()).toBe(429);
    expect(paths).toHaveLength(4);
  });
  it("does not retry other errors", async () => {
    const { request, paths } = setup([{ status: 400 }]);
    expect((await request("/v1/customers")).getStatusCode()).toBe(400);
    expect(paths).toHaveLength(1);
  });
  it("spaces out Search requests but not other requests", async () => {
    const { request, sleeps } = setup([], 250);
    await Promise.all([
      request("/v1/customers/search"),
      request("/v1/customers/search"),
      request("/v1/customers/search"),
      request("/v1/customers"),
    ]);
    expect(sleeps).toHaveLength(2);
    expect(sleeps[0]).toBeGreaterThan(200);
    expect(sleeps[1]).toBeGreaterThan(450);
  });
});
