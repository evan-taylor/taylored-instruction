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
        confirmationEmail: { subject: "Welcome", body: "- ++Bring ID++" },
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
      settings: {
        confirmationEmail: { subject: "Welcome", body: "- ++Bring ID++" },
      },
    });
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

  it("keeps stored settings arrays when only the price changes", async () => {
    const stored = {
      _id: "course1",
      slug: "cpr",
      title: "CPR",
      description: "",
      delivery: "scheduled",
      publication: "published",
      enrollmentOpen: true,
      revision: 1,
      settings: {
        tuition: 9000,
        materials: [
          {
            id: "m1",
            materialId: "mat1",
            title: "Book",
            policy: "included",
            cents: 500,
          },
        ],
        questions: [
          {
            id: "q1",
            title: "Employer",
            type: "text",
            required: false,
            options: [],
            version: 1,
          },
        ],
        outcomes: [
          {
            id: "o1",
            title: "Result",
            type: "category",
            options: ["Pass"],
            required: true,
            version: 1,
          },
        ],
        emails: [
          {
            id: "e1",
            anchor: "first",
            offsetMinutes: -60,
            subject: "Soon",
            body: "See you",
          },
        ],
        cutoffMinutes: 60,
      },
    };
    const { client, calls } = await connect({
      "mcp:record": stored,
      "registration:saveCourse": "course1",
    });
    await client.callTool({
      name: "save_course",
      arguments: { id: "course1", settings: { tuition: 9500 } },
    });
    const save = calls.find((call) => call.name === "registration:saveCourse");
    expect(save?.args).toMatchObject({
      settings: { ...stored.settings, tuition: 9500 },
    });
  });

  it("clears session overrides on request and merges the rest", async () => {
    const stored = {
      _id: "session1",
      courseId: "course1",
      title: "Class",
      publication: "published",
      visibility: "public",
      capacity: 10,
      timeZone: "America/Chicago",
      offerMinutes: 1440,
      instructors: [],
      meetings: [
        {
          id: "mt1",
          start: 1,
          end: 2,
          location: "Room",
          instructions: "",
          sequence: 3,
        },
      ],
      overrides: {
        confirmationEmail: { subject: "Session", body: "**Welcome**" },
        tuition: 5000,
        cutoffMinutes: 30,
        taxCode: "txcd_1",
      },
    };
    const { client, calls } = await connect({
      "mcp:record": stored,
      "registration:saveSession": "session1",
    });
    await client.callTool({
      name: "save_session",
      arguments: {
        id: "session1",
        overrides: { cutoffMinutes: 45 },
        clearOverrides: ["tuition", "confirmationEmail"],
      },
    });
    const save = calls.find((call) => call.name === "registration:saveSession");
    const args = save?.args as {
      overrides: Record<string, unknown>;
      meetings: { sequence: number }[];
    };
    expect(args.overrides.confirmationEmail).toBeUndefined();
    expect(args.overrides.tuition).toBeUndefined();
    expect(args.overrides).toMatchObject({
      cutoffMinutes: 45,
      taxCode: "txcd_1",
    });
    expect(args.meetings[0]?.sequence).toBe(3);
  });

  it("stitches multi-page roster exports into one CSV", async () => {
    let page = 0;
    const { client } = await connect({
      "registrationOperations:exportRoster": () => {
        page += 1;
        return page === 1
          ? {
              csv: '"Name","Email","State"\r\n"Ann","a@x.test","active"',
              continueCursor: "c1",
              isDone: false,
            }
          : {
              csv: '"Name","Email","State"\r\n"Bob","b@x.test","active"',
              continueCursor: "",
              isDone: true,
            };
      },
    });
    const result = await client.callTool({
      name: "export_roster_csv",
      arguments: { sessionId: "session1" },
    });
    const text = (result.content as { text: string }[])[0]?.text;
    expect(text).toBe(
      '"Name","Email","State"\r\n"Ann","a@x.test","active"\r\n"Bob","b@x.test","active"'
    );
  });

  it("reuses caller-supplied operation keys so retries are idempotent", async () => {
    const { client, calls } = await connect({
      "registrationPayments:requestRefund": "refund1",
      "registrationExternal:refund": null,
    });
    const key = "retry-me-retry-me-retry-me-1";
    await client.callTool({
      name: "refund_order",
      arguments: {
        orderId: "order1",
        cents: 2000,
        reason: "Dup",
        operationKey: key,
      },
    });
    await client.callTool({
      name: "refund_order",
      arguments: {
        orderId: "order1",
        cents: 2000,
        reason: "Dup",
        operationKey: key,
      },
    });
    const keys = calls
      .filter((call) => call.name === "registrationPayments:requestRefund")
      .map((call) => (call.args as { key: string }).key);
    expect(keys).toEqual([key, key]);
  });

  it("sends only the given group request fields so stored links survive", async () => {
    const { client, calls } = await connect({ "mcp:patchGroupRequest": null });
    await client.callTool({
      name: "update_group_request",
      arguments: { id: "req1", status: "contacted", orderId: null },
    });
    const update = calls.find((call) => call.name === "mcp:patchGroupRequest");
    expect(update?.args).toEqual({
      id: "req1",
      status: "contacted",
      orderId: null,
    });
  });

  it("emails the payment request when a transfer collects a difference", async () => {
    const { client, calls } = await connect({
      "registrationTransfers:transfer": {
        orderId: "order2",
        seatId: "seat2",
        adjustment: 2500,
      },
      "registrationPayments:requestPayment": "https://example.test/pay",
    });
    const result = await client.callTool({
      name: "transfer_seat",
      arguments: {
        seatId: "seat1",
        sessionId: "session2",
        choice: "collect",
        reason: "Moved",
      },
    });
    expect(result.structuredContent).toMatchObject({
      paymentUrl: "https://example.test/pay",
    });
    expect(calls.map((call) => call.name)).toEqual([
      "registrationTransfers:transfer",
      "registrationPayments:requestPayment",
    ]);
  });

  it("returns the draft invoice id when Stripe issuance fails", async () => {
    const { client } = await connect({
      "registrationGroups:createInvoice": "inv1",
      "registrationInvoiceActions:issue": new ConvexError("Stripe unavailable"),
    });
    const result = await client.callTool({
      name: "create_invoice",
      arguments: {
        orderId: "order1",
        billToName: "Acme",
        billToEmail: "ap@acme.test",
        send: true,
      },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      invoiceId: "inv1",
      status: "draft",
      error: "Stripe unavailable",
    });
  });

  it("validates material input before uploading a PDF", async () => {
    const { client, calls } = await connect({});
    const result = await client.callTool({
      name: "save_material",
      arguments: { kind: "pdf", pdfBase64: "aGVsbG8=" },
    });
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("reports a completed transfer even when the payment request fails", async () => {
    const { client } = await connect({
      "registrationTransfers:transfer": {
        orderId: "order2",
        seatId: "seat2",
        adjustment: 2500,
      },
      "registrationPayments:requestPayment": new ConvexError("Cutoff passed"),
    });
    const result = await client.callTool({
      name: "transfer_seat",
      arguments: {
        seatId: "seat1",
        sessionId: "session2",
        choice: "collect",
        reason: "Moved",
      },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      orderId: "order2",
      seatId: "seat2",
      paymentWarning: "Cutoff passed",
    });
  });
});

