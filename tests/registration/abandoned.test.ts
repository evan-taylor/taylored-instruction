import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";

const modules = import.meta.glob("../../convex/**/*.ts");
const PAGE = { numItems: 100, cursor: null };

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    });
    const course = await ctx.db.insert("registrationCourses", {
      slug: "bls",
      title: "BLS",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      settings: {
        tuition: 10_000,
        materials: [],
        questions: [],
        outcomes: [],
        emails: [],
        cutoffMinutes: 0,
      },
      enrollmentOpen: true,
      revision: 1,
    });
    const session = await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "BLS class",
      code: "bls-class",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 20,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "first",
          start: Date.now() + 86_400_000,
          end: Date.now() + 90_000_000,
          location: "Training center",
          instructions: "",
          sequence: 0,
        },
      ],
      firstStart: Date.now() + 86_400_000,
      lastEnd: Date.now() + 90_000_000,
      overrides: {},
      revision: 1,
      instructors: [],
      offerMinutes: 1440,
    });
    return { admin, course, session };
  });
  const adminClient = t.withIdentity({ subject: `${ids.admin}|session` });

  async function reserve(name: string) {
    const requestKey = crypto.randomUUID();
    const order = await t.mutation(api.registration.reserve, {
      courseId: ids.course,
      sessionId: ids.session,
      requestKey,
      purchaser: `${name}-buyer@example.test`,
      purchaserName: name,
      attendees: [
        {
          name,
          email: `${name}@example.test`,
          selected: [],
          waived: [],
          answers: [],
        },
      ],
    });
    await t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session: `cs_${name}`,
      secret: "secret",
    });
    return { ...order, requestKey, name };
  }
  async function stripeEvent(
    order: Awaited<ReturnType<typeof reserve>>,
    type: string
  ) {
    await t.mutation(internal.registrationPayments.paymentEvent, {
      orderId: order.orderId,
      session: `cs_${order.name}`,
      eventId: `evt_${order.name}_${type}`,
      amount: order.total,
      currency: "usd",
      paid: type === "checkout.session.completed",
      live: false,
      type,
    });
  }
  const pay = (order: Awaited<ReturnType<typeof reserve>>) =>
    stripeEvent(order, "checkout.session.completed");
  async function seatOf(orderId: Id<"registrationOrders">) {
    const seat = await t.run((ctx) =>
      ctx.db
        .query("registrationSeats")
        .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
        .first()
    );
    if (!seat) {
      throw new Error("Seat missing");
    }
    return seat;
  }
  async function cancel(orderId: Id<"registrationOrders">, reason: string) {
    await adminClient.mutation(api.registrationOperations.cancelSeat, {
      seatId: (await seatOf(orderId))._id,
      reason,
      notify: false,
    });
  }

  const walkedAway = await reserve("walked-away");
  await t.mutation(api.registration.abandon, {
    orderId: walkedAway.orderId,
    requestKey: walkedAway.requestKey,
  });

  const timedOut = await reserve("timed-out");
  await t.run((ctx) =>
    ctx.db.patch(timedOut.orderId, { expires: Date.now() - 1 })
  );
  await t.mutation(internal.registrationPayments.expire, {});

  const stripeExpired = await reserve("stripe-expired");
  await stripeEvent(stripeExpired, "checkout.session.expired");

  const paid = await reserve("paid");
  await pay(paid);

  const paidThenCanceled = await reserve("paid-then-canceled");
  await pay(paidThenCanceled);
  await cancel(paidThenCanceled.orderId, "Customer asked");

  const paidThenRefunded = await reserve("paid-then-refunded");
  await pay(paidThenRefunded);
  await cancel(paidThenRefunded.orderId, "Refund requested");
  await t.run((ctx) =>
    ctx.db.patch(paidThenRefunded.orderId, {
      refunded: paidThenRefunded.total,
    })
  );

  const paidAfterRelease = await reserve("paid-after-release");
  await t.mutation(api.registration.abandon, {
    orderId: paidAfterRelease.orderId,
    requestKey: paidAfterRelease.requestKey,
  });
  await pay(paidAfterRelease);

  const inProgress = await reserve("in-progress");

  return {
    t,
    ...ids,
    adminClient,
    abandoned: [walkedAway, timedOut, stripeExpired],
    kept: [
      paid,
      paidThenCanceled,
      paidThenRefunded,
      paidAfterRelease,
      inProgress,
    ],
  };
}

