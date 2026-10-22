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
  validateSettings,
} from "../../shared/registration/domain";
import { parseRoster, rosterSummary } from "../../shared/registration/roster";
import { recurrence } from "../../shared/registration/schedule";

afterEach(() => vi.unstubAllEnvs());

const modules = import.meta.glob("../../convex/**/*.ts");
const INVOICE_NUMBER = /^TI-\d{4}-\d{4}$/u;
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
  it("allows only staff to delete unused templates and preserves materials with an audit record", async () => {
    const f = await fixture();
    await f.t.run((ctx) => ctx.db.delete(f.session));
    await expect(
      f.t.mutation(api.registration.deleteCourse, { id: f.course })
    ).rejects.toThrow();
    await expect(
      f.instructorClient.mutation(api.registration.deleteCourse, {
        id: f.course,
      })
    ).rejects.toThrow();
    await f.adminClient.mutation(api.registration.deleteCourse, {
      id: f.course,
    });
    expect(await f.t.run((ctx) => ctx.db.get(f.course))).toBeNull();
    expect(await f.t.run((ctx) => ctx.db.get(f.material))).not.toBeNull();
    const activity = await f.t.run((ctx) =>
      ctx.db.query("registrationActivity").collect()
    );
    expect(activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "course-deleted",
          entity: f.course,
          actor: f.admin,
        }),
      ])
    );
    await expect(
      f.adminClient.mutation(api.registration.deleteCourse, { id: f.course })
    ).rejects.toThrow("no longer exists");
  });
  it("blocks deletion for sessions, orders, and seats independently", async () => {
    const f = await fixture();
    await expect(
      f.adminClient.mutation(api.registration.deleteCourse, { id: f.course })
    ).rejects.toThrow("Archive it instead");
    await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
    await f.t.run(async (ctx) => {
      await ctx.db.delete(f.session);
      const seats = await ctx.db.query("registrationSeats").collect();
      await Promise.all(seats.map((item) => ctx.db.delete(item._id)));
    });
    await expect(
      f.adminClient.mutation(api.registration.deleteCourse, { id: f.course })
    ).rejects.toThrow("Archive it instead");
    expect(await f.t.run((ctx) => ctx.db.get(f.course))).not.toBeNull();
  });
  it("blocks deletion when a coupon targets the template", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.delete(f.session);
      await ctx.db.insert("registrationCoupons", {
        code: "LEGACY",
        type: "percent",
        amount: 10,
        materialIds: [],
        allMaterials: false,
        courseIds: [f.course],
        expires: 0,
        limit: 0,
        reserved: 0,
        consumed: 0,
        disabled: true,
      });
    });
    await expect(
      f.adminClient.mutation(api.registration.deleteCourse, { id: f.course })
    ).rejects.toThrow("coupons");
    expect(await f.t.run((ctx) => ctx.db.get(f.course))).not.toBeNull();
  });
  it("preserves a template with seats even if its session and order are missing", async () => {
    const f = await fixture();
    await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
    await f.t.run(async (ctx) => {
      await ctx.db.delete(f.session);
      const orders = await ctx.db.query("registrationOrders").collect();
      await Promise.all(orders.map((item) => ctx.db.delete(item._id)));
    });
    await expect(
      f.adminClient.mutation(api.registration.deleteCourse, { id: f.course })
    ).rejects.toThrow("Archive it instead");
    expect(await f.t.run((ctx) => ctx.db.get(f.course))).not.toBeNull();
  });
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
  it("lets the purchaser abandon a hold early, but never a paid or foreign order", async () => {
    const f = await fixture(1);
    const args = attempt(f.course, f.session);
    const held = await f.t.mutation(api.registration.reserve, args);
    await f.t.mutation(api.registration.abandon, {
      orderId: held.orderId,
      requestKey: "wrong-key",
    });
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(1);
    await f.t.mutation(api.registration.abandon, {
      orderId: held.orderId,
      requestKey: args.requestKey,
    });
    const session = await f.t.run((ctx) => ctx.db.get(f.session));
    const order = await f.t.run((ctx) => ctx.db.get(held.orderId));
    expect(session?.reserved).toBe(0);
    expect(order?.status).toBe("expired");
    // The seat is free again for the next purchaser.
    await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session, "next@example.test")
    );
    await f.t.run(async (ctx) => {
      const latest = await ctx.db
        .query("registrationOrders")
        .order("desc")
        .first();
      if (latest) {
        await ctx.db.patch(latest._id, { status: "settled" });
      }
    });
    const latest = await f.t.run((ctx) =>
      ctx.db.query("registrationOrders").order("desc").first()
    );
    await f.t.mutation(api.registration.abandon, {
      orderId: latest?._id as Awaited<typeof held>["orderId"],
      requestKey: latest?.requestKey ?? "",
    });
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(1);
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
      secret: "cs_local_secret",
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
      secret: "cs_local_secret",
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
    const extraMaterials = await f.t.run(async (ctx) =>
      Promise.all(
        ["Waivable", "Optional"].map((title) =>
          ctx.db.insert("registrationMaterials", {
            title,
            kind: "link",
            version: 1,
            archived: false,
          })
        )
      )
    );
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
          materialId: extraMaterials[0] ?? f.material,
          title: "Waivable",
          policy: "waivable" as const,
          cents: 2000,
        },
        {
          id: "optional",
          materialId: extraMaterials[1] ?? f.material,
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
  it.each([false, true])(
    "verifies signatures and replay with live=%s",
    async (live) => {
      vi.stubEnv("REGISTRATION_MODE", live ? "live" : "test");
      vi.stubEnv(
        "STRIPE_SECRET_KEY",
        `sk_${live ? "live" : "test"}_local_signature_only`
      );
      vi.stubEnv(
        "REGISTRATION_STRIPE_WEBHOOK_SECRET",
        "whsec_local_acceptance"
      );
      const f = await fixture();
      const order = await f.t.mutation(
        api.registration.reserve,
        attempt(f.course, f.session)
      );
      await f.t.mutation(internal.registrationPayments.attachCheckout, {
        orderId: order.orderId,
        session: "cs_signed",
        secret: "cs_local_secret",
      });
      const payload = JSON.stringify({
        id: "evt_signed",
        type: "checkout.session.completed",
        livemode: live,
        data: {
          object: {
            id: "cs_signed",
            metadata: { registrationOrder: order.orderId },
            amount_total: 10_000,
            currency: "usd",
            payment_status: "paid",
            livemode: live,
            payment_intent: "pi_signed",
          },
        },
      });
      const signature = new Stripe(
        `sk_${live ? "live" : "test"}_local_signature_only`
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
      expect((await f.t.fetch("/registration/stripe", options)).status).toBe(
        200
      );
      expect((await f.t.fetch("/registration/stripe", options)).status).toBe(
        200
      );
      expect(
        await f.t.run(async (ctx) => (await ctx.db.get(order.orderId))?.status)
      ).toBe("settled");
      expect(
        await f.t.run(
          async (ctx) =>
            (await ctx.db.query("registrationEvents").collect()).length
        )
      ).toBe(1);
    }
  );
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

describe("Public catalog for marketing pages and search engines", () => {
  it("lists a course's open public sessions by slug or title keyword, honouring exclusions", async () => {
    const f = await fixture(5);
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, { title: "AHA BLS Provider" });
      const instructor = await ctx.db.insert("registrationCourses", {
        slug: "bls-instructor",
        title: "AHA BLS Instructor",
        description: "Teach BLS",
        delivery: "scheduled",
        publication: "published",
        settings: config,
        enrollmentOpen: true,
        revision: 1,
      });
      const session = await ctx.db.get(f.session);
      if (!session) {
        throw new Error("Missing session");
      }
      const { _id, _creationTime, ...fields } = session;
      await ctx.db.insert("registrationSessions", {
        ...fields,
        courseId: instructor,
        code: "instructor-code",
        title: "BLS Instructor class",
      });
      await ctx.db.insert("registrationSessions", {
        ...fields,
        code: "unlisted-code",
        title: "Private class",
        visibility: "private",
      });
    });
    const bySlug = await f.t.query(api.registration.upcomingClasses, {
      slugs: ["blended"],
      keywords: [],
    });
    expect(bySlug.courses.map((c) => c.slug)).toEqual(["blended"]);
    expect(bySlug.sessions.map((s) => s.code)).toEqual(["test-stable-code"]);
    expect(bySlug.sessions[0]?.price).toBe(10_000);
    const byKeyword = await f.t.query(api.registration.upcomingClasses, {
      slugs: [],
      keywords: ["bls"],
      exclude: ["instructor"],
    });
    expect(byKeyword.courses.map((c) => c.slug)).toEqual(["blended"]);
    const instructors = await f.t.query(api.registration.upcomingClasses, {
      slugs: [],
      keywords: ["bls instructor"],
    });
    expect(instructors.sessions.map((s) => s.code)).toEqual([
      "instructor-code",
    ]);
    const catalog = await f.t.query(api.registration.publicCatalog, {});
    expect(catalog.courses.map((c) => c.slug).sort()).toEqual([
      "blended",
      "bls-instructor",
    ]);
    expect(catalog.sessions.map((s) => s.code).sort()).toEqual([
      "instructor-code",
      "test-stable-code",
    ]);
    const unlisted = await f.t.query(api.registration.detail, {
      code: "unlisted-code",
    });
    expect(unlisted?.unlisted).toBe(true);
    const listed = await f.t.query(api.registration.detail, {
      code: "test-stable-code",
    });
    expect(listed?.unlisted).toBe(false);
  });
  it("drops sessions that are full of cutoff, closed, or on an unpublished course", async () => {
    const f = await fixture(1);
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, {
        settings: { ...config, cutoffMinutes: 2000 },
      });
    });
    const cutoff = await f.t.query(api.registration.publicCatalog, {});
    expect(cutoff.sessions).toHaveLength(0);
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, { settings: config, enrollmentOpen: false });
    });
    const closed = await f.t.query(api.registration.publicCatalog, {});
    expect(closed.courses).toHaveLength(0);
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
  it("email context keeps self-paced course names and tax-inclusive receipts", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, { delivery: "self-paced" });
    });
    const args = attempt(f.course, f.session);
    const { sessionId: _sessionId, ...selfPaced } = args;
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...selfPaced,
      admin: { overbook: false, reason: "Email test", payment: "offline" },
    });
    await f.t.run(async (ctx) => {
      await ctx.db.patch(order.orderId, { tax: 890 });
    });
    const jobs = await f.t.run(
      async (ctx) => await ctx.db.query("registrationJobs").take(20)
    );
    const confirmation = jobs.find((job) =>
      job.key.startsWith("confirmation:")
    );
    const receipt = jobs.find((job) => job.key.startsWith("receipt:"));
    if (!(confirmation && receipt)) {
      throw new Error("Missing settlement emails");
    }
    const confirmed = await f.t.mutation(internal.registrationMail.claim, {
      id: confirmation._id,
    });
    const paid = await f.t.mutation(internal.registrationMail.claim, {
      id: receipt._id,
    });
    expect(confirmed?.title).toBe("Blended course");
    expect(confirmed?.details).toContainEqual({
      label: "Attendee",
      value: "Student",
    });
    expect(confirmed?.body).toContain("self-paced");
    expect(paid?.details).toContainEqual({
      label: "Total paid",
      value: "$108.90",
    });
    expect(paid?.details).toContainEqual({
      label: "Sales tax",
      value: "$8.90",
    });
  });
  it("mints one portal sign-in token per email job and reuses it on retry", async () => {
    const f = await fixture();
    const job = await f.t.run(
      async (ctx) =>
        await ctx.db.insert("registrationJobs", {
          key: "test-magic",
          kind: "email",
          recipient: "Student@example.test",
          subject: "Confirmed",
          body: "See your portal",
          due: Date.now(),
          attempts: 0,
          state: "pending",
        })
    );
    const first = await f.t.mutation(internal.registrationMail.claim, {
      id: job,
    });
    expect(first?.portalToken).toHaveLength(72);
    await f.t.mutation(internal.registrationMail.result, {
      id: job,
      success: false,
      error: "Timed out",
    });
    await f.t.run(async (ctx) => {
      await ctx.db.patch(job, { due: Date.now() - 1 });
    });
    const retry = await f.t.mutation(internal.registrationMail.claim, {
      id: job,
    });
    expect(retry?.portalToken).toBe(first?.portalToken);
    const grants = await f.t.run((ctx) =>
      ctx.db.query("registrationGrants").collect()
    );
    expect(grants).toHaveLength(1);
    expect(grants[0]?.email).toBe("student@example.test");
    expect(grants[0]?.expires).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    expect(
      await f.t.mutation(api.registrationPortal.exchange, {
        token: first?.portalToken ?? "",
        grantHash: "a".repeat(64),
      })
    ).toBe(true);
    // An automatic retry after the student already used the link (a send
    // whose result was lost) must reuse it, or the student gets a duplicate.
    await f.t.run(async (ctx) => {
      await ctx.db.patch(job, { state: "pending", due: Date.now() - 1 });
    });
    const automatic = await f.t.mutation(internal.registrationMail.claim, {
      id: job,
    });
    expect(automatic?.portalToken).toBe(first?.portalToken);
    // A staff retry after the link has lapsed must not resend a dead button.
    await f.t.run(async (ctx) => {
      await ctx.db.patch(job, {
        state: "pending",
        due: Date.now() - 1,
        attempts: 0,
      });
      await ctx.db.patch(grants[0]._id, { expires: Date.now() - 1 });
    });
    const late = await f.t.mutation(internal.registrationMail.claim, {
      id: job,
    });
    expect(late?.portalToken).toHaveLength(72);
    expect(late?.portalToken).not.toBe(first?.portalToken);
    const challenges = await f.t.run(async (ctx) =>
      (await ctx.db.query("registrationGrants").collect()).filter(
        (g) => g.purpose === "challenge"
      )
    );
    expect(challenges).toHaveLength(2);
    // Invoice and payment-request emails keep their own button.
    const linked = await f.t.run(
      async (ctx) =>
        await ctx.db.insert("registrationJobs", {
          key: "test-linked",
          kind: "email",
          recipient: "student@example.test",
          subject: "Pay",
          body: "Pay now",
          due: Date.now(),
          attempts: 0,
          state: "pending",
          link: { label: "Pay", url: "https://pay.example.test" },
        })
    );
    const claimed = await f.t.mutation(internal.registrationMail.claim, {
      id: linked,
    });
    expect(claimed?.portalToken).toBeUndefined();
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
  it.each([false, true])(
    "routes portal mail correctly with live=%s",
    async (live) => {
      vi.stubEnv("REGISTRATION_MODE", live ? "live" : "test");
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
        expect(body.to).toBe(
          live ? "student@example.test" : "safe@example.test"
        );
        expect(body.from).toBe("Training <sender@example.test>");
        expect(body.text).toContain(
          "https://preview.example.test/registrations/access#"
        );
      } finally {
        send.mockRestore();
      }
    }
  );
});

