import { convexTest } from "convex-test";
import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import {
  completion,
  csv,
  effective,
  inventoryPreview,
  quote,
} from "../../shared/registration/domain";
import { recurrence } from "../../shared/registration/schedule";

afterEach(() => vi.unstubAllEnvs());

const modules = import.meta.glob("../../convex/**/*.ts");
const config = {
  tuition: 10_000,
  materials: [],
  questions: [],
  outcomes: [],
  emails: [],
  cutoffMinutes: 0,
};
async function fixture(capacity = 3) {
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
    const outsider = await ctx.db.insert("users", {
      email: "other@example.test",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("profiles", { userId: instructor, isInstructor: true });
    await ctx.db.insert("profiles", { userId: outsider, isInstructor: true });
    const material = await ctx.db.insert("registrationMaterials", {
      title: "Online code",
      kind: "keycode",
      version: 1,
      archived: false,
    });
    const course = await ctx.db.insert("registrationCourses", {
      slug: "blended",
      title: "Blended course",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      settings: config,
      enrollmentOpen: true,
      revision: 1,
    });
    const session = await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "Test class",
      code: "test-stable-code",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "first",
          start: Date.now() + 86_400_000,
          end: Date.now() + 90_000_000,
          location: "Training center",
          instructions: "Private",
          sequence: 0,
        },
      ],
      firstStart: Date.now() + 86_400_000,
      lastEnd: Date.now() + 90_000_000,
      overrides: {},
      revision: 1,
      instructors: [instructor],
      offerMinutes: 1440,
    });
    return { admin, instructor, outsider, course, session, material };
  });
  return {
    t,
    ...ids,
    adminClient: t.withIdentity({ subject: `${ids.admin}|session` }),
    instructorClient: t.withIdentity({ subject: `${ids.instructor}|session` }),
    outsiderClient: t.withIdentity({ subject: `${ids.outsider}|session` }),
  };
}
const seat = (email: string) => ({
  name: "Student",
  email,
  selected: [],
  waived: [],
  answers: [],
});
function attempt(
  courseId: Awaited<ReturnType<typeof fixture>>["course"],
  sessionId: Awaited<ReturnType<typeof fixture>>["session"],
  address = "student@example.test"
) {
  return {
    courseId,
    sessionId,
    requestKey: crypto.randomUUID(),
    purchaser: "buyer@example.test",
    purchaserName: "Buyer",
    attendees: [seat(address)],
  };
}