it("accepts formatted confirmation and scheduled emails through MCP", async () => {
  const body =
    "Hi {{attendeeName}}\n\n- **Bring ID**\n    - ++Photo ID++\n\n1. Review\n2. Attend";
  const confirmationEmail = { subject: "Welcome to {{courseTitle}}", body };
  const { client, calls } = await connect({
    "registration:saveCourse": "course1",
  });
  const result = await client.callTool({
    name: "save_course",
    arguments: {
      slug: "cpr",
      title: "CPR",
      settings: {
        confirmationEmail,
        emails: [
          {
            id: "reminder",
            anchor: "first",
            offsetMinutes: -60,
            subject: "Prepare",
            body,
          },
        ],
      },
    },
  });
  expect(result.isError).toBeFalsy();
  expect(
    calls.find((call) => call.name === "registration:saveCourse")?.args
  ).toMatchObject({
    settings: { confirmationEmail, emails: [{ id: "reminder", body }] },
  });
  const listed = await client.listTools();
  const schema = JSON.stringify(
    listed.tools.find((tool) => tool.name === "save_course")?.inputSchema
  );
  expect(schema).toContain("confirmationEmail");
  expect(schema).toContain("++underline++");
  expect(schema).toContain("{{attendeeName}}");
  expect(schema).not.toContain("{{name}}");
});

it("preserves formatting in MCP attendee and test email requests", async () => {
  const { client, calls } = await connect({});
  const body = "- **Prepare**\n    - ++Read first++\n\n1. Arrive\n2. Practice";
  const sent = await client.callTool({
    name: "email_attendees",
    arguments: {
      sessionId: "session1",
      seatIds: ["seat1"],
      subject: "Prepare",
      body,
    },
  });
  const tested = await client.callTool({
    name: "send_test_email",
    arguments: { recipient: "tester@example.test", subject: "Preview", body },
  });
  expect(sent.isError).toBeFalsy();
  expect(tested.isError).toBeFalsy();
  expect(
    calls.find((call) => call.name === "registrationOperations:selectedEmail")
      ?.args
  ).toMatchObject({ body });
  expect(
    calls.find((call) => call.name === "registrationOperations:testEmail")?.args
  ).toMatchObject({ body });
});

it("passes complete manual material selections to the enrollment backend, including an empty selection", async () => {
  const { client, calls } = await connect({
    "registration:reserve": {
      orderId: "order1",
      total: 10_000,
      status: "unpaid",
      expires: 1,
    },
  });
  await [["material1", "material2"], []].reduce(
    async (previous, materialIds) => {
      await previous;
      const result = await client.callTool({
        name: "enroll",
        arguments: {
          courseId: "course1",
          sessionId: "session1",
          purchaser: "buyer@example.test",
          purchaserName: "Buyer",
          attendees: [{ name: "Ann", email: "ann@example.test" }],
          payment: "unpaid",
          reason: "Custom selection",
          materialIds,
        },
      });
      expect(result.isError).toBeFalsy();
      expect(calls.at(-1)?.args).toMatchObject({
        sessionId: "session1",
        admin: { materialIds },
      });
    },
    Promise.resolve()
  );
  expect(calls.map((call) => call.name)).toEqual([
    "registration:reserve",
    "registration:reserve",
  ]);
});