describe("Group training and invoicing", () => {
  const bill = {
    billToName: "Acme Safety",
    billToEmail: "ap@example.test",
    billToAddress: "1 Main St",
    city: "Vancouver",
    state: "WA",
    postalCode: "98660",
    country: "US",
    poNumber: "PO-7",
    notes: "Net 30",
    dueDays: 30,
  };
  const group = (payment: "unpaid" | "offline" | "waived" = "unpaid") => ({
    payment,
    overbook: false,
    reason: "Group booking",
  });
  it("lets staff price a large group roster while public checkout keeps template limits", async () => {
    const f = await fixture(40);
    const roster = Array.from({ length: 25 }, (_, i) =>
      seat(`person${i}@example.test`)
    );
    await expect(
      f.t.mutation(api.registration.reserve, {
        ...attempt(f.course, f.session),
        attendees: roster,
      })
    ).rejects.toThrow("between 1 and 20");
    const result = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      attendees: roster,
      admin: { ...group(), tuition: 8000, pricingNote: "Volume rate" },
    });
    expect(result.total).toBe(25 * 8000);
    expect(result.status).toBe("unpaid");
    const order = await f.t.run((ctx) => ctx.db.get(result.orderId));
    expect(order?.seats[0]?.lines[0]?.cents).toBe(8000);
    expect(order?.pricingNote).toBe("Volume rate");
    await expect(
      f.adminClient.mutation(api.registration.reserve, {
        ...attempt(f.course, f.session, "x@example.test"),
        admin: { ...group(), tuition: 1 },
      })
    ).rejects.toThrow("Explain the custom group price");
    await expect(
      f.t.mutation(api.registration.reserve, {
        ...attempt(f.course, f.session, "y@example.test"),
        admin: { ...group(), tuition: 1, pricingNote: "guest" },
      })
    ).rejects.toThrow();
  });
  it("issues unique invoices once per order, emails a pay link, and settles exactly once on a matching paid event", async () => {
    const f = await fixture(10);
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      attendees: [seat("a@example.test"), seat("b@example.test")],
      admin: group(),
    });
    const second = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session, "c@example.test"),
      admin: group(),
    });
    const [first, other] = await Promise.all([
      f.adminClient.mutation(api.registrationGroups.createInvoice, {
        orderId: order.orderId,
        ...bill,
      }),
      f.adminClient.mutation(api.registrationGroups.createInvoice, {
        orderId: second.orderId,
        ...bill,
      }),
    ]);
    const numbers = await f.t.run(async (ctx) => [
      (await ctx.db.get(first))?.number,
      (await ctx.db.get(other))?.number,
    ]);
    expect(new Set(numbers).size).toBe(2);
    expect(numbers[0]).toMatch(INVOICE_NUMBER);
    await expect(
      f.adminClient.mutation(api.registrationGroups.createInvoice, {
        orderId: order.orderId,
        ...bill,
      })
    ).rejects.toThrow("already open");
    await expect(
      f.outsiderClient.query(api.registrationGroups.invoices, {
        paginationOpts: { cursor: null, numItems: 50 },
      })
    ).rejects.toThrow("Forbidden");
    await f.t.mutation(internal.registrationGroups.attachStripeInvoice, {
      id: first,
      stripeInvoiceId: "in_test_1",
      stripeCustomerId: "cus_1",
      hostedUrl: "https://invoice.stripe.com/i/test",
      pdfUrl: "https://pay.stripe.com/invoice/test/pdf",
      tax: 1700,
    });
    const job = await f.t.run(async (ctx) =>
      (await ctx.db.query("registrationJobs").take(100)).find(
        (j) => j.key === `invoice:${first}`
      )
    );
    expect(job?.recipient).toBe("ap@example.test");
    expect(job?.link?.url).toBe("https://invoice.stripe.com/i/test");
    await expect(
      f.adminClient.mutation(api.registrationPayments.createPaymentLink, {
        orderId: order.orderId,
        requestKey: crypto.randomUUID(),
      })
    ).rejects.toThrow("Void the open invoice");
    await expect(
      f.t.mutation(internal.registrationGroups.invoicePaid, {
        eventId: "evt_bad",
        stripeInvoiceId: "in_test_1",
        amount: 1,
        currency: "usd",
        live: false,
      })
    ).rejects.toThrow("does not match");
    await expect(
      f.t.mutation(internal.registrationGroups.invoicePaid, {
        eventId: "evt_untaxed",
        stripeInvoiceId: "in_test_1",
        amount: order.total + 1700,
        tax: 0,
        currency: "usd",
        live: false,
      })
    ).rejects.toThrow("does not match");
    const paid = {
      eventId: "evt_paid",
      stripeInvoiceId: "in_test_1",
      amount: order.total + 1700,
      tax: 1700,
      currency: "usd",
      paymentIntent: "pi_group",
      live: false,
    };
    await f.t.mutation(internal.registrationGroups.invoicePaid, paid);
    await f.t.mutation(internal.registrationGroups.invoicePaid, paid);
    const state = await f.t.run(async (ctx) => ({
      order: await ctx.db.get(order.orderId),
      invoice: await ctx.db.get(first),
      seats: await ctx.db
        .query("registrationSeats")
        .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
        .take(10),
      events: (await ctx.db.query("registrationEvents").take(100)).filter(
        (e) => e.type === "invoice.paid"
      ),
    }));
    expect(state.order?.status).toBe("settled");
    expect(state.order?.tax).toBe(1700);
    expect(state.order?.source).toBe("invoice");
    expect(state.order?.paymentIntent).toBe("pi_group");
    expect(state.invoice?.status).toBe("paid");
    expect(state.seats.every((s) => s.state === "active")).toBe(true);
    expect(state.events).toHaveLength(1);
    await expect(
      f.adminClient.mutation(api.registrationGroups.voidInvoice, {
        id: first,
        reason: "oops",
      })
    ).rejects.toThrow("Paid invoices cannot be voided");
  });
  it("records offline invoice payment through the shared finalizer and voids without touching the order", async () => {
    const f = await fixture(10);
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: group(),
    });
    const id = await f.adminClient.mutation(
      api.registrationGroups.createInvoice,
      { orderId: order.orderId, ...bill }
    );
    await f.adminClient.mutation(api.registrationGroups.recordInvoicePayment, {
      id,
      reason: "Check #1001",
    });
    const paid = await f.t.run(async (ctx) => ({
      order: await ctx.db.get(order.orderId),
      invoice: await ctx.db.get(id),
    }));
    expect(paid.order?.status).toBe("settled");
    expect(paid.order?.source).toBe("offline");
    expect(paid.invoice?.method).toBe("offline");
    const second = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session, "second@example.test"),
      admin: group(),
    });
    const voided = await f.adminClient.mutation(
      api.registrationGroups.createInvoice,
      { orderId: second.orderId, ...bill, dueDays: 0 }
    );
    await f.t.run(async (ctx) => {
      await ctx.db.patch(voided, { status: "open", dueAt: Date.now() - 1 });
    });
    const attention = await f.adminClient.query(
      api.registrationOperations.attention
    );
    expect(attention.invoices.map((i) => i._id)).toEqual([voided]);
    await f.adminClient.mutation(api.registrationGroups.voidInvoice, {
      id: voided,
      reason: "Customer will pay by card",
    });
    const after = await f.t.run(async (ctx) => ({
      order: await ctx.db.get(second.orderId),
      invoice: await ctx.db.get(voided),
    }));
    expect(after.invoice?.status).toBe("void");
    expect(after.order?.status).toBe("unpaid");
    await expect(
      f.adminClient.mutation(api.registrationPayments.createPaymentLink, {
        orderId: second.orderId,
        requestKey: crypto.randomUUID(),
      })
    ).resolves.toBeNull();
    const summary = await f.adminClient.query(
      api.registrationDashboard.summary
    );
    expect(summary.ordersSettled).toBe(1);
    expect(summary.revenue).toBe(10_000);
  });
  it("accepts public group requests with rate limiting and queues a staff alert with a link", async () => {
    const f = await fixture();
    const request = {
      organization: "Acme Safety",
      contactName: "Pat",
      email: "pat@example.test",
      phone: "",
      courseInterest: "BLS for 12 nurses",
      headcount: 12,
      preferredDates: "Early next month",
      location: "On-site",
      notes: "",
    };
    const id = await f.t.mutation(
      api.registrationGroups.submitGroupRequest,
      request
    );
    const job = await f.t.run(async (ctx) =>
      (await ctx.db.query("registrationJobs").take(100)).find(
        (j) => j.key === `group-request:${id}`
      )
    );
    expect(job?.link?.url).toBe("/admin/groups");
    expect(job?.body).toContain("Acme Safety");
    await expect(
      f.t.mutation(api.registrationGroups.submitGroupRequest, {
        ...request,
        headcount: 0,
      })
    ).rejects.toThrow("number of attendees");
    await expect(
      f.outsiderClient.query(api.registrationGroups.groupRequests, {
        paginationOpts: { numItems: 50, cursor: null },
      })
    ).rejects.toThrow("Forbidden");
    expect(
      (
        await f.adminClient.query(api.registrationGroups.groupRequests, {
          paginationOpts: { numItems: 50, cursor: null },
          status: "new",
        })
      ).page
    ).toHaveLength(1);
    await f.adminClient.mutation(api.registrationGroups.updateGroupRequest, {
      id,
      status: "contacted",
      internalNotes: "Called and left a message",
    });
    expect(
      (await f.adminClient.query(api.registrationDashboard.summary))
        .newGroupRequests
    ).toBe(0);
    await Promise.all(
      Array.from({ length: 4 }, () =>
        f.t.mutation(api.registrationGroups.submitGroupRequest, request)
      )
    );
    await expect(
      f.t.mutation(api.registrationGroups.submitGroupRequest, request)
    ).rejects.toThrow("Too many attempts");
  });
});