describe("Registration transactions", () => {
  it("allows only one concurrent last-seat reservation and expires it without leaks", async () => {
    const f = await fixture(1);
    const results = await Promise.allSettled([
      f.t.mutation(api.registration.reserve, attempt(f.course, f.session)),
      f.t.mutation(
        api.registration.reserve,
        attempt(f.course, f.session, "second@example.test")
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await f.t.run(async (ctx) => {
      const order = await ctx.db.query("registrationOrders").first();
      if (order) {
        await ctx.db.patch(order._id, { expires: Date.now() - 1 });
      }
    });
    await f.t.mutation(internal.registrationPayments.expire, {});
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(0);
  });
  it("rejects normalized duplicate attendee emails, including simultaneous attempts", async () => {
    const f = await fixture();
    await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
    await expect(
      f.t.mutation(
        api.registration.reserve,
        attempt(f.course, f.session, " STUDENT@example.test ")
      )
    ).rejects.toThrow("already");
    await expect(
      f.t.mutation(api.registration.reserve, {
        ...attempt(f.course, f.session),
        attendees: [seat("same@example.test"), seat("Same@example.test")],
      })
    ).rejects.toThrow("distinct");
  });
  it("reserves a coupon by discounted seats and fulfills signed-payment facts only once", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.insert("registrationCoupons", {
        code: "TWO",
        type: "percent",
        amount: 100,
        materialIds: [],
        allMaterials: false,
        courseIds: [],
        expires: Date.now() + 86_400_000,
        limit: 2,
        reserved: 0,
        consumed: 0,
        disabled: false,
      });
    });
    const order = await f.t.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      coupon: "TWO",
      attendees: [
        seat("a@example.test"),
        seat("b@example.test"),
        seat("c@example.test"),
      ],
    });
    expect(order.total).toBe(10_000);
    await f.t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session: "cs_test",
      url: "https://checkout.stripe.com/test",
    });
    const event = {
      orderId: order.orderId,
      session: "cs_test",
      eventId: "evt_test",
      amount: 10_000,
      currency: "usd",
      paid: true,
      live: false,
      type: "checkout.session.completed",
      paymentIntent: "pi_test",
    };
    await expect(
      f.t.mutation(internal.registrationPayments.paymentEvent, {
        ...event,
        amount: 1,
      })
    ).rejects.toThrow("quote");
    await f.t.mutation(internal.registrationPayments.paymentEvent, event);
    await f.t.mutation(internal.registrationPayments.paymentEvent, event);
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationCoupons").first())?.consumed
      )
    ).toBe(2);
    expect(
      await f.t.run(
        async (ctx) => (await ctx.db.query("registrationJobs").collect()).length
      )
    ).toBe(4);
  });
  it("keeps outcomes and private answers out of purchaser access and rejects unassigned staff", async () => {
    const f = await fixture();
    await expect(
      f.outsiderClient.query(api.registrationOperations.roster, {
        sessionId: f.session,
        paginationOpts: { cursor: null, numItems: 20 },
      })
    ).rejects.toThrow("Forbidden");
    expect(
      (
        await f.instructorClient.query(api.registrationOperations.roster, {
          sessionId: f.session,
          paginationOpts: { cursor: null, numItems: 20 },
        })
      ).page
    ).toEqual([]);
    await expect(
      f.t.query(api.registrationPortal.registrations, {
        paginationOpts: { cursor: null, numItems: 20 },
      })
    ).rejects.toThrow("Verified");
  });
  it("free settlement creates missing entitlements and restock assigns one code once", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          tuition: 0,
          materials: [
            {
              id: "code",
              materialId: f.material,
              title: "Online",
              policy: "included",
              cents: 0,
            },
          ],
        },
      });
    });
    const result = await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session)
    );
    expect(result.status).toBe("settled");
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationEntitlements").first())?.state
      )
    ).toBe("pending");
    await f.adminClient.mutation(api.registrationOperations.addStock, {
      materialId: f.material,
      input:
        "https://codes.example.test/one\nhttps://codes.example.test/one\njavascript:alert(1)",
      preview: false,
    });
    await f.t.mutation(internal.registrationOperations.restock, {
      materialId: f.material,
    });
    await f.t.mutation(internal.registrationOperations.restock, {
      materialId: f.material,
    });
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationAssignments").collect()).length
      )
    ).toBe(1);
  });
});
describe("Pricing and privacy utilities", () => {
  it("preserves empty and zero overrides", () => {
    expect(effective(config, { tuition: 0, materials: [] }).tuition).toBe(0);
  });
  it("never treats absent rules or values as passing", () => {
    expect(completion([], [])).toBe("not-evaluated");
    expect(
      completion(
        [
          {
            id: "exam",
            title: "Exam",
            type: "percentage",
            required: true,
            minimum: 80,
            options: [],
            version: 1,
          },
        ],
        []
      )
    ).toBe("incomplete");
  });
  it("rejects unsafe links and neutralizes CSV formulas", () => {
    expect(
      inventoryPreview(
        "javascript:alert(1)\nhttps://example.test/one\nhttps://example.test/one"
      ).duplicates
    ).toHaveLength(1);
    expect(csv([["=1+1"]])).toBe('"\'=1+1"');
  });
  it("recurs at the same local time across daylight saving", () => {
    const dates = recurrence({
      startDate: "2026-03-01",
      endDate: "2026-03-15",
      weekdays: [7],
      timeZone: "America/Los_Angeles",
      meetings: [{ dayOffset: 0, startTime: "09:00", endTime: "10:00" }],
    });
    expect(dates).toHaveLength(3);
    expect(dates[1]?.[0]?.start).toBe(Date.parse("2026-03-08T16:00:00Z"));
  });
});

