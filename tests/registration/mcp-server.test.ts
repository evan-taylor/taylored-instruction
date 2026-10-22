import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ConvexHttpClient } from "convex/browser";
import { type FunctionReference, getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../../lib/mcp/server";

type Call = {
  kind: "query" | "mutation" | "action";
  name: string;
  args: unknown;
};

/** A stand-in Convex client that records calls and answers from a script. */
function fakeConvex(answers: Record<string, unknown>) {
  const calls: Call[] = [];
  const respond = (kind: Call["kind"]) => (ref: unknown, args: unknown) => {
    const name = getFunctionName(ref as FunctionReference<"query">);
    calls.push({ kind, name, args });
    const answer = answers[name];
    if (answer instanceof Error) {
      return Promise.reject(answer);
    }
    if (typeof answer === "function") {
      return Promise.resolve(answer(args));
    }
    return Promise.resolve(answer ?? null);
  };
  const client = {
    query: respond("query"),
    mutation: respond("mutation"),
    action: respond("action"),
  } as unknown as ConvexHttpClient;
  return { client, calls };
}

async function connect(answers: Record<string, unknown>) {
  const { client: convex, calls } = fakeConvex(answers);
  const server = createMcpServer({
    convex,
    actor: { userId: "user1", email: "admin@example.test", label: "Test" },
    siteUrl: "https://example.test",
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return { client, calls };
}

describe("MCP server", () => {
  it("exposes the admin workspace as tools, resources, and prompts", async () => {
    const { client } = await connect({});
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);
    for (const expected of [
      "dashboard_summary",
      "save_course",
      "save_session",
      "plan_meetings",
      "enroll",
      "refund_order",
      "create_invoice",
      "add_keycodes",
      "set_instructor_approval",
      "upsert_seo_page",
    ]) {
      expect(names).toContain(expected);
    }
    expect(tools.length).toBeGreaterThan(70);
    const destructive = tools.find((tool) => tool.name === "delete_course");
    expect(destructive?.annotations?.destructiveHint).toBe(true);
    const readOnly = tools.find((tool) => tool.name === "list_orders");
    expect(readOnly?.annotations?.readOnlyHint).toBe(true);
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain("taylored://guide");
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((r) => r.uriTemplate)).toContain(
      "taylored://orders/{orderId}"
    );
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain("morning_review");
    const guide = await client.readResource({ uri: "taylored://guide" });
    const first = guide.contents[0] as { text?: string } | undefined;
    expect(first?.text).toContain("Daily rhythm");
  });

  it("calls the same Convex functions as the admin UI", async () => {
    const summary = { revenue: 12_345, seatsSold: 3 };
    const { client, calls } = await connect({
      "registrationDashboard:summary": summary,
      "registration:reserve": {
        orderId: "order1",
        total: 10_000,
        status: "unpaid",
        expires: 1,
      },
    });
    const result = await client.callTool({ name: "dashboard_summary" });
    expect(result.structuredContent).toEqual(summary);
    expect(calls[0]).toMatchObject({
      kind: "query",
      name: "registrationDashboard:summary",
    });

    const enrolled = await client.callTool({
      name: "enroll",
      arguments: {
        courseId: "course1",
        purchaser: "Buyer@Example.test",
        purchaserName: "Buyer",
        attendees: [{ name: "Ann", email: "ann@example.test" }],
        payment: "unpaid",
        reason: "Phone order",
      },
    });
    expect(enrolled.isError).toBeFalsy();
    const reserve = calls.find((call) => call.name === "registration:reserve");
    expect(reserve?.args).toMatchObject({
      courseId: "course1",
      purchaser: "buyer@example.test",
      attendees: [
        {
          name: "Ann",
          email: "ann@example.test",
          selected: [],
          waived: [],
          answers: [],
        },
      ],
      admin: { overbook: false, payment: "unpaid", reason: "Phone order" },
    });
    const reserveArgs = reserve?.args as { requestKey: string } | undefined;
    expect(reserveArgs?.requestKey).toHaveLength(36);
  });

  it("turns backend errors into tool errors instead of protocol failures", async () => {
    const { client } = await connect({
      "registrationOperations:cancelSeat": new ConvexError(
        "Seat already canceled"
      ),
    });
    const result = await client.callTool({
      name: "cancel_seat",
      arguments: { seatId: "seat1", reason: "dup" },
    });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Seat already canceled" },
    ]);
  });

  it("merges partial updates over the stored record", async () => {
    const stored = {
      _id: "course1",
      slug: "cpr",
      title: "CPR",
      description: "Old",
      delivery: "scheduled",
      publication: "published",
      enrollmentOpen: true,
      revision: 4,
      settings: {
        tuition: 9000,
        materials: [],
        questions: [
          {
            id: "q1",
            title: "Employer",
            type: "text",
            required: false,
            options: [],
            version: 2,
          },
        ],
        outcomes: [],
        emails: [],
        cutoffMinutes: 60,
      },
    };
    const { client, calls } = await connect({
      "mcp:record": stored,
      "registration:saveCourse": "course1",
    });
    await client.callTool({
      name: "save_course",
      arguments: {
        id: "course1",
        title: "CPR & AED",
        settings: {
          tuition: 9500,
          questions: [
            { id: "q1", title: "Employer name", type: "text", required: true },
          ],
        },
      },
    });
    const save = calls.find((call) => call.name === "registration:saveCourse");
    expect(save?.args).toMatchObject({
      id: "course1",
      slug: "cpr",
      title: "CPR & AED",
      description: "Old",
      publication: "published",
      revision: 4,
      settings: {
        tuition: 9500,
        cutoffMinutes: 60,
        questions: [
          { id: "q1", title: "Employer name", required: true, version: 2 },
        ],
      },
    });
  });

  it("plans recurring meetings without touching the backend", async () => {
    const { client, calls } = await connect({});
    const result = await client.callTool({
      name: "plan_meetings",
      arguments: {
        startDate: "2026-11-02",
        endDate: "2026-11-13",
        weekdays: [1, 3],
        timeZone: "America/Los_Angeles",
        meetings: [{ startTime: "09:00", endTime: "13:00" }],
        location: "Training center",
      },
    });
    const plan = result.structuredContent as {
      sessions: { meetings: unknown[] }[];
    };
    expect(plan.sessions).toHaveLength(4);
    expect(calls).toHaveLength(0);
  });
});