describe("Roster parsing", () => {
  it("accepts common paste formats, ignores headers, and flags problems", () => {
    const rows = parseRoster(
      [
        "Name, Email",
        "Jane Doe, jane@example.test",
        "JOHN@example.test, John Smith",
        "Ann Lee <ann@example.test>",
        "Bob\tbob@example.test",
        "nobody@example.test",
        "Missing Email Person",
        "jane@example.test, Jane Again",
        "",
      ].join("\n"),
      (index) => `row-${index}`
    );
    expect(rows.map((r) => [r.name, r.email, r.issue])).toEqual([
      ["Jane Doe", "jane@example.test", undefined],
      ["John Smith", "john@example.test", undefined],
      ["Ann Lee", "ann@example.test", undefined],
      ["Bob", "bob@example.test", undefined],
      ["", "nobody@example.test", "Missing name"],
      ["Missing Email Person", "", "Missing email"],
      ["Jane Again", "jane@example.test", "Duplicate email in roster"],
    ]);
    expect(rosterSummary(rows)).toEqual({ total: 7, ready: 4, problems: 3 });
  });
});

describe("Stripe Tax", () => {
  it("stamps tax codes on quoted lines from the template, session override, and material", async () => {
    const f = await fixture();
    expect(
      effective(
        { ...config, taxCode: "txcd_20030000" },
        { taxCode: "txcd_10000000" }
      ).taxCode
    ).toBe("txcd_10000000");
    expect(effective(config, { taxCode: "txcd_10000000" }).taxCode).toBe(
      "txcd_10000000"
    );
    expect(() => validateSettings({ ...config, taxCode: "nope" })).toThrow(
      "txcd_"
    );
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.material, { taxCode: "txcd_10000000" });
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          taxCode: "txcd_20030000",
          materials: [
            {
              id: "online",
              materialId: f.material,
              title: "Online code",
              policy: "included",
              cents: 1000,
            },
          ],
        },
      });
    });
    const order = await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session)
    );
    const lines = await f.t.run(
      async (ctx) => (await ctx.db.get(order.orderId))?.seats[0]?.lines
    );
    expect(lines?.map((l) => [l.id, l.taxCode])).toEqual([
      ["tuition", "txcd_20030000"],
      ["online", "txcd_10000000"],
    ]);
  });
  it("accepts checkout payments only when the amount equals the quote plus the reported tax, records tax, and lets refunds include it", async () => {
    const f = await fixture();
    const order = await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session)
    );
    await f.t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session: "cs_tax",
      secret: "cs_local_secret",
    });
    const event = {
      orderId: order.orderId,
      session: "cs_tax",
      eventId: "evt_tax",
      amount: 10_850,
      tax: 850,
      currency: "usd",
      paid: true,
      live: false,
      type: "checkout.session.completed",
      paymentIntent: "pi_tax",
    };
    await expect(
      f.t.mutation(internal.registrationPayments.paymentEvent, {
        ...event,
        tax: 0,
      })
    ).rejects.toThrow("quote");
    await f.t.mutation(internal.registrationPayments.paymentEvent, event);
    const settled = await f.t.run((ctx) => ctx.db.get(order.orderId));
    expect(settled?.status).toBe("settled");
    expect(settled?.tax).toBe(850);
    const receipt = await f.t.run(async (ctx) =>
      (await ctx.db.query("registrationJobs").take(100)).find(
        (j) => j.key === `receipt:${order.orderId}`
      )
    );
    expect(receipt?.body).toContain("108.50");
    expect(receipt?.body).toContain("8.50 sales tax");
    await expect(
      f.adminClient.mutation(api.registrationPayments.requestRefund, {
        orderId: order.orderId,
        cents: 10_851,
        key: crypto.randomUUID(),
        reason: "Too much",
      })
    ).rejects.toThrow("exceeds");
    const id = await f.adminClient.mutation(
      api.registrationPayments.requestRefund,
      {
        orderId: order.orderId,
        cents: 10_850,
        key: crypto.randomUUID(),
        reason: "Full refund including tax",
      }
    );
    const refund = await f.t.run((ctx) => ctx.db.get(id));
    expect(refund?.allocations).toEqual([
      { email: "student@example.test", lineId: "tuition", cents: 10_000 },
      { email: "order", lineId: "tax", cents: 850 },
    ]);
  });
});