describe("Operational acceptance", () => {
  it("preserves stable short links and explicit empty overrides across template edits", async () => {
    const f = await fixture();
    const original = await f.t.run((ctx) => ctx.db.get(f.session));
    if (!original) {
      throw new Error("Fixture missing");
    }
    const {
      _id,
      _creationTime,
      code,
      state,
      reserved,
      revision,
      firstStart,
      lastEnd,
      ...editable
    } = original;
    await f.adminClient.mutation(api.registration.saveSession, {
      ...editable,
      id: _id,
      notify: false,
      title: "Renamed",
      overrides: { tuition: 0, materials: [] },
    });
    const detail = await f.t.query(api.registration.detail, { code });
    expect(detail?.title).toBe("Renamed");
    expect(detail?.config.tuition).toBe(0);
    expect(detail?.config.outcomes).toEqual([]);
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, {
        settings: { ...config, tuition: 50_000 },
      });
    });
    expect(
      (await f.t.query(api.registration.detail, { code }))?.config.tuition
    ).toBe(0);
  });
  it("blocks public cutoff while allowing audited admin overbooking and unpaid withholding", async () => {
    const f = await fixture(1);
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.session, { firstStart: Date.now() - 1 });
    });
    await expect(
      f.t.mutation(api.registration.reserve, attempt(f.course, f.session))
    ).rejects.toThrow("closed");
    const unpaid = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      attendees: [seat("one@example.test"), seat("two@example.test")],
      admin: {
        overbook: true,
        reason: "Test capacity override",
        payment: "unpaid",
      },
    });
    expect(unpaid.status).toBe("unpaid");
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(2);
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationEntitlements").collect()).length
      )
    ).toBe(0);
    await f.adminClient.mutation(api.registrationOperations.recordPayment, {
      orderId: unpaid.orderId,
      source: "waived",
      reason: "Test waiver",
    });
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(unpaid.orderId))?.status)
    ).toBe("settled");
  });
  it("does not overbook when a payment arrives after expiration", async () => {
    const f = await fixture(1);
    const first = await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session)
    );
    await f.t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: first.orderId,
      session: "cs_late",
      url: "https://checkout.stripe.com/test",
    });
    await f.t.run(async (ctx) => {
      await ctx.db.patch(first.orderId, { expires: Date.now() - 1 });
    });
    await f.t.mutation(internal.registrationPayments.expire, {});
    await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session, "other@example.test")
    );
    await f.t.mutation(internal.registrationPayments.paymentEvent, {
      orderId: first.orderId,
      session: "cs_late",
      eventId: "evt_late",
      amount: 10_000,
      currency: "usd",
      paid: true,
      live: false,
      type: "checkout.session.completed",
    });
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(first.orderId))?.status)
    ).toBe("exception");
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(1);
  });
  it("exchanges waitlist capacity without double counting and rejects invitation theft", async () => {
    const f = await fixture(1);
    const offer = await f.t.run(async (ctx) => {
      const tokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode("test-invitation")
      );
      await ctx.db.patch(f.session, { reserved: 1 });
      return await ctx.db.insert("registrationWaitlist", {
        sessionId: f.session,
        email: "invited@example.test",
        name: "Invited",
        state: "offered",
        tokenHash: Array.from(new Uint8Array(tokenHash), (b) =>
          b.toString(16).padStart(2, "0")
        ).join(""),
        expires: Date.now() + 60_000,
      });
    });
    await expect(
      f.t.mutation(api.registration.reserve, {
        ...attempt(f.course, f.session),
        invitation: "test-invitation",
      })
    ).rejects.toThrow("Invitation");
    await f.t.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session, "invited@example.test"),
      invitation: "test-invitation",
    });
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(1);
    expect(await f.t.run(async (ctx) => (await ctx.db.get(offer))?.state)).toBe(
      "accepted"
    );
  });
  it("requires possession of a valid unconsumed portal token and scopes purchaser data", async () => {
    const f = await fixture();
    const token = "secure-test-challenge";
    const digest = async (value: string) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
        ),
        (b) => b.toString(16).padStart(2, "0")
      ).join("");
    await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
    await f.t.mutation(internal.registrationPortal.issue, {
      email: "buyer@example.test",
      tokenHash: await digest(token),
    });
    expect(
      await f.t.mutation(api.registrationPortal.exchange, {
        token: "wrong",
        grantHash: await digest("grant"),
      })
    ).toBe(false);
    expect(
      await f.t.mutation(api.registrationPortal.exchange, {
        token,
        grantHash: await digest("grant"),
      })
    ).toBe(true);
    expect(
      await f.t.mutation(api.registrationPortal.exchange, {
        token,
        grantHash: await digest("other"),
      })
    ).toBe(false);
    const orders = await f.t.query(api.registrationPortal.orders, {
      grant: "grant",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(orders.page).toHaveLength(1);
    expect(JSON.stringify(orders)).not.toContain("outcome");
    expect(JSON.stringify(orders)).not.toContain("answers");
    const own = await f.t.query(api.registrationPortal.registrations, {
      grant: "grant",
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(own.page).toHaveLength(0);
  });
  it("caps concurrent refund intents to remaining payment and leaves coupon usage unchanged", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { overbook: false, reason: "Test", payment: "offline" },
    });
    await f.t.run(async (ctx) => {
      await ctx.db.patch(order.orderId, { paymentIntent: "pi_test" });
    });
    const results = await Promise.allSettled([
      f.adminClient.mutation(api.registrationPayments.requestRefund, {
        orderId: order.orderId,
        cents: 7000,
        key: crypto.randomUUID(),
        reason: "Test",
      }),
      f.adminClient.mutation(api.registrationPayments.requestRefund, {
        orderId: order.orderId,
        cents: 7000,
        key: crypto.randomUUID(),
        reason: "Test",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const intent = await f.t.run(
      async (ctx) => await ctx.db.query("registrationRefunds").first()
    );
    if (!intent) {
      throw new Error("Intent missing");
    }
    expect(intent.allocations?.reduce((sum, a) => sum + a.cents, 0)).toBe(7000);
    expect(intent.allocations?.[0]?.lineId).toBe("tuition");
    await f.t.mutation(internal.registrationPayments.finishRefund, {
      id: intent._id,
      stripeId: "re_test",
    });
    await f.t.mutation(internal.registrationPayments.finishRefund, {
      id: intent._id,
      stripeId: "re_test",
    });
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(order.orderId))?.refunded)
    ).toBe(7000);
  });
  it("rejects invalid signatures before payment state can change", async () => {
    const f = await fixture();
    const response = await f.t.fetch("/registration/stripe", {
      method: "POST",
      headers: { "stripe-signature": "invalid" },
      body: "{}",
    });
    expect(response.status).toBe(400);
  });
});

