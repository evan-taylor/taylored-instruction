import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mcp/auth", () => ({
  convexUrl: () => "https://placeholder.convex.cloud",
  bearerToken: (request: Request) =>
    request.headers.get("authorization")?.replace("Bearer ", "") ?? null,
  authenticate: (token: string) =>
    Promise.resolve(
      token === "good"
        ? {
            jwt: "jwt",
            expiresAt: Date.now() + 60_000,
            userId: "user1",
            email: "admin@example.test",
            label: "Test",
          }
        : null
    ),
}));

const ENDPOINT = "https://site.test/api/mcp";

function rpc(body: unknown, token?: string) {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function firstJson(response: Response) {
  const text = await response.text();
  const data = text
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  try {
    return JSON.parse(data ?? text) as {
      result?: Record<string, unknown>;
      error?: unknown;
    };
  } catch (error) {
    throw new Error(
      `Unparseable body (status ${response.status}, ${response.headers.get("content-type")}): ${text}`,
      { cause: error }
    );
  }
}

afterEach(() => vi.resetModules());

describe("MCP route", () => {
  it("demands a bearer token", async () => {
    const { POST } = await import("../../app/api/mcp/route");
    const missing = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "ping" }));
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toContain("Bearer");
    const wrong = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "ping" }, "bad")
    );
    expect(wrong.status).toBe(401);
  });

  it("answers MCP requests statelessly for a valid token", async () => {
    const { POST } = await import("../../app/api/mcp/route");
    const init = await POST(
      rpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test", version: "0" },
          },
        },
        "good"
      )
    );
    expect(init.status).toBe(200);
    expect(init.headers.get("mcp-session-id")).toBeNull();
    const initialized = await firstJson(init);
    expect(initialized.result?.serverInfo).toMatchObject({
      name: "taylored-instruction-admin",
    });
    expect(initialized.result?.capabilities).toMatchObject({
      tools: {},
      resources: {},
      prompts: {},
    });

    const list = await POST(
      rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, "good")
    );
    expect(list.status).toBe(200);
    const listed = await firstJson(list);
    const tools = listed.result?.tools as { name: string }[];
    expect(tools.map((tool) => tool.name)).toContain("dashboard_summary");
  });
});