describe("PR review regressions", () => {
  const admin = {
    payment: "unpaid" as const,
    overbook: false,
    reason: "Regression test",
  };
  const bill = {
    billToName: "Test",
    billToEmail: "buyer@example.test",
    billToAddress: "100 Main St",
    city: "Vancouver",
    state: "WA",
    postalCode: "98660",
    country: "US",
    poNumber: "",
    notes: "",
    dueDays: 30,
  };
  it("settles all 100 supported seats and requires explicit whole-group cancellation", async () => {
    const f = await fixture(200);
    const result = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin,
      attendees: Array.from({ length: 100 }, (_, i) =>
        seat(`large${i}@example.test`)
      ),
    });
    const seats = await f.adminClient.query(
      api.registrationOperations.orderSeats,
      { orderId: result.orderId }
    );
    expect(seats).toHaveLength(100);
    await f.adminClient.mutation(api.registrationOperations.recordPayment, {
      orderId: result.orderId,
      source: "offline",
      reason: "Paid",
    });
    const paid = await f.adminClient.query(
      api.registrationOperations.orderSeats,
      { orderId: result.orderId }
    );
    expect(paid.every((s) => s.state === "active" && s.settledAt)).toBe(true);
    const unpaid = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin,
      attendees: Array.from({ length: 60 }, (_, i) =>
        seat(`cancel${i}@example.test`)
      ),
    });
    const members = await f.adminClient.query(
      api.registrationOperations.orderSeats,
      { orderId: unpaid.orderId }
    );
    const first = members.at(0);
    if (!first) {
      throw new Error("Missing seat");
    }
    await expect(
      f.adminClient.mutation(api.registrationOperations.cancelSeat, {
        seatId: first._id,
        reason: "Cancel",
        notify: true,
      })
    ).rejects.toThrow("whole order");
    expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(160);
    await f.adminClient.mutation(api.registrationOperations.cancelSeat, {
      seatId: first._id,
      reason: "Cancel",
      notify: true,
      cancelWholeOrder: true,
    });
    expect(
      (
        await f.adminClient.query(api.registrationOperations.orderSeats, {
          orderId: unpaid.orderId,
        })
      ).every((s) => s.state === "canceled")
    ).toBe(true);
    expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(100);
  });
  it("retains invoice tax on offline settlement and blocks bypassing a payable invoice", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin,
    });
    const id = await f.adminClient.mutation(
      api.registrationGroups.createInvoice,
      { orderId: order.orderId, ...bill }
    );
    await expect(
      f.adminClient.mutation(api.registrationOperations.recordPayment, {
        orderId: order.orderId,
        source: "offline",
        reason: "Paid",
      })
    ).rejects.toThrow("invoice");
    await f.t.mutation(internal.registrationGroups.attachStripeInvoice, {
      id,
      stripeInvoiceId: "in_tax",
      stripeCustomerId: "cus_test",
      hostedUrl: "https://invoice.stripe.com/test",
      tax: 850,
    });
    await f.adminClient.mutation(api.registrationGroups.recordInvoicePayment, {
      id,
      reason: "Check",
    });
    expect((await f.t.run((ctx) => ctx.db.get(order.orderId)))?.tax).toBe(850);
    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    expect(
      jobs.find((j) => j.key === `receipt:${order.orderId}`)?.body
    ).toContain("108.50");
    const invoiceJob = jobs.find((j) => j.key === `invoice:${id}`);
    if (!invoiceJob) {
      throw new Error("Missing invoice job");
    }
    expect(
      await f.t.mutation(internal.registrationMail.claim, {
        id: invoiceJob._id,
      })
    ).toBeNull();
    vi.stubEnv("REGISTRATION_MODE", "test");
    await f.t.mutation(internal.registrationGroups.invoicePaid, {
      eventId: "evt_extra",
      stripeInvoiceId: "in_tax",
      amount: 10_850,
      tax: 850,
      currency: "usd",
      paymentIntent: "pi_extra",
      live: false,
    });
    const extra = await f.t.run((ctx) => ctx.db.get(order.orderId));
    expect(extra?.status).toBe("exception");
    expect(extra?.paymentIntent).toBe("pi_extra");
    const refund = await f.adminClient.mutation(
      api.registrationPayments.requestRefund,
      {
        orderId: order.orderId,
        cents: 10_850,
        reason: "Extra card payment",
        key: crypto.randomUUID(),
      }
    );
    await f.t.mutation(internal.registrationPayments.refundFailure, {
      id: refund,
      error: "Rejected",
      terminal: true,
    });
    expect(
      (await f.t.run((ctx) => ctx.db.get(order.orderId)))?.refundReserved
    ).toBe(0);
    expect((await f.t.run((ctx) => ctx.db.get(refund)))?.state).toBe("failed");
    const originalSeat = (
      await f.adminClient.query(api.registrationOperations.orderSeats, {
        orderId: order.orderId,
      })
    ).at(0);
    if (!originalSeat) {
      throw new Error("Missing attendee");
    }
    const cheaper = await f.t.run(async (ctx) => {
      const session = await ctx.db.get(f.session);
      if (!session) {
        throw new Error("Missing session");
      }
      const { _id, _creationTime, ...value } = session;
      return await ctx.db.insert("registrationSessions", {
        ...value,
        code: "duplicate-payment-transfer",
        reserved: 0,
        overrides: { tuition: 5000 },
      });
    });
    await expect(
      f.adminClient.mutation(api.registrationTransfers.transfer, {
        seatId: originalSeat._id,
        sessionId: cheaper,
        choice: "refund",
        reason: "Lower price",
        requestKey: crypto.randomUUID(),
      })
    ).rejects.toThrow("reconcile first");
    const returned = await f.adminClient.mutation(
      api.registrationPayments.requestRefund,
      {
        orderId: order.orderId,
        cents: 10_850,
        reason: "Return duplicate payment",
        key: crypto.randomUUID(),
      }
    );
    await f.t.mutation(internal.registrationPayments.finishRefund, {
      id: returned,
      stripeId: "re_duplicate",
    });
    expect((await f.t.run((ctx) => ctx.db.get(order.orderId)))?.status).toBe(
      "settled"
    );
    // Revenue is tax-inclusive for every settled order, so the original
    // offline sale keeps its tax after the duplicate card payment is returned.
    expect(
      (await f.adminClient.query(api.registrationDashboard.summary, {})).revenue
    ).toBe(10_850);
    const attendee = (
      await f.adminClient.query(api.registrationOperations.orderSeats, {
        orderId: order.orderId,
      })
    ).at(0);
    if (!attendee) {
      throw new Error("Missing attendee");
    }
    expect(
      (
        await f.adminClient.query(api.registrationTransfers.preview, {
          seatId: attendee._id,
          sessionId: f.session,
        })
      ).original
    ).toBe(10_000);
  });
  it("closes an invoice attached after cancellation without emailing its payment link", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin,
    });
    const id = await f.adminClient.mutation(
      api.registrationGroups.createInvoice,
      { orderId: order.orderId, ...bill }
    );
    await f.adminClient.mutation(api.registrationGroups.voidInvoice, {
      id,
      reason: "Cancel",
    });
    await f.t.mutation(internal.registrationGroups.attachStripeInvoice, {
      id,
      stripeInvoiceId: "in_late",
      stripeCustomerId: "cus_test",
      hostedUrl: "https://invoice.stripe.com/test",
      tax: 850,
    });
    expect((await f.t.run((ctx) => ctx.db.get(id)))?.status).toBe("void");
    expect(
      (await f.t.run((ctx) => ctx.db.query("registrationJobs").collect())).some(
        (j) => j.key === `invoice:${id}`
      )
    ).toBe(false);
  });
  it("preserves unpaid staff enrollment when checkout is past the public cutoff", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.session, { firstStart: Date.now() - 1000 })
    );
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin,
    });
    await expect(
      f.adminClient.mutation(api.registrationPayments.createPaymentLink, {
        orderId: order.orderId,
        requestKey: crypto.randomUUID(),
      })
    ).rejects.toThrow("closed");
    expect((await f.t.run((ctx) => ctx.db.get(order.orderId)))?.status).toBe(
      "unpaid"
    );
    expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(1);
  });
  it("revokes instructor access even when stale assignments remain", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.insert("registrationInstructorAssignments", {
        userId: f.instructor,
        sessionId: f.session,
      });
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", f.instructor))
        .unique();
      if (profile) {
        await ctx.db.patch(profile._id, { isInstructor: false });
      }
    });
    await expect(
      f.instructorClient.query(api.registrationOperations.assignedSessions, {
        paginationOpts: { numItems: 50, cursor: null },
      })
    ).rejects.toThrow("instructor");
  });
  it("does not invite waitlists for a closed course", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.course, { enrollmentOpen: false });
      await ctx.db.insert("registrationWaitlist", {
        sessionId: f.session,
        name: "Waiting",
        email: "wait@example.test",
        state: "waiting",
      });
    });
    await f.t.mutation(internal.registrationWaitlist.advance, {
      sessionId: f.session,
    });
    expect(
      (await f.t.run((ctx) => ctx.db.query("registrationWaitlist").first()))
        ?.state
    ).toBe("waiting");
    expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(0);
  });
  it("keeps reminders after repeated reschedules and applies edited grading rules", async () => {
    const f = await fixture();
    const email = {
      id: "reminder",
      anchor: "first" as const,
      offsetMinutes: -10,
      subject: "Old",
      body: "Old",
    };
    await f.t.run((ctx) =>
      ctx.db.patch(f.course, { settings: { ...config, emails: [email] } })
    );
    await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { ...admin, payment: "offline" },
    });
    const outcome = {
      id: "exam",
      title: "Exam",
      type: "percentage" as const,
      required: true,
      minimum: 90,
      options: [],
      version: 2,
    };
    await f.t.run((ctx) =>
      ctx.db.patch(f.session, {
        revision: 2,
        overrides: {
          outcomes: [outcome],
          emails: [{ ...email, subject: "New" }],
        },
      })
    );
    await f.t.mutation(internal.registrationOperations.reschedule, {
      sessionId: f.session,
      notify: false,
      cursor: null,
    });
    await f.t.mutation(internal.registrationOperations.reschedule, {
      sessionId: f.session,
      notify: false,
      cursor: null,
    });
    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    expect(jobs.filter((j) => j.stepId && j.state === "pending")).toHaveLength(
      1
    );
    expect(jobs.find((j) => j.stepId && j.state === "pending")?.subject).toBe(
      "New"
    );
    expect(
      (await f.t.run((ctx) => ctx.db.query("registrationSeats").first()))
        ?.outcomeDefinitions
    ).toEqual([outcome]);
  });
  it("finds future classes after more than 50 historical sessions and pages staff catalogs", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      const original = await ctx.db.get(f.session);
      if (!original) {
        throw new Error("Missing session");
      }
      const { _id, _creationTime, ...value } = original;
      await ctx.db.patch(_id, { firstStart: Date.now() - 86_400_000 });
      await Promise.all(
        Array.from({ length: 60 }, (_, i) =>
          ctx.db.insert("registrationSessions", {
            ...value,
            code: `past-${i}`,
            firstStart: Date.now() - 86_400_000,
          })
        )
      );
      await ctx.db.insert("registrationSessions", {
        ...value,
        code: "future-last",
      });
    });
    const upcoming = await f.t.query(api.registration.publicCourseSessions, {
      courseId: f.course,
    });
    expect(upcoming.map((s) => s.code)).toContain("future-last");
    const page = await f.adminClient.query(api.registration.sessions, {
      paginationOpts: { cursor: null, numItems: 50 },
    });
    expect(page.isDone).toBe(false);
    const rest = await f.adminClient.query(api.registration.sessions, {
      paginationOpts: { cursor: page.continueCursor, numItems: 50 },
    });
    expect(page.page.length + rest.page.length).toBe(62);
  });
  it("refunds the original payment after a keep-price transfer chain", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { ...admin, payment: "offline" },
    });
    const targets = await f.t.run(async (ctx) => {
      await ctx.db.patch(order.orderId, { paymentIntent: "pi_original" });
      const original = await ctx.db.get(f.session);
      if (!original) {
        throw new Error("Missing session");
      }
      const { _id, _creationTime, ...value } = original;
      return await Promise.all(
        [15_000, 8000].map((tuition, i) =>
          ctx.db.insert("registrationSessions", {
            ...value,
            code: `transfer-${i}`,
            reserved: 0,
            overrides: { tuition },
          })
        )
      );
    });
    const source = (
      await f.adminClient.query(api.registrationOperations.orderSeats, {
        orderId: order.orderId,
      })
    ).at(0);
    const [higher, lower] = targets;
    if (!(source && higher && lower)) {
      throw new Error("Missing transfer fixture");
    }
    const first = await f.adminClient.mutation(
      api.registrationTransfers.transfer,
      {
        seatId: source._id,
        sessionId: higher,
        choice: "keep",
        reason: "Keep paid price",
        requestKey: crypto.randomUUID(),
      }
    );
    expect(
      (await f.t.run((ctx) => ctx.db.get(first.seatId)))?.snapshot.total
    ).toBe(10_000);
    const second = await f.adminClient.mutation(
      api.registrationTransfers.transfer,
      {
        seatId: first.seatId,
        sessionId: lower,
        choice: "refund",
        reason: "Lower price",
        requestKey: crypto.randomUUID(),
      }
    );
    expect(second.adjustment).toBe(-2000);
    const refund = await f.t.run((ctx) =>
      ctx.db.query("registrationRefunds").first()
    );
    expect(refund?.orderId).toBe(order.orderId);
    expect(refund?.cents).toBe(2000);
  });
  it("releases failed refund reservations and reports zero after a tax-inclusive full refund", async () => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { ...admin, payment: "offline" },
    });
    await f.t.run((ctx) =>
      ctx.db.patch(order.orderId, { paymentIntent: "pi_refund", tax: 850 })
    );
    const id = await f.adminClient.mutation(
      api.registrationPayments.requestRefund,
      {
        orderId: order.orderId,
        cents: 10_850,
        key: crypto.randomUUID(),
        reason: "Test",
      }
    );
    await f.t.mutation(internal.registrationPayments.refundEvent, {
      id,
      stripeId: "re_failed",
      amount: 10_850,
      paymentIntent: "pi_refund",
      succeeded: false,
      failed: true,
    });
    expect(
      (await f.t.run((ctx) => ctx.db.get(order.orderId)))?.refundReserved
    ).toBe(0);
    const retry = await f.adminClient.mutation(
      api.registrationPayments.requestRefund,
      {
        orderId: order.orderId,
        cents: 10_850,
        key: crypto.randomUUID(),
        reason: "Retry",
      }
    );
    await f.t.mutation(internal.registrationPayments.finishRefund, {
      id: retry,
      stripeId: "re_success",
    });
    expect(
      (await f.adminClient.query(api.registrationDashboard.summary, {})).revenue
    ).toBe(0);
  });
});