describe("Payment and material policies", () => {
  it("demonstrates the approved $130, $110, $125, $25 and $0 examples", async () => {
    const f = await fixture();
    const pricing = {
      ...config,
      materials: [
        {
          id: "included",
          materialId: f.material,
          title: "Included",
          policy: "included" as const,
          cents: 1000,
        },
        {
          id: "waivable",
          materialId: f.material,
          title: "Waivable",
          policy: "waivable" as const,
          cents: 2000,
        },
        {
          id: "optional",
          materialId: f.material,
          title: "Optional",
          policy: "optional" as const,
          cents: 1500,
        },
      ],
    };
    const attendee = seat("test@example.test");
    const coupon = {
      code: "FULL",
      type: "percent" as const,
      amount: 100,
      materialIds: [],
      allMaterials: false,
      courseIds: [],
      expires: Date.now() + 1000,
      limit: 2,
      reserved: 0,
      consumed: 0,
      disabled: false,
    };
    expect(quote(pricing, [attendee], null, 0)[0]?.total).toBe(13_000);
    expect(
      quote(pricing, [{ ...attendee, waived: ["waivable"] }], null, 0)[0]?.total
    ).toBe(11_000);
    const choices = {
      ...attendee,
      waived: ["waivable"],
      selected: ["optional"],
    };
    expect(quote(pricing, [choices], null, 0)[0]?.total).toBe(12_500);
    expect(quote(pricing, [choices], coupon, 2)[0]?.total).toBe(2500);
    expect(
      quote(pricing, [choices], { ...coupon, allMaterials: true }, 2)[0]?.total
    ).toBe(0);
    expect(() =>
      quote(pricing, [{ ...attendee, waived: ["included"] }], null, 0)
    ).toThrow("waivable");
  });
  it("verifies a real Stripe HMAC signature, rejects a tampered payload and deduplicates replay", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_signature_only");
    vi.stubEnv("REGISTRATION_STRIPE_WEBHOOK_SECRET", "whsec_local_acceptance");
    const f = await fixture();
    const order = await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session)
    );
    await f.t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session: "cs_signed",
      url: "https://checkout.stripe.com/test",
    });
    const payload = JSON.stringify({
      id: "evt_signed",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_signed",
          metadata: { registrationOrder: order.orderId },
          amount_total: 10_000,
          currency: "usd",
          payment_status: "paid",
          livemode: false,
          payment_intent: "pi_signed",
        },
      },
    });
    const signature = new Stripe(
      "sk_test_local_signature_only"
    ).webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_local_acceptance",
    });
    const options = {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    };
    expect(
      (
        await f.t.fetch("/registration/stripe", {
          ...options,
          body: `${payload} `,
        })
      ).status
    ).toBe(400);
    expect((await f.t.fetch("/registration/stripe", options)).status).toBe(200);
    expect((await f.t.fetch("/registration/stripe", options)).status).toBe(200);
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(order.orderId))?.status)
    ).toBe("settled");
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationEvents").collect()).length
      )
    ).toBe(1);
  });
  it("propagates included materials only into paid upcoming inheriting sessions", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { overbook: false, payment: "offline", reason: "Test" },
    });
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          materials: [
            {
              id: "new",
              materialId: f.material,
              title: "New included material",
              policy: "included",
              cents: 500,
            },
          ],
        },
      });
    });
    await f.t.mutation(internal.registrationOperations.propagate, {
      courseId: f.course,
      cursor: null,
    });
    await f.t.mutation(internal.registrationOperations.propagate, {
      courseId: f.course,
      cursor: null,
    });
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationEntitlements").collect()).length
      )
    ).toBe(1);
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(order.orderId))?.total)
    ).toBe(10_000);
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.session, { firstStart: Date.now() - 1 });
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          materials: [
            {
              id: "late",
              materialId: f.material,
              title: "Late addition",
              policy: "included",
              cents: 0,
            },
          ],
        },
      });
    });
    await f.t.mutation(internal.registrationOperations.propagate, {
      courseId: f.course,
      cursor: null,
    });
    expect(
      await f.t.run(
        async (ctx) =>
          (await ctx.db.query("registrationEntitlements").collect()).length
      )
    ).toBe(1);
  });
  it("transfers a settled seat at higher price while preserving history and withholding new fulfillment", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { overbook: false, payment: "offline", reason: "Test" },
    });
    const target = await f.t.run(async (ctx) => {
      const source = await ctx.db.get(f.session);
      if (!source) {
        throw new Error("Missing session");
      }
      const { _id, _creationTime, ...value } = source;
      return await ctx.db.insert("registrationSessions", {
        ...value,
        code: "target",
        reserved: 0,
        overrides: { tuition: 15_000 },
      });
    });
    const source = await f.t.run(
      async (ctx) =>
        await ctx.db
          .query("registrationSeats")
          .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
          .first()
    );
    if (!source) {
      throw new Error("Missing seat");
    }
    const result = await f.adminClient.mutation(
      api.registrationTransfers.transfer,
      {
        seatId: source._id,
        sessionId: target,
        choice: "collect",
        reason: "Test transfer",
        requestKey: crypto.randomUUID(),
      }
    );
    expect(result.adjustment).toBe(5000);
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(result.orderId))?.status)
    ).toBe("unpaid");
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(source._id))?.state)
    ).toBe("transferred");
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(0);
  });
});

