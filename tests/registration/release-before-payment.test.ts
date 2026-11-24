import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ConvexHttpClient } from "convex/browser";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { createMcpServer } from "../../lib/mcp/server";
import { ADMIN_EMAILS } from "../../shared/adminEmails";

const modules = import.meta.glob("../../convex/**/*.ts");
const DAY = 86_400_000;
const PAGE = { cursor: null, numItems: 50 };
const CODE_URL = /^https:\/\/codes\.example\.test\/\d$/u;
const bill = {
  billToName: "Clark County YMCA",
  billToEmail: "ap@example.test",
  billToAddress: "1 Main St",
  city: "Vancouver",
  state: "WA",
  postalCode: "98660",
  country: "US",
  poNumber: "",
  notes: "",
  dueDays: 30,
};

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    });
    const instructor = await ctx.db.insert("users", {
      email: "teacher@example.test",
      emailVerificationTime: Date.now(),
    });
    const student = await ctx.db.insert("users", {
      email: "alyssa@example.test",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("profiles", { userId: instructor, isInstructor: true });
    const keycode = await ctx.db.insert("registrationMaterials", {
      title: "Online course",
      kind: "keycode",
      version: 1,
      archived: false,
    });
    const manual = await ctx.db.insert("registrationMaterials", {
      title: "Participant manual",
      kind: "link",
      url: "https://example.test/manual",
      version: 1,
      archived: false,
    });
    const course = await ctx.db.insert("registrationCourses", {
      slug: "lifeguarding-blended",
      title: "Lifeguarding - Blended",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      enrollmentOpen: true,
      revision: 1,
      settings: {
        tuition: 30_000,
        materials: [
          {
            id: "code",
            materialId: keycode,
            title: "Online course",
            policy: "included",
            cents: 0,
          },
          {
            id: "manual",
            materialId: manual,
            title: "Participant manual",
            policy: "included",
            cents: 0,
          },
        ],
        questions: [],
        outcomes: [],
        emails: [
          {
            id: "welcome",
            anchor: "registration",
            offsetMinutes: 0,
            subject: "Welcome",
            body: "Hello {{attendeeName}}",
          },
          {
            id: "reminder",
            anchor: "first",
            offsetMinutes: -60,
            subject: "Reminder",
            body: "See you soon",
          },
        ],
        cutoffMinutes: 0,
      },
    });
    const start = Date.now() + 7 * DAY;
    const session = await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "Lifeguarding - Blended",
      code: "lifeguard-test",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 10,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "first",
          start,
          end: start + 4 * 3_600_000,
          location: "Pool",
          instructions: "Bring a swimsuit",
          sequence: 0,
        },
      ],
      firstStart: start,
      lastEnd: start + 4 * 3_600_000,
      overrides: {},
      revision: 1,
      instructors: [instructor],
      offerMinutes: 1440,
    });
    return { admin, instructor, student, keycode, course, session };
  });
  const adminClient = t.withIdentity({ subject: `${ids.admin}|session` });
  await adminClient.mutation(api.registrationOperations.addStock, {
    materialId: ids.keycode,
    input: [1, 2, 3].map((n) => `https://codes.example.test/${n}`).join("\n"),
    preview: false,
  });
  return {
    t,
    ...ids,
    adminClient,
    instructorClient: t.withIdentity({ subject: `${ids.instructor}|session` }),
    studentClient: t.withIdentity({ subject: `${ids.student}|session` }),
  };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