describe("Fulfillment and transfer review coverage", () => {
  it("does not let a later buyer consume inventory ahead of an earlier paid entitlement", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.course, {
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
      })
    );
    await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session, "first@example.test")
    );
    await f.adminClient.mutation(api.registrationOperations.addStock, {
      materialId: f.material,
      input: "https://codes.example.test/fifo",
      preview: false,
    });
    await f.t.mutation(
      api.registration.reserve,
      attempt(f.course, f.session, "second@example.test")
    );
    await f.t.mutation(internal.registrationOperations.restock, {
      materialId: f.material,
    });
    const entitlements = await f.t.run((ctx) =>
      ctx.db.query("registrationEntitlements").collect()
    );
    const ready = entitlements.find((e) => e.state === "ready");
    expect(ready).toBeDefined();
    expect(
      ready ? (await f.t.run((ctx) => ctx.db.get(ready.seatId)))?.email : ""
    ).toBe("first@example.test");
    expect(entitlements.filter((e) => e.state === "pending")).toHaveLength(1);
    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    expect(jobs.filter((j) => j.key.startsWith("assigned:"))).toHaveLength(1);
  });
  it("requires new destination answers and stamps transfer adjustment tax codes", async () => {
    const f = await fixture();
    const original = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { payment: "offline", overbook: false, reason: "Test" },
    });
    const target = await f.t.run(async (ctx) => {
      await ctx.db.patch(f.material, { taxCode: "txcd_10000000" });
      const source = await ctx.db.get(f.session);
      if (!source) {
        throw new Error("Missing session");
      }
      const { _id, _creationTime, ...value } = source;
      return await ctx.db.insert("registrationSessions", {
        ...value,
        code: "questions-and-tax",
        reserved: 0,
        overrides: {
          tuition: 15_000,
          taxCode: "txcd_20030000",
          materials: [
            {
              id: "new-code",
              materialId: f.material,
              title: "Online",
              policy: "included",
              cents: 5000,
            },
          ],
          questions: [
            {
              id: "new-policy",
              title: "New policy",
              type: "checkbox",
              required: true,
              options: [],
              version: 1,
            },
          ],
        },
      });
    });
    const source = (
      await f.adminClient.query(api.registrationOperations.orderSeats, {
        orderId: original.orderId,
      })
    ).at(0);
    if (!source) {
      throw new Error("Missing seat");
    }
    const args = {
      seatId: source._id,
      sessionId: target,
      choice: "collect" as const,
      reason: "Transfer",
      requestKey: crypto.randomUUID(),
    };
    expect(
      (
        await f.adminClient.query(api.registrationTransfers.preview, {
          seatId: source._id,
          sessionId: target,
        })
      ).difference
    ).toBe(10_000);
    await expect(
      f.adminClient.mutation(api.registrationTransfers.transfer, args)
    ).rejects.toThrow("Required");
    const moved = await f.adminClient.mutation(
      api.registrationTransfers.transfer,
      { ...args, answers: [{ id: "new-policy", value: true }] }
    );
    const order = await f.t.run((ctx) => ctx.db.get(moved.orderId));
    expect(order?.seats.at(0)?.lines.map((l) => [l.cents, l.taxCode])).toEqual([
      [7500, "txcd_20030000"],
      [2500, "txcd_10000000"],
    ]);
    expect(
      (await f.t.run((ctx) => ctx.db.get(source._id)))?.snapshot.attendee
        .answers
    ).toEqual([]);
  });
  it("applies template reminder edits and removes deleted reminders from existing registrations", async () => {
    const f = await fixture();
    const reminder = {
      id: "reminder",
      anchor: "first" as const,
      offsetMinutes: -10,
      subject: "Before",
      body: "Before",
    };
    await f.t.run((ctx) =>
      ctx.db.patch(f.course, { settings: { ...config, emails: [reminder] } })
    );
    await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { payment: "offline", overbook: false, reason: "Test" },
    });
    await f.t.run((ctx) =>
      ctx.db.patch(f.course, {
        settings: {
          ...config,
          emails: [{ ...reminder, subject: "After", offsetMinutes: -20 }],
        },
      })
    );
    await f.t.mutation(internal.registrationOperations.propagate, {
      courseId: f.course,
      cursor: null,
    });
    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    expect(jobs.find((j) => j.stepId && j.state === "pending")?.subject).toBe(
      "After"
    );
    await f.t.run((ctx) => ctx.db.patch(f.course, { settings: config }));
    await f.t.mutation(internal.registrationOperations.propagate, {
      courseId: f.course,
      cursor: null,
    });
    expect(
      (
        await f.t.run((ctx) => ctx.db.query("registrationJobs").collect())
      ).filter((j) => j.stepId && j.state === "pending")
    ).toHaveLength(0);
  });
  it("retains real roster rows whose names look like headers", () => {
    const rows = parseRoster(
      "Name Person, name@example.test\nFirst Student, first@example.test",
      String
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.email)).toEqual([
      "name@example.test",
      "first@example.test",
    ]);
  });
});