it("exposes material selection, revision, linked balances, and separate payment controls through MCP", async () => {
  const selection = {
    orderId: "order1",
    revision: 7,
    materials: [{ materialId: "material1" }],
  };
  const { client, calls } = await connect({
    "registrationMaterialOrders:selectionState": selection,
    "registrationMaterialOrders:edit": "balance1",
    "registrationMaterialOrders:additions": [
      { _id: "balance1", parentOrderId: "order1" },
    ],
    "registrationGroups:createInvoice": "invoice1",
    "registrationInvoiceActions:issue": "https://invoice.stripe.com/test",
    "registrationPayments:requestRefund": "refund1",
  });
  const read = await client.callTool({
    name: "order_material_selection",
    arguments: { seatId: "seat1" },
  });
  expect(read.structuredContent).toEqual(selection);
  const args = {
    seatId: "seat1",
    materialIds: ["material2"],
    revision: 7,
    reason: "Swap",
    operationKey: "material-edit-retry-key-0001",
  };
  const request = { name: "edit_order_materials", arguments: args };
  const responses = [
    await client.callTool(request),
    await client.callTool(request),
  ];
  for (const saved of responses) {
    expect(saved.isError).toBeFalsy();
    expect(saved.structuredContent).toEqual({ balanceId: "balance1" });
  }
  expect(calls.filter((call) => call.kind !== "query")).toEqual(
    [1, 2].map(() => ({
      kind: "mutation",
      name: "registrationMaterialOrders:edit",
      args: {
        seatId: "seat1",
        materialIds: ["material2"],
        revision: 7,
        reason: "Swap",
        requestKey: args.operationKey,
      },
    }))
  );
  const balances = await client.callTool({
    name: "order_material_balances",
    arguments: { orderId: "order1" },
  });
  expect(balances.structuredContent).toEqual({
    result: [{ _id: "balance1", parentOrderId: "order1" }],
  });
  const draft = await client.callTool({
    name: "create_invoice",
    arguments: {
      orderId: "balance1",
      billToName: "Buyer",
      billToEmail: "buyer@example.test",
    },
  });
  expect(draft.structuredContent).toEqual({
    invoiceId: "invoice1",
    status: "draft",
  });
  expect(calls.some((call) => call.kind === "action")).toBe(false);
  await client.callTool({
    name: "issue_invoice",
    arguments: { invoiceId: "invoice1" },
  });
  expect(calls.at(-1)).toMatchObject({
    name: "registrationInvoiceActions:issue",
    args: { id: "invoice1" },
  });
  await client.callTool({
    name: "refund_order",
    arguments: {
      orderId: "balance1",
      cents: 500,
      reason: "Partial material refund",
    },
  });
  expect(
    calls.find((call) => call.name === "registrationPayments:requestRefund")
      ?.args
  ).toMatchObject({ orderId: "balance1", cents: 500 });
  await client.callTool({
    name: "cancel_material_balance",
    arguments: { orderId: "balance2", reason: "No longer needed" },
  });
  expect(calls.at(-1)).toMatchObject({
    name: "registrationMaterialOrders:cancelAddition",
    args: { orderId: "balance2", reason: "No longer needed" },
  });
});

it("documents material edit annotations, input validation, and stale-edit errors in MCP", async () => {
  const { client, calls } = await connect({
    "registrationMaterialOrders:edit": new ConvexError(
      "This order changed. Reopen the material editor."
    ),
  });
  const { tools } = await client.listTools();
  expect(
    tools.find((tool) => tool.name === "order_material_selection")?.annotations
      ?.readOnlyHint
  ).toBe(true);
  expect(
    tools.find((tool) => tool.name === "edit_order_materials")?.annotations
  ).toMatchObject({ destructiveHint: true, openWorldHint: false });
  expect(
    tools.find((tool) => tool.name === "cancel_material_balance")?.annotations
  ).toMatchObject({ destructiveHint: true, openWorldHint: true });
  const args = {
    seatId: "seat1",
    materialIds: [],
    reason: "Remove all",
    revision: -1,
  };
  expect(
    (await client.callTool({ name: "edit_order_materials", arguments: args }))
      .isError
  ).toBe(true);
  expect(calls).toHaveLength(0);
  const result = await client.callTool({
    name: "edit_order_materials",
    arguments: { ...args, revision: 2 },
  });
  expect(result.isError).toBe(true);
  expect(result.content).toEqual([
    { type: "text", text: "This order changed. Reopen the material editor." },
  ]);
  const guide = await client.readResource({ uri: "taylored://guide" });
  expect(JSON.stringify(guide)).toContain(
    "Saving never sends an invoice or issues a refund"
  );
});