const emailsOf = (seats: { email: string }[]) =>
  seats.map((seat) => seat.email).sort();
const attendeeEmails = (orders: { name: string }[]) =>
  orders.map((order) => `${order.name}@example.test`).sort();

describe("Abandoned checkouts", () => {
  it("are released before payment, while late payments keep a payment record", async () => {
    const f = await fixture();
    const orders = await f.t.run((ctx) =>
      ctx.db.query("registrationOrders").collect()
    );
    const byId = new Map(orders.map((order) => [order._id, order]));
    for (const order of f.abandoned) {
      expect(byId.get(order.orderId)?.status).toBe("expired");
      expect(byId.get(order.orderId)?.settledAt).toBeUndefined();
    }
    const late = byId.get(f.kept[3].orderId);
    expect(late?.status).toBe("exception");
    expect(late?.settledAt).toBeTypeOf("number");
  });

  it("never appear on the session roster, its exports, or its counts", async () => {
    const f = await fixture();
    const roster = await f.adminClient.query(
      api.registrationOperations.roster,
      { sessionId: f.session, paginationOpts: PAGE }
    );
    expect(emailsOf(roster.page)).toEqual(attendeeEmails(f.kept));
    expect(
      Object.fromEntries(roster.page.map((seat) => [seat.email, seat.state]))
    ).toEqual({
      "paid@example.test": "active",
      "paid-then-canceled@example.test": "canceled",
      "paid-then-refunded@example.test": "canceled",
      "paid-after-release@example.test": "canceled",
      "in-progress@example.test": "held",
    });

    const exported = await f.adminClient.query(
      api.registrationOperations.exportRoster,
      { sessionId: f.session, paginationOpts: PAGE }
    );
    for (const order of f.abandoned) {
      expect(exported.csv).not.toContain(`${order.name}@example.test`);
    }
    for (const order of f.kept) {
      expect(exported.csv).toContain(`${order.name}@example.test`);
    }

    const overview = await f.adminClient.query(api.mcp.sessionOverview, {
      sessionId: f.session,
    });
    expect(overview.seatCounts).toEqual({
      held: 1,
      active: 1,
      canceled: 3,
      transferred: 0,
    });
  });

  it("are hidden from the Orders tab unless staff opt in", async () => {
    const f = await fixture();
    const hidden = await f.adminClient.query(
      api.registrationOperations.orders,
      { paginationOpts: PAGE }
    );
    expect(hidden.page.map((order) => order._id).sort()).toEqual(
      f.kept.map((order) => order.orderId).sort()
    );

    const shown = await f.adminClient.query(api.registrationOperations.orders, {
      paginationOpts: PAGE,
      includeAbandoned: true,
    });
    expect(shown.page.map((order) => order._id).sort()).toEqual(
      [...f.kept, ...f.abandoned].map((order) => order.orderId).sort()
    );
  });

  it("are left out of the dashboard's recent orders", async () => {
    const f = await fixture();
    const summary = await f.adminClient.query(
      api.registrationDashboard.summary
    );
    expect(summary.recentOrders.map((order) => order._id).sort()).toEqual(
      f.kept.map((order) => order.orderId).sort()
    );
  });

  it("are hidden from email lookup unless staff opt in", async () => {
    const f = await fixture();
    const [walkedAway] = f.abandoned;
    const email = `${walkedAway.name}@example.test`;
    expect(
      await f.adminClient.query(api.registrationDashboard.lookup, { email })
    ).toEqual({ orders: [], seats: [] });
    const shown = await f.adminClient.query(api.registrationDashboard.lookup, {
      email,
      includeAbandoned: true,
    });
    expect(shown.orders.map((order) => order._id)).toEqual([
      walkedAway.orderId,
    ]);
    expect(shown.seats).toHaveLength(1);

    const refunded = await f.adminClient.query(
      api.registrationDashboard.lookup,
      { email: "paid-then-refunded@example.test" }
    );
    expect(refunded.orders).toHaveLength(1);
    expect(refunded.seats).toHaveLength(1);
  });
});