describe("Staff-only settlement", () => {
  it("settles authorized free enrollment even when public enrollment is closed", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.course, {
        enrollmentOpen: false,
        settings: { ...config, tuition: 0 },
      })
    );
    const result = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { payment: "unpaid", overbook: false, reason: "Private group" },
    });
    expect(result.status).toBe("settled");
    expect((await f.t.run((ctx) => ctx.db.get(result.orderId)))?.status).toBe(
      result.status
    );
    expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(1);
  });
});

it("refuses manual code assignment after a paid seat is canceled", async () => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.course, {
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
    })
  );
  await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
  const entitlement = await f.t.run((ctx) =>
    ctx.db.query("registrationEntitlements").first()
  );
  if (!entitlement) {
    throw new Error("Missing entitlement");
  }
  await f.t.run((ctx) =>
    ctx.db.patch(entitlement.seatId, { state: "canceled" })
  );
  await f.adminClient.mutation(api.registrationOperations.addStock, {
    materialId: f.material,
    input: "https://codes.example.test/manual",
    preview: false,
  });
  const code = await f.t.run((ctx) =>
    ctx.db.query("registrationCodes").first()
  );
  if (!code) {
    throw new Error("Missing code");
  }
  await expect(
    f.adminClient.mutation(api.registrationOperations.manageCode, {
      codeId: code._id,
      entitlementId: entitlement._id,
      reason: "Assign",
    })
  ).rejects.toThrow("active paid");
  expect((await f.t.run((ctx) => ctx.db.get(code._id)))?.state).toBe(
    "available"
  );
});

it("rejects late checkout attachment without exposing a payable URL", async () => {
  const f = await fixture();
  const order = await f.t.mutation(
    api.registration.reserve,
    attempt(f.course, f.session)
  );
  await f.t.run((ctx) => ctx.db.patch(order.orderId, { status: "expired" }));
  expect(
    await f.t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session: "cs_race",
      secret: "cs_race_secret_local",
    })
  ).toBe(false);
  expect(
    (await f.t.run((ctx) => ctx.db.get(order.orderId)))?.checkoutSecret
  ).toBeUndefined();
});

it("retains late card payments for refund without activating seats after cutoff", async () => {
  const f = await fixture();
  const order = await f.t.mutation(
    api.registration.reserve,
    attempt(f.course, f.session)
  );
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.session, { firstStart: Date.now() - 1 });
    const saved = await ctx.db.get(order.orderId);
    if (!saved) {
      throw new Error("Missing order");
    }
    const { settle } = await import("../../convex/registrationHelpers");
    await settle(ctx, saved, "stripe-test", "pi_after_cutoff");
  });
  const saved = await f.t.run((ctx) => ctx.db.get(order.orderId));
  expect(saved?.status).toBe("exception");
  expect(saved?.paymentIntent).toBe("pi_after_cutoff");
  expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(0);
  expect(
    (await f.t.query(api.registration.detail, { code: "test-stable-code" }))
      ?.state
  ).toBe("closed");
});

it("delivers explicit staff messages to unpaid attendees without private joining instructions", async () => {
  const f = await fixture();
  await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    admin: { payment: "unpaid", overbook: false, reason: "Group" },
  });
  const enrolled = await f.t.run((ctx) =>
    ctx.db.query("registrationSeats").first()
  );
  if (!enrolled) {
    throw new Error("Missing attendee");
  }
  const id = await f.t.run((ctx) =>
    ctx.db.insert("registrationJobs", {
      key: "staff:test",
      kind: "email",
      recipient: enrolled.email,
      subject: "Please confirm",
      body: "Contact us",
      state: "pending",
      attempts: 0,
      due: Date.now(),
      seatId: enrolled._id,
      sessionId: f.session,
    })
  );
  const message = await f.t.mutation(internal.registrationMail.claim, { id });
  expect(message?.body).toBe("Contact us");
  expect(message?.schedule).not.toContain("Private");
  expect(message?.calendar).toBeUndefined();
});

it("shows a waiver instead of claiming the quoted amount was paid", async () => {
  const f = await fixture();
  const order = await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    admin: { payment: "waived", overbook: false, reason: "Scholarship" },
  });
  const job = await f.t.run((ctx) =>
    ctx.db
      .query("registrationJobs")
      .withIndex("by_key", (q) => q.eq("key", `receipt:${order.orderId}`))
      .unique()
  );
  if (!job) {
    throw new Error("Missing receipt");
  }
  const message = await f.t.mutation(internal.registrationMail.claim, {
    id: job._id,
  });
  expect(message?.category).toBe("Payment waived");
  expect(message?.details.find((d) => d.label === "Total paid")?.value).toBe(
    "$0.00"
  );
});

it("keeps material grants idempotent beyond the first fifty historical rows", async () => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.course, { settings: { ...config, tuition: 0 } })
  );
  await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
  await f.t.run(async (ctx) => {
    const enrolled = await ctx.db.query("registrationSeats").first();
    if (!enrolled) {
      throw new Error("Missing attendee");
    }
    const oldMaterial = await ctx.db.insert("registrationMaterials", {
      title: "Old",
      kind: "link",
      version: 1,
      archived: true,
    });
    await Promise.all(
      Array.from({ length: 51 }, (_, i) =>
        ctx.db.insert("registrationEntitlements", {
          seatId: enrolled._id,
          materialId: oldMaterial,
          attachmentId: `old-${i}`,
          title: "Old",
          version: 1,
          kind: "link",
          state: "ready",
          paidAt: Date.now(),
        })
      )
    );
    await ctx.db.insert("registrationEntitlements", {
      seatId: enrolled._id,
      materialId: f.material,
      attachmentId: "current",
      title: "Current",
      version: 1,
      kind: "keycode",
      state: "pending",
      paidAt: Date.now(),
    });
    const { grantMaterial } = await import("../../convex/registrationHelpers");
    await grantMaterial(ctx, enrolled, {
      id: "current",
      materialId: f.material,
      title: "Current",
      policy: "included",
      cents: 0,
    });
    expect(
      await ctx.db.query("registrationEntitlements").collect()
    ).toHaveLength(52);
  });
});

it("pages organizations without losing records after the first page", async () => {
  const f = await fixture();
  await f.t.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: 55 }, (_, i) =>
        ctx.db.insert("registrationOrganizations", {
          name: `Org ${i}`,
          address: "",
          phone: "",
          notes: "",
          contactName: "Contact",
          contactEmail: "contact@example.test",
          archived: false,
        })
      )
    );
  });
  const first = await f.adminClient.query(
    api.registrationGroups.organizations,
    { paginationOpts: { numItems: 50, cursor: null } }
  );
  const second = await f.adminClient.query(
    api.registrationGroups.organizations,
    { paginationOpts: { numItems: 50, cursor: first.continueCursor } }
  );
  expect(first.page).toHaveLength(50);
  expect(second.page).toHaveLength(5);
});

it("uses current grades after more than two hundred historical versions", async () => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.course, { settings: { ...config, tuition: 0 } })
  );
  await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
  const enrolled = await f.t.run((ctx) =>
    ctx.db.query("registrationSeats").first()
  );
  if (!enrolled) {
    throw new Error("Missing attendee");
  }
  await f.t.run(async (ctx) => {
    await ctx.db.patch(enrolled._id, {
      outcomeDefinitions: [
        {
          id: "exam",
          title: "Exam",
          type: "percentage",
          required: true,
          minimum: 80,
          options: [],
          version: 202,
        },
      ],
    });
    await Promise.all(
      Array.from({ length: 201 }, (_, i) =>
        ctx.db.insert("registrationOutcomes", {
          seatId: enrolled._id,
          fieldId: "exam",
          version: i + 1,
          value: 10,
          actor: f.admin,
          at: Date.now(),
        })
      )
    );
  });
  await f.adminClient.mutation(api.registrationOperations.recordOutcome, {
    seatId: enrolled._id,
    fieldId: "exam",
    value: 85,
  });
  await f.adminClient.mutation(api.registrationOperations.recordOutcome, {
    seatId: enrolled._id,
    fieldId: "exam",
    value: 90,
  });
  const state = await f.adminClient.query(
    api.registrationOperations.outcomeState,
    { seatId: enrolled._id }
  );
  expect(state.values).toHaveLength(1);
  expect(state.values[0]?.value).toBe(90);
  expect(state.completion).toBe("complete");
  expect(
    await f.t.run((ctx) => ctx.db.query("registrationOutcomes").collect())
  ).toHaveLength(202);
});

it("does not resend a step buried behind canceled reminder history", async () => {
  const f = await fixture();
  await f.t.run((ctx) =>
    ctx.db.patch(f.course, { settings: { ...config, tuition: 0 } })
  );
  await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
  await f.t.run(async (ctx) => {
    const enrolled = await ctx.db.query("registrationSeats").first();
    if (!enrolled) {
      throw new Error("Missing attendee");
    }
    await Promise.all(
      Array.from({ length: 210 }, (_, i) =>
        ctx.db.insert("registrationJobs", {
          key: `old:${i}`,
          kind: "email",
          recipient: enrolled.email,
          subject: "Old",
          body: "Old",
          due: Date.now(),
          state: "canceled",
          attempts: 0,
          seatId: enrolled._id,
          stepId: "reminder",
        })
      )
    );
    await ctx.db.insert("registrationJobs", {
      key: "sent-reminder",
      kind: "email",
      recipient: enrolled.email,
      subject: "Sent",
      body: "Sent",
      due: Date.now(),
      state: "sent",
      attempts: 1,
      seatId: enrolled._id,
      stepId: "reminder",
    });
    const { scheduleEmails } = await import("../../convex/registrationHelpers");
    await scheduleEmails(ctx, enrolled, await ctx.db.get(f.session), {
      ...config,
      emails: [
        {
          id: "reminder",
          anchor: "registration",
          offsetMinutes: 1,
          subject: "Do not resend",
          body: "Do not resend",
        },
      ],
    });
    expect(
      (await ctx.db.query("registrationJobs").collect()).some(
        (j) => j.subject === "Do not resend"
      )
    ).toBe(false);
  });
});