describe("Operational regression coverage", () => {
  it("cancellation clears pending material demand and restock cannot fulfill the canceled seat", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          tuition: 0,
          materials: [
            {
              id: "code",
              materialId: f.material,
              title: "Code",
              policy: "included",
              cents: 0,
            },
          ],
        },
      });
    });
    await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
    const original = await f.t.run(
      async (ctx) => await ctx.db.query("registrationSeats").first()
    );
    if (!original) {
      throw new Error("Missing registration");
    }
    await f.adminClient.mutation(api.registrationOperations.cancelSeat, {
      seatId: original._id,
      reason: "Test cancellation",
      notify: false,
    });
    await f.adminClient.mutation(api.registrationOperations.addStock, {
      materialId: f.material,
      input: "https://codes.example.test/cancellation",
      preview: false,
    });
    await f.t.mutation(internal.registrationOperations.restock, {
      materialId: f.material,
    });
    const state = await f.t.run(async (ctx) => ({
      entitlement: await ctx.db.query("registrationEntitlements").first(),
      code: await ctx.db.query("registrationCodes").first(),
    }));
    expect(state.entitlement?.state).toBe("canceled");
    expect(state.code?.state).toBe("available");
  });
  it("rescheduling with notifications suppressed still replaces pending reminder jobs", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          tuition: 0,
          emails: [
            {
              id: "reminder",
              anchor: "first",
              offsetMinutes: -60,
              subject: "Reminder",
              body: "Hello {{attendeeName}}",
            },
          ],
        },
      });
    });
    await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
    await f.t.run(async (ctx) => {
      const session = await ctx.db.get(f.session);
      if (session) {
        await ctx.db.patch(f.session, {
          revision: 2,
          firstStart: session.firstStart + 86_400_000,
        });
      }
    });
    await f.t.mutation(internal.registrationOperations.reschedule, {
      sessionId: f.session,
      notify: false,
      cursor: null,
    });
    const jobs = await f.t.run(
      async (ctx) => await ctx.db.query("registrationJobs").collect()
    );
    expect(
      jobs.filter((j) => j.stepId === "reminder" && j.state === "pending")
    ).toHaveLength(1);
    expect(
      jobs.filter((j) => j.stepId === "reminder" && j.state === "canceled")
    ).toHaveLength(1);
    expect(jobs.some((j) => j.key.startsWith("schedule:"))).toBe(false);
  });
  it("email leases prevent parallel delivery and exhaust retries into attention", async () => {
    const f = await fixture();
    const job = await f.t.run(
      async (ctx) =>
        await ctx.db.insert("registrationJobs", {
          key: "test-lease",
          kind: "email",
          recipient: "safe@example.test",
          subject: "Test",
          body: "Test",
          due: Date.now(),
          attempts: 4,
          state: "pending",
        })
    );
    const claims = await Promise.all([
      f.t.mutation(internal.registrationMail.claim, { id: job }),
      f.t.mutation(internal.registrationMail.claim, { id: job }),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await f.t.mutation(internal.registrationMail.result, {
      id: job,
      success: false,
      error: "Provider unavailable",
    });
    const attention = await f.adminClient.query(
      api.registrationOperations.attention,
      {}
    );
    expect(attention.emails.map((j) => j._id)).toContain(job);
    expect(
      await f.t.mutation(internal.registrationMail.claim, { id: job })
    ).toBeNull();
  });
  it("rejects duplicate and unknown answers and preserves explicit policy acceptance", () => {
    const settings = {
      ...config,
      questions: [
        {
          id: "policy",
          title: "Policy",
          type: "checkbox" as const,
          required: true,
          options: [],
          version: 2,
          policyUrl: "https://example.test/policy",
        },
      ],
    };
    expect(() =>
      quote(
        settings,
        [
          {
            ...seat("one@example.test"),
            answers: [
              { id: "policy", value: true },
              { id: "policy", value: false },
            ],
          },
        ],
        null,
        0
      )
    ).toThrow();
    expect(() =>
      quote(
        settings,
        [
          {
            ...seat("one@example.test"),
            answers: [
              { id: "policy", value: true },
              { id: "extra", value: "bad" },
            ],
          },
        ],
        null,
        0
      )
    ).toThrow();
    const result = quote(
      settings,
      [
        {
          ...seat("one@example.test"),
          answers: [{ id: "policy", value: true }],
        },
      ],
      null,
      0
    );
    expect(result[0]?.questions[0]?.version).toBe(2);
    expect(result[0]?.acceptedAt).toBeGreaterThan(0);
  });
});