/** A staff group enrollment awaiting payment on an issued Stripe invoice. */
async function invoicedOrder(f: Fixture, emails = ["alyssa@example.test"]) {
  const { orderId } = await f.adminClient.mutation(api.registration.reserve, {
    courseId: f.course,
    sessionId: f.session,
    requestKey: crypto.randomUUID(),
    purchaser: "tori@example.test",
    purchaserName: "Tori Birdsong",
    attendees: emails.map((email) => ({
      name: email.split("@")[0] ?? email,
      email,
      selected: [],
      waived: [],
      answers: [],
    })),
    admin: { payment: "unpaid", overbook: false, reason: "YMCA group" },
  });
  const invoiceId = await f.adminClient.mutation(
    api.registrationGroups.createInvoice,
    { orderId, ...bill }
  );
  const stripeInvoiceId = `in_${crypto.randomUUID()}`;
  await f.t.mutation(internal.registrationGroups.attachStripeInvoice, {
    id: invoiceId,
    stripeInvoiceId,
    stripeCustomerId: "cus_ymca",
    hostedUrl: "https://invoice.stripe.com/i/ymca",
    tax: 0,
  });
  return { orderId, invoiceId, stripeInvoiceId };
}

/** Everything fulfillment and email delivery wrote for an order. */
function fulfillment(f: Fixture, orderId: Id<"registrationOrders">) {
  return f.t.run(async (ctx) => {
    const seats = await ctx.db
      .query("registrationSeats")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();
    const seatIds = new Set<string>(seats.map((s) => s._id));
    const entitlements = (
      await ctx.db.query("registrationEntitlements").collect()
    ).filter((e) => seatIds.has(e.seatId));
    const jobs = await ctx.db.query("registrationJobs").collect();
    const codes = await ctx.db.query("registrationCodes").collect();
    return {
      order: await ctx.db.get(orderId),
      seats,
      entitlements,
      assigned: codes.filter((c) => c.state === "assigned"),
      seatJobs: jobs.filter((j) => j.seatId && seatIds.has(j.seatId)),
      receipts: jobs.filter((j) => j.key === `receipt:${orderId}`),
      activity: (await ctx.db.query("registrationActivity").collect()).filter(
        (row) => row.entity === orderId
      ),
    };
  });
}

function release(
  f: Fixture,
  args: {
    orderId: Id<"registrationOrders">;
    reason: string;
    seatIds?: Id<"registrationSeats">[];
  }
) {
  return f.adminClient.mutation(
    api.registrationOperations.releaseUnpaidAccess,
    args
  );
}