it("deducts refunded credit from transfer previews and collections", async () => {
  const f = await fixture();
  const order = await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    admin: { overbook: false, payment: "offline", reason: "Paid" },
  });
  const source = (
    await f.adminClient.query(api.registrationOperations.orderSeats, {
      orderId: order.orderId,
    })
  ).at(0);
  if (!source) {
    throw new Error("Missing seat");
  }
  const target = await f.t.run(async (ctx) => {
    await ctx.db.patch(order.orderId, { paymentIntent: "pi_partial" });
    const session = await ctx.db.get(f.session);
    if (!session) {
      throw new Error("Missing session");
    }
    const { _id, _creationTime, ...value } = session;
    return await ctx.db.insert("registrationSessions", {
      ...value,
      code: "partial-refund-target",
      reserved: 0,
      overrides: { tuition: 15_000 },
    });
  });
  const pendingRefund = await f.adminClient.mutation(
    api.registrationPayments.requestRefund,
    {
      orderId: order.orderId,
      cents: 4000,
      reason: "Partial refund",
      key: crypto.randomUUID(),
    }
  );
  expect(
    (
      await f.adminClient.query(api.registrationTransfers.preview, {
        seatId: source._id,
        sessionId: target,
      })
    ).blocked
  ).toContain("pending refunds");
  await f.t.mutation(internal.registrationPayments.refundFailure, {
    id: pendingRefund,
    error: "Rejected",
    terminal: true,
  });
  expect(
    (
      await f.adminClient.query(api.registrationTransfers.preview, {
        seatId: source._id,
        sessionId: target,
      })
    ).difference
  ).toBe(5000);
  const refund = await f.adminClient.mutation(
    api.registrationPayments.requestRefund,
    {
      orderId: order.orderId,
      cents: 4000,
      reason: "Partial refund",
      key: crypto.randomUUID(),
    }
  );
  await f.t.mutation(internal.registrationPayments.finishRefund, {
    id: refund,
    stripeId: "re_partial",
  });
  const preview = await f.adminClient.query(api.registrationTransfers.preview, {
    seatId: source._id,
    sessionId: target,
  });
  expect(preview.difference).toBe(9000);
  const result = await f.adminClient.mutation(
    api.registrationTransfers.transfer,
    {
      seatId: source._id,
      sessionId: target,
      choice: "collect",
      reason: "Transfer",
      requestKey: crypto.randomUUID(),
    }
  );
  expect(result.adjustment).toBe(9000);
  expect((await f.t.run((ctx) => ctx.db.get(source._id)))?.snapshot.total).toBe(
    10_000
  );
});

it("suppresses expired offer emails and skips already registered waitlist entries", async () => {
  const f = await fixture();
  await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    admin: { overbook: false, payment: "offline", reason: "Paid" },
  });
  const entry = await f.t.run((ctx) =>
    ctx.db.insert("registrationWaitlist", {
      sessionId: f.session,
      name: "Student",
      email: "student@example.test",
      state: "waiting",
    })
  );
  await f.t.mutation(internal.registrationWaitlist.advance, {
    sessionId: f.session,
  });
  expect((await f.t.run((ctx) => ctx.db.get(entry)))?.state).toBe("expired");
  expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(1);
  const job = await f.t.run((ctx) =>
    ctx.db.insert("registrationJobs", {
      key: `offer:${entry}`,
      kind: "email",
      recipient: "student@example.test",
      subject: "Opening",
      body: "Expired",
      due: Date.now(),
      state: "pending",
      attempts: 0,
      sessionId: f.session,
    })
  );
  expect(
    await f.t.mutation(internal.registrationMail.claim, { id: job })
  ).toBeNull();
});

it("queues cancellation notices for every unpaid attendee across page boundaries", async () => {
  const f = await fixture(60);
  await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    attendees: Array.from({ length: 60 }, (_, i) =>
      seat(`group-${i}@example.test`)
    ),
    admin: { overbook: false, payment: "unpaid", reason: "Invoice later" },
  });
  await f.t.run((ctx) => ctx.db.patch(f.session, { state: "canceled" }));
  await f.t.mutation(internal.registrationOperations.reschedule, {
    sessionId: f.session,
    notify: true,
    cursor: null,
  });
  const jobs = await f.t.run((ctx) =>
    ctx.db.query("registrationJobs").collect()
  );
  const notices = jobs.filter((job) => job.key.startsWith("schedule:"));
  expect(notices).toHaveLength(60);
  const notice = notices.at(-1);
  if (!notice) {
    throw new Error("Missing notice");
  }
  expect(
    await f.t.mutation(internal.registrationMail.claim, { id: notice._id })
  ).not.toBeNull();
});

it("honors payment completed before cutoff when its signed event arrives afterward", async () => {
  const f = await fixture();
  const order = await f.t.mutation(
    api.registration.reserve,
    attempt(f.course, f.session)
  );
  await f.t.mutation(internal.registrationPayments.attachCheckout, {
    orderId: order.orderId,
    session: "cs_delayed",
    secret: "cs_local_secret",
  });
  const cutoff = Date.now() - 1000;
  await f.t.run((ctx) => ctx.db.patch(f.session, { firstStart: cutoff }));
  await f.t.mutation(internal.registrationPayments.paymentEvent, {
    orderId: order.orderId,
    session: "cs_delayed",
    eventId: "evt_delayed",
    amount: 10_000,
    currency: "usd",
    paid: true,
    live: false,
    type: "checkout.session.completed",
    paymentIntent: "pi_delayed",
    paidAt: cutoff - 1000,
  });
  expect((await f.t.run((ctx) => ctx.db.get(order.orderId)))?.status).toBe(
    "settled"
  );
  expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(1);
});

it("does not send newly added overdue registration emails to historical customers", async () => {
  const f = await fixture();
  const order = await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    admin: { overbook: false, payment: "offline", reason: "Paid" },
  });
  await f.t.run(async (ctx) => {
    const attendee = await ctx.db
      .query("registrationSeats")
      .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
      .first();
    if (!attendee) {
      throw new Error("Missing attendee");
    }
    const { scheduleEmails } = await import("../../convex/registrationHelpers");
    const settings = {
      ...config,
      emails: [
        {
          id: "new-step",
          anchor: "registration" as const,
          offsetMinutes: 0,
          subject: "New step",
          body: "Hello",
        },
      ],
    };
    const historical = { ...attendee, settledAt: Date.now() - 86_400_000 };
    await scheduleEmails(ctx, historical, null, settings);
    expect(
      (await ctx.db.query("registrationJobs").collect()).filter(
        (j) => j.stepId === "new-step"
      )
    ).toHaveLength(0);
    await scheduleEmails(ctx, historical, null, settings, true);
    expect(
      (await ctx.db.query("registrationJobs").collect()).filter(
        (j) => j.stepId === "new-step"
      )
    ).toHaveLength(1);
  });
});

it.each([false, true])(
  "preserves historical grading definitions (self-paced: %s)",
  async (selfPaced) => {
    const f = await fixture();
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { overbook: false, payment: "offline", reason: "Paid" },
    });
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.session, {
        firstStart: Date.now() - 86_400_000,
        lastEnd: Date.now() - 1000,
      });
      await ctx.db.patch(f.course, {
        settings: {
          ...config,
          outcomes: [
            {
              id: "new-exam",
              title: "New exam",
              type: "percentage",
              minimum: 80,
              required: true,
              options: [],
              version: 2,
            },
          ],
        },
      });
    });
    if (selfPaced) {
      await f.t.run(async (ctx) => {
        const enrolled = await ctx.db
          .query("registrationSeats")
          .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
          .first();
        if (!enrolled) {
          throw new Error("Missing seat");
        }
        await ctx.db.patch(enrolled._id, { sessionId: undefined });
        await ctx.db.patch(f.course, { delivery: "self-paced" });
      });
    }
    await f.t.mutation(internal.registrationOperations.propagate, {
      courseId: f.course,
      cursor: null,
    });
    const attendee = (
      await f.adminClient.query(api.registrationOperations.orderSeats, {
        orderId: order.orderId,
      })
    ).at(0);
    expect(attendee?.outcomeDefinitions).toEqual([]);
  }
);

it("drains more than fifty invalid offers after enrollment closes", async () => {
  const f = await fixture(100);
  await f.t.run(async (ctx) => {
    await ctx.db.patch(f.course, { enrollmentOpen: false });
    await ctx.db.patch(f.session, { reserved: 100 });
    await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        ctx.db.insert("registrationWaitlist", {
          sessionId: f.session,
          name: "Waiting",
          email: `waiting-${i}@example.test`,
          state: "offered",
          expires: Date.now() + 86_400_000,
        })
      )
    );
  });
  await f.t.mutation(internal.registrationWaitlist.advance, {
    sessionId: f.session,
  });
  expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(50);
  expect(
    (
      await f.t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect()
      )
    ).some((job) => job.name.includes("registrationWaitlist"))
  ).toBe(true);
  await f.t.mutation(internal.registrationWaitlist.advance, {
    sessionId: f.session,
  });
  expect((await f.t.run((ctx) => ctx.db.get(f.session)))?.reserved).toBe(0);
});