describe("Shared development service settings", () => {
  it("rejects a live shared Stripe key before creating checkout", async () => {
    const f = await fixture();
    const args = attempt(f.course, f.session);
    const order = await f.t.mutation(api.registration.reserve, args);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_local_rejection_fixture");
    await expect(
      f.t.action(api.registrationExternal.checkout, {
        orderId: order.orderId,
        requestKey: args.requestKey,
      })
    ).rejects.toThrow("Configure STRIPE_SECRET_KEY with a test key");
  });
  it("reuses the auth sender and website origin while forcing portal mail to the safe recipient", async () => {
    const f = await fixture();
    vi.stubEnv("SITE_URL", "https://preview.example.test");
    vi.stubEnv("AUTH_EMAIL_FROM", "Training <sender@example.test>");
    vi.stubEnv("RESEND_API_KEY", "re_local_mock_only");
    vi.stubEnv("REGISTRATION_TEST_RECIPIENT", "safe@example.test");
    const send = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "local-email" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    try {
      await f.t.action(api.registrationExternal.requestPortal, {
        email: "student@example.test",
      });
      expect(send).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(send.mock.calls[0]?.[1]?.body));
      expect(body.to).toBe("safe@example.test");
      expect(body.from).toBe("Training <sender@example.test>");
      expect(body.text).toContain(
        "https://preview.example.test/registrations/access#"
      );
    } finally {
      send.mockRestore();
    }
  });
});