describe("Release access before payment", () => {
  it.each([
    ["a Stripe invoice payment", "stripe"],
    ["an offline invoice payment", "offline"],
  ] as const)(
    "releases now, then settles on %s without sending or granting anything twice",
    async (_label, method) => {
      const f = await fixture();
      const { orderId, invoiceId, stripeInvoiceId } = await invoicedOrder(f);
      const before = await f.adminClient.query(
        api.registrationDashboard.summary
      );

      expect(
        await release(f, { orderId, reason: "Evan approved early access" })
      ).toEqual({ released: 1, alreadyReleased: 0 });

      const released = await fulfillment(f, orderId);
      expect(released.order?.status).toBe("unpaid");
      expect(released.order?.settledAt).toBeUndefined();
      expect(released.order?.releasedBeforePayment).toMatchObject({
        actor: f.admin,
        reason: "Evan approved early access",
      });
      expect((await f.t.run((ctx) => ctx.db.get(invoiceId)))?.status).toBe(
        "open"
      );
      expect(released.seats.map((s) => s.state)).toEqual(["active"]);
      expect(released.entitlements).toHaveLength(2);
      expect(released.entitlements.every((e) => e.state === "ready")).toBe(
        true
      );
      expect(released.assigned).toHaveLength(1);
      expect(
        released.seatJobs.filter((j) => j.key.startsWith("confirmation:"))
      ).toHaveLength(1);
      expect(released.seatJobs.filter((j) => j.stepId)).toHaveLength(2);
      expect(released.receipts).toHaveLength(0);
      expect(released.activity.map((row) => row.action)).toContain(
        "released-before-payment"
      );

      // Confirmed everywhere staff and the attendee look, but nothing counts as paid.
      const roster = await f.adminClient.query(
        api.registrationOperations.roster,
        { sessionId: f.session, paginationOpts: PAGE }
      );
      expect(roster.page.map((s) => s.state)).toEqual(["active"]);
      const portal = await f.studentClient.query(
        api.registrationPortal.registrations,
        { paginationOpts: PAGE }
      );
      expect(portal.page[0]?.meetings[0]?.instructions).toBe(
        "Bring a swimsuit"
      );
      const keycode = portal.page[0]?.materials.find(
        (m) => m.kind === "keycode"
      );
      if (!keycode) {
        throw new Error("Missing keycode in the portal");
      }
      expect(
        await f.studentClient.query(api.registrationPortal.materialUrl, {
          id: keycode.id,
        })
      ).toMatch(CODE_URL);
      const during = await f.adminClient.query(
        api.registrationDashboard.summary
      );
      expect(during.revenue).toBe(before.revenue);
      expect(during.ordersSettled).toBe(before.ordersSettled);
      expect(during.openInvoices).toBe(1);
      await f.t.run((ctx) =>
        ctx.db.patch(invoiceId, { dueAt: Date.now() - 1 })
      );
      const attention = await f.adminClient.query(
        api.registrationOperations.attention
      );
      expect(attention.invoices.map((i) => i._id)).toEqual([invoiceId]);
      expect(attention.unpaid.map((o) => o._id)).toEqual([orderId]);
      await expect(
        f.adminClient.mutation(api.registrationGroups.remindInvoice, {
          id: invoiceId,
        })
      ).resolves.toBeNull();

      expect(await release(f, { orderId, reason: "Retry" })).toEqual({
        released: 0,
        alreadyReleased: 1,
      });

      if (method === "stripe") {
        await f.t.mutation(internal.registrationGroups.invoicePaid, {
          eventId: "evt_ymca_paid",
          stripeInvoiceId,
          amount: 30_000,
          tax: 0,
          currency: "usd",
          paymentIntent: "pi_ymca",
          live: false,
        });
      } else {
        await f.adminClient.mutation(
          api.registrationGroups.recordInvoicePayment,
          {
            id: invoiceId,
            reason: "Check #1042",
          }
        );
      }

      const paid = await fulfillment(f, orderId);
      expect(paid.order?.status).toBe("settled");
      expect((await f.t.run((ctx) => ctx.db.get(invoiceId)))?.status).toBe(
        "paid"
      );
      expect(paid.seats.map((s) => s.settledAt)).toEqual(
        released.seats.map((s) => s.settledAt)
      );
      expect(paid.entitlements.map((e) => e._id).sort()).toEqual(
        released.entitlements.map((e) => e._id).sort()
      );
      expect(paid.assigned.map((c) => c._id)).toEqual(
        released.assigned.map((c) => c._id)
      );
      expect(paid.seatJobs.map((j) => j._id).sort()).toEqual(
        released.seatJobs.map((j) => j._id).sort()
      );
      expect(paid.receipts).toHaveLength(1);
      const after = await f.adminClient.query(
        api.registrationDashboard.summary
      );
      expect(after.revenue).toBe(before.revenue + 30_000);
      expect(after.ordersSettled).toBe(before.ordersSettled + 1);
    }
  );

  it("releases one attendee of a group and activates the rest only on payment", async () => {
    const f = await fixture();
    const { orderId, invoiceId } = await invoicedOrder(f, [
      "alyssa@example.test",
      "ben@example.test",
    ]);
    const alyssa = (await fulfillment(f, orderId)).seats.find(
      (s) => s.email === "alyssa@example.test"
    );
    if (!alyssa) {
      throw new Error("Missing seat");
    }
    await release(f, {
      orderId,
      seatIds: [alyssa._id],
      reason: "Needs the online course now",
    });
    const released = await fulfillment(f, orderId);
    const states = Object.fromEntries(
      released.seats.map((s) => [s.email, s.state])
    );
    expect(states).toEqual({
      "alyssa@example.test": "active",
      "ben@example.test": "held",
    });
    expect(released.assigned).toHaveLength(1);
    const releasedAt = released.seats.find(
      (s) => s._id === alyssa._id
    )?.settledAt;

    await f.adminClient.mutation(api.registrationGroups.recordInvoicePayment, {
      id: invoiceId,
      reason: "ACH",
    });
    const paid = await fulfillment(f, orderId);
    expect(paid.seats.every((s) => s.state === "active")).toBe(true);
    expect(paid.assigned).toHaveLength(2);
    expect(paid.entitlements).toHaveLength(4);
    expect(
      paid.seatJobs.filter((j) => j.key.startsWith("confirmation:"))
    ).toHaveLength(2);
    expect(paid.seats.find((s) => s._id === alyssa._id)?.settledAt).toBe(
      releasedAt
    );
  });

  it("keeps released access when payment lands on a since-disabled coupon", async () => {
    const f = await fixture();
    const { orderId, invoiceId } = await invoicedOrder(f);
    await f.t.run(async (ctx) => {
      const couponId = await ctx.db.insert("registrationCoupons", {
        code: "YMCA10",
        type: "percent",
        amount: 10,
        materialIds: [],
        allMaterials: false,
        courseIds: [],
        expires: Date.now() + DAY,
        limit: 10,
        reserved: 1,
        consumed: 0,
        disabled: false,
      });
      await ctx.db.patch(orderId, { couponId, couponUses: 1 });
    });
    await release(f, { orderId, reason: "Early access" });
    const released = await fulfillment(f, orderId);
    await f.t.run(async (ctx) => {
      const order = await ctx.db.get(orderId);
      if (order?.couponId) {
        await ctx.db.patch(order.couponId, { disabled: true });
      }
    });

    await f.adminClient.mutation(api.registrationGroups.recordInvoicePayment, {
      id: invoiceId,
      reason: "Check #2001",
    });
    const paid = await fulfillment(f, orderId);
    expect(paid.order?.status).toBe("exception");
    expect(paid.seats.map((s) => s.state)).toEqual(["active"]);
    expect(paid.entitlements.map((e) => e.state)).toEqual(
      released.entitlements.map((e) => e.state)
    );
    expect(paid.assigned.map((c) => c._id)).toEqual(
      released.assigned.map((c) => c._id)
    );
  });

  it("keeps access and flags follow-up when the invoice is voided, and never hides the order", async () => {
    const f = await fixture();
    const { orderId, invoiceId } = await invoicedOrder(f);
    await release(f, { orderId, reason: "Early access" });
    const released = await fulfillment(f, orderId);

    await f.adminClient.mutation(api.registrationGroups.voidInvoice, {
      id: invoiceId,
      reason: "Wrong bill-to",
    });
    const voided = await fulfillment(f, orderId);
    expect((await f.t.run((ctx) => ctx.db.get(invoiceId)))?.status).toBe(
      "void"
    );
    expect(voided.order?.status).toBe("unpaid");
    expect(voided.seats.map((s) => s.state)).toEqual(["active"]);
    expect(voided.entitlements.map((e) => e.state)).toEqual(
      released.entitlements.map((e) => e.state)
    );
    expect(voided.assigned).toHaveLength(1);
    expect(voided.order?.releaseFollowUp).toMatchObject({
      actor: f.admin,
      reason: expect.stringContaining("Wrong bill-to"),
    });
    expect(voided.activity.map((row) => row.action)).toContain(
      "released-access-follow-up"
    );
    // A lapsed card hold would release the order and cancel the seats.
    await expect(
      f.adminClient.mutation(api.registrationPayments.createPaymentLink, {
        orderId,
        requestKey: crypto.randomUUID(),
      })
    ).rejects.toThrow("released before payment");
    await expect(
      f.adminClient.mutation(api.registrationPayments.requestPayment, {
        orderId,
        requestId: crypto.randomUUID(),
      })
    ).rejects.toThrow("released before payment");

    await f.adminClient.mutation(api.registrationGroups.createInvoice, {
      orderId,
      ...bill,
    });
    expect(
      (await f.t.run((ctx) => ctx.db.get(orderId)))?.releaseFollowUp
    ).toBeUndefined();

    // Canceling outright is an explicit staff decision; the abandoned
    // checkout filter still shows the order and its attendee.
    const [seat] = voided.seats;
    if (!seat) {
      throw new Error("Missing seat");
    }
    await f.adminClient.mutation(api.registrationOperations.cancelSeat, {
      seatId: seat._id,
      reason: "YMCA withdrew",
      notify: false,
    });
    const orders = await f.adminClient.query(
      api.registrationOperations.orders,
      { paginationOpts: PAGE }
    );
    expect(orders.page.map((o) => o._id)).toContain(orderId);
    const roster = await f.adminClient.query(
      api.registrationOperations.roster,
      { sessionId: f.session, paginationOpts: PAGE }
    );
    expect(roster.page.map((s) => s._id)).toContain(seat._id);
  });

  it("flags follow-up when Stripe voids the invoice", async () => {
    const f = await fixture();
    const { orderId, stripeInvoiceId } = await invoicedOrder(f);
    await release(f, { orderId, reason: "Early access" });
    await f.t.mutation(internal.registrationGroups.invoiceClosedEvent, {
      eventId: "evt_void",
      stripeInvoiceId,
      type: "invoice.voided",
    });
    const order = await f.t.run((ctx) => ctx.db.get(orderId));
    expect(order?.releaseFollowUp?.actor).toBe("system");
    expect(order?.status).toBe("unpaid");
  });

  it("is staff-only and needs a reason, an unpaid order, and an open invoice", async () => {
    const f = await fixture();
    const { orderId, invoiceId } = await invoicedOrder(f);
    const other = await invoicedOrder(f, ["other@example.test"]);
    const [otherSeat] = (await fulfillment(f, other.orderId)).seats;
    const args = { orderId, reason: "Early access" };
    await expect(
      f.t.mutation(api.registrationOperations.releaseUnpaidAccess, args)
    ).rejects.toThrow("Verified staff sign-in required");
    await expect(
      f.instructorClient.mutation(
        api.registrationOperations.releaseUnpaidAccess,
        args
      )
    ).rejects.toThrow("Forbidden");
    await expect(
      f.studentClient.mutation(
        api.registrationOperations.releaseUnpaidAccess,
        args
      )
    ).rejects.toThrow("Forbidden");
    await expect(release(f, { orderId, reason: "  " })).rejects.toThrow(
      "Reason required"
    );
    await expect(
      release(f, { ...args, seatIds: otherSeat ? [otherSeat._id] : [] })
    ).rejects.toThrow("Choose attendees on this order");
    expect(
      (await fulfillment(f, orderId)).seats.every((s) => s.state === "held")
    ).toBe(true);

    await f.adminClient.mutation(api.registrationGroups.voidInvoice, {
      id: invoiceId,
      reason: "Re-quote",
    });
    await expect(release(f, args)).rejects.toThrow("Create an invoice first");

    await f.adminClient.mutation(api.registrationOperations.recordPayment, {
      orderId,
      source: "offline",
      reason: "Cash",
    });
    await expect(release(f, args)).rejects.toThrow("unpaid registration order");
  });

  it("is available to the Captain as the release_unpaid_access MCP tool", async () => {
    const f = await fixture();
    const { orderId } = await invoicedOrder(f);
    const server = createMcpServer({
      convex: f.adminClient as unknown as ConvexHttpClient,
      actor: { userId: f.admin, email: ADMIN_EMAILS[0], label: "MCP test" },
      siteUrl: "https://example.test",
    });
    const client = new Client({ name: "release-test", version: "1" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const result = await client.callTool({
        name: "release_unpaid_access",
        arguments: { orderId, reason: "Captain on Evan's request" },
      });
      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toEqual({
        orderId,
        released: 1,
        alreadyReleased: 0,
      });
    } finally {
      await client.close();
    }
    const order = await f.t.run((ctx) => ctx.db.get(orderId));
    expect(order?.status).toBe("unpaid");
    expect(order?.releasedBeforePayment?.reason).toBe(
      "Captain on Evan's request"
    );
  });
});