it.each(["registration", "first", "last"] as const)(
  "preserves overdue unsent %s steps during session edits",
  async (anchor) => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.course, {
        settings: {
          ...config,
          emails: [
            {
              id: "immediate",
              anchor,
              offsetMinutes: 0,
              subject: "Immediate",
              body: "Welcome",
            },
          ],
        },
      })
    );
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...attempt(f.course, f.session),
      admin: { overbook: false, payment: "offline", reason: "Paid" },
    });
    await f.t.run(async (ctx) => {
      const attendee = await ctx.db
        .query("registrationSeats")
        .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
        .first();
      if (!attendee) {
        throw new Error("Missing attendee");
      }
      await ctx.db.patch(attendee._id, { settledAt: Date.now() - 60_000 });
      await ctx.db.patch(f.session, {
        revision: 2,
        firstStart: Date.now() - 120_000,
        lastEnd: Date.now() - 60_000,
      });
    });
    await f.t.mutation(internal.registrationOperations.reschedule, {
      sessionId: f.session,
      cursor: null,
      notify: false,
    });
    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    expect(
      jobs.filter(
        (job) => job.stepId === "immediate" && job.state === "pending"
      )
    ).toHaveLength(1);
    expect(
      jobs.find((job) => job.stepId === "immediate" && job.state === "pending")
        ?.scheduleRevision
    ).toBe(2);
  }
);

describe("Emailed payment requests", () => {
  it("queues one request without billing information or starting checkout, then starts once using the secure link", async () => {
    vi.stubEnv("SITE_URL", "https://training.example.test");
    const f = await fixture();
    const input = attempt(f.course, f.session);
    const result = await f.adminClient.mutation(api.registration.reserve, {
      ...input,
      admin: { overbook: false, reason: "Staff enrollment", payment: "unpaid" },
    });
    const args = { orderId: result.orderId, requestId: crypto.randomUUID() };
    await expect(
      f.t.mutation(api.registrationPayments.requestPayment, args)
    ).rejects.toThrow();
    const url = await f.adminClient.mutation(
      api.registrationPayments.requestPayment,
      args
    );
    expect(new URL(url).searchParams.get("key")).toBe(input.requestKey);
    await f.adminClient.mutation(api.registrationPayments.requestPayment, args);
    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    expect(
      jobs.filter((j) => j.key.startsWith("payment-request:"))
    ).toHaveLength(1);
    const job = jobs.find((j) => j.key.startsWith("payment-request:"));
    expect(job?.recipient).toBe(input.purchaser);
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(result.orderId))?.status)
    ).toBe("unpaid");
    if (!job) {
      throw new Error("Missing payment request");
    }
    const mail = await f.t.mutation(internal.registrationMail.claim, {
      id: job._id,
    });
    expect(mail?.category).toBe("Payment requested");
    expect(mail?.body).toContain("billing address");
    expect(mail?.body).not.toContain("Total paid");
    await expect(
      f.t.mutation(api.registrationPayments.beginRequestedPayment, {
        orderId: result.orderId,
        requestKey: "wrong",
      })
    ).rejects.toThrow("not found");
    const payment = { orderId: result.orderId, requestKey: input.requestKey };
    await f.t.mutation(api.registrationPayments.beginRequestedPayment, payment);
    const first = await f.t.run((ctx) => ctx.db.get(result.orderId));
    await f.t.mutation(api.registrationPayments.beginRequestedPayment, payment);
    const second = await f.t.run((ctx) => ctx.db.get(result.orderId));
    expect(second?.status).toBe("hold");
    expect(second?.expires).toBe(first?.expires);
    expect(
      await f.t.run(async (ctx) => (await ctx.db.get(f.session))?.reserved)
    ).toBe(1);
  });
  it("suppresses queued requests after payment and rejects paid links", async () => {
    vi.stubEnv("SITE_URL", "https://training.example.test");
    const f = await fixture();
    const input = attempt(f.course, f.session);
    const result = await f.adminClient.mutation(api.registration.reserve, {
      ...input,
      admin: { overbook: false, reason: "Staff enrollment", payment: "unpaid" },
    });
    await f.adminClient.mutation(api.registrationPayments.requestPayment, {
      orderId: result.orderId,
      requestId: crypto.randomUUID(),
    });
    await f.adminClient.mutation(api.registrationOperations.recordPayment, {
      orderId: result.orderId,
      source: "offline",
      reason: "Paid by check",
    });
    const job = await f.t.run(async (ctx) =>
      (await ctx.db.query("registrationJobs").collect()).find((j) =>
        j.key.startsWith("payment-request:")
      )
    );
    if (!job) {
      throw new Error("Missing payment request");
    }
    expect(
      await f.t.mutation(internal.registrationMail.claim, { id: job._id })
    ).toBeNull();
    await expect(
      f.t.mutation(api.registrationPayments.beginRequestedPayment, {
        orderId: result.orderId,
        requestKey: input.requestKey,
      })
    ).rejects.toThrow("already paid");
  });
});

it("rejects a transfer when a newer waitlist entry has an active offer", async () => {
  const f = await fixture();
  const order = await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f.course, f.session),
    admin: { overbook: false, payment: "offline", reason: "Paid" },
  });
  const source = (
    await f.adminClient.query(api.registrationOperations.orderSeats, {
      orderId: order.orderId,
    })
  ).at(0);
  if (!source) {
    throw new Error("Missing seat");
  }
  const target = await f.t.run(async (ctx) => {
    const session = await ctx.db.get(f.session);
    if (!session) {
      throw new Error("Missing session");
    }
    const { _id, _creationTime, ...value } = session;
    const id = await ctx.db.insert("registrationSessions", {
      ...value,
      code: "newer-offer",
      reserved: 1,
    });
    await ctx.db.insert("registrationWaitlist", {
      sessionId: id,
      name: source.name,
      email: source.email,
      state: "expired",
    });
    await ctx.db.insert("registrationWaitlist", {
      sessionId: id,
      name: source.name,
      email: source.email,
      state: "offered",
      expires: Date.now() + 60_000,
    });
    return id;
  });
  await expect(
    f.adminClient.mutation(api.registrationTransfers.transfer, {
      seatId: source._id,
      sessionId: target,
      choice: "keep",
      reason: "Move",
      requestKey: crypto.randomUUID(),
    })
  ).rejects.toThrow("waitlist offer");
  expect((await f.t.run((ctx) => ctx.db.get(target)))?.reserved).toBe(1);
});

describe("Session files", () => {
  it("stores staff uploads per session and removes them from storage", async () => {
    const f = await fixture();
    const storageId = await f.t.run((ctx) =>
      ctx.storage.store(new Blob(["sign-in sheet"], { type: "text/plain" }))
    );
    await expect(
      f.t.mutation(api.registrationOperations.attachFile, {
        sessionId: f.session,
        storageId,
        name: "sign-in.txt",
        type: "text/plain",
        size: 13,
      })
    ).rejects.toThrow("sign-in required");
    const id = await f.adminClient.mutation(
      api.registrationOperations.attachFile,
      {
        sessionId: f.session,
        storageId,
        name: "  sign-in.txt ",
        type: "text/plain",
        size: 13,
      }
    );
    const listed = (
      await f.adminClient.query(api.registrationOperations.sessionFiles, {
        sessionId: f.session,
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page;
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("sign-in.txt");
    expect(listed[0]?.uploadedBy).toBe(ADMIN_EMAILS[0]);
    expect(listed[0]?.url).toBeTruthy();
    await f.adminClient.mutation(api.registrationOperations.removeFile, { id });
    expect(
      (
        await f.adminClient.query(api.registrationOperations.sessionFiles, {
          sessionId: f.session,
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page
    ).toHaveLength(0);
    expect(await f.t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
  });

  it("rejects oversized uploads before issuing an upload URL", async () => {
    const f = await fixture();
    await expect(
      f.adminClient.mutation(api.registrationOperations.fileUploadUrl, {
        sessionId: f.session,
        name: "huge.bin",
        size: 26 * 1024 * 1024,
      })
    ).rejects.toThrow("25 MB");
    await expect(
      f.adminClient.mutation(api.registrationOperations.fileUploadUrl, {
        sessionId: f.session,
        name: "   ",
        size: 10,
      })
    ).rejects.toThrow("name");
  });
});

it("keeps physical materials pending until authorized handoff and snapshots instructions", async () => {
  const f = await fixture();
  const materialId = await f.adminClient.mutation(
    api.registrationOperations.saveMaterial,
    {
      title: "Pocket mask",
      kind: "physical",
      archived: false,
      instructions: "Collect at class.",
    }
  );
  await f.t.run((ctx) =>
    ctx.db.patch(f.course, {
      settings: {
        ...config,
        tuition: 0,
        materials: [
          {
            id: "mask",
            materialId,
            title: "Pocket mask",
            policy: "included",
            cents: 0,
          },
        ],
      },
    })
  );
  await f.t.mutation(api.registration.reserve, attempt(f.course, f.session));
  const entitlement = await f.t.run((ctx) =>
    ctx.db.query("registrationEntitlements").first()
  );
  if (!entitlement) {
    throw new Error("Missing physical entitlement");
  }
  expect(entitlement.state).toBe("pending");
  expect(entitlement.url).toBeUndefined();
  expect(entitlement.instructions).toBe("Collect at class.");
  await expect(
    f.outsiderClient.mutation(api.registrationOperations.fulfillPhysical, {
      entitlementId: entitlement._id,
    })
  ).rejects.toThrow();
  await f.adminClient.mutation(api.registrationOperations.saveMaterial, {
    id: materialId,
    title: "Pocket mask",
    kind: "physical",
    archived: false,
    instructions: "New instructions.",
  });
  await f.adminClient.mutation(api.registrationOperations.fulfillPhysical, {
    entitlementId: entitlement._id,
  });
  await f.adminClient.mutation(api.registrationOperations.fulfillPhysical, {
    entitlementId: entitlement._id,
  });
  const after = await f.t.run((ctx) => ctx.db.get(entitlement._id));
  expect(after?.state).toBe("fulfilled");
  expect(after?.instructions).toBe("Collect at class.");
  await f.t.run((ctx) =>
    ctx.db.patch(entitlement.seatId, { state: "canceled" })
  );
  await expect(
    f.adminClient.mutation(api.registrationOperations.fulfillPhysical, {
      entitlementId: entitlement._id,
    })
  ).rejects.toThrow("active, paid");
});
