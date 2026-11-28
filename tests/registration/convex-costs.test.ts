import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";

const modules = import.meta.glob("../../convex/**/*.ts");
const DAY_MS = 86_400_000;

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
    return { admin, course };
  });
  const order = (
    fields: Partial<Doc<"registrationOrders">> & {
      status: Doc<"registrationOrders">["status"];
    }
  ) =>
    t.run((ctx) =>
      ctx.db.insert("registrationOrders", {
        requestKey: crypto.randomUUID(),
        purchaser: "buyer@example.test",
        purchaserName: "Buyer",
        courseId: ids.course,
        title: "BLS",
        seats: [],
        total: 10_000,
        currency: "usd",
        expires: Date.now(),
        couponUses: 0,
        restoredUses: 0,
        refunded: 0,
        refundReserved: 0,
        ...fields,
      })
    );
  const scheduled = async () =>
    (
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect()
      )
    ).map((job) => job.name);
  return {
    t,
    order,
    scheduled,
    adminClient: t.withIdentity({ subject: `${ids.admin}|session` }),
  };
}

function mailJob(
  fields: Pick<Doc<"registrationJobs">, "state" | "due">
): Omit<Doc<"registrationJobs">, "_id" | "_creationTime"> {
  return {
    key: crypto.randomUUID(),
    kind: "email",
    recipient: "student@example.test",
    subject: "Hello",
    body: "Body",
    attempts: 0,
    ...fields,
  };
}

describe("Outbox cron gate", () => {
  it("starts the Node sender only when mail is due", async () => {
    const f = await fixture();
    await f.t.mutation(internal.registrationMail.kickDelivery, {});
    expect(await f.scheduled()).toEqual([]);

    await f.t.run((ctx) =>
      ctx.db.insert(
        "registrationJobs",
        mailJob({ state: "pending", due: Date.now() + DAY_MS })
      )
    );
    await f.t.run((ctx) =>
      ctx.db.insert(
        "registrationJobs",
        mailJob({ state: "sending", due: Date.now() - 60_000 })
      )
    );
    await f.t.mutation(internal.registrationMail.kickDelivery, {});
    expect(await f.scheduled()).toEqual([]);

    const due = await f.t.run((ctx) =>
      ctx.db.insert(
        "registrationJobs",
        mailJob({ state: "pending", due: Date.now() - 1 })
      )
    );
    await f.t.mutation(internal.registrationMail.kickDelivery, {});
    expect(await f.scheduled()).toEqual(["registrationExternal:deliver"]);
    expect(await f.t.query(internal.registrationMail.due, {})).toEqual([due]);
  });

  it("restarts mail whose send was interrupted", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.insert(
        "registrationJobs",
        mailJob({ state: "sending", due: Date.now() - 600_000 })
      )
    );
    await f.t.mutation(internal.registrationMail.kickDelivery, {});
    expect(await f.scheduled()).toEqual(["registrationExternal:deliver"]);
  });
});

describe("Refund reconciliation cron gate", () => {
  it("starts Stripe reconciliation only while a refund is pending", async () => {
    const f = await fixture();
    const orderId = await f.order({ status: "settled", settledAt: Date.now() });
    const refund = (state: Doc<"registrationRefunds">["state"]) =>
      f.t.run(async (ctx) => {
        const actor = (await ctx.db.query("users").first())?._id as Id<"users">;
        return await ctx.db.insert("registrationRefunds", {
          orderId,
          key: crypto.randomUUID(),
          cents: 100,
          reason: "Test",
          actor,
          state,
        });
      });
    await refund("succeeded");
    await refund("failed");
    await f.t.mutation(
      internal.registrationPayments.kickRefundReconciliation,
      {}
    );
    expect(await f.scheduled()).toEqual([]);

    await refund("pending");
    await f.t.mutation(
      internal.registrationPayments.kickRefundReconciliation,
      {}
    );
    expect(await f.scheduled()).toEqual([
      "registrationExternal:reconcileRefunds",
    ]);
  });
});

describe("Dashboard summary order reads", () => {
  it("counts only non-waived orders settled within the window", async () => {
    const f = await fixture();
    await f.order({ status: "settled", settledAt: Date.now() - 2 * DAY_MS });
    await f.order({ status: "settled", settledAt: Date.now() - 40 * DAY_MS });
    await f.order({
      status: "settled",
      source: "waived",
      settledAt: Date.now() - DAY_MS,
    });
    await f.order({
      status: "exception",
      settledAt: Date.now() - DAY_MS,
    });
    await f.order({ status: "unpaid" });
    const summary = await f.adminClient.query(
      api.registrationDashboard.summary,
      {}
    );
    expect(summary.ordersSettled).toBe(1);
    expect(summary.revenue).toBe(10_000);
    expect(summary.sampled).toBe(false);
  });

  it("counts settled revenue behind more checkouts than recent orders scan", async () => {
    const f = await fixture();
    await f.order({ status: "settled", settledAt: Date.now() });
    for (let i = 0; i < 210; i += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: creation order matters
      await f.order({ status: "expired" });
    }
    const summary = await f.adminClient.query(
      api.registrationDashboard.summary,
      {}
    );
    expect(summary.ordersSettled).toBe(1);
    expect(summary.revenue).toBe(10_000);
    expect(summary.recentOrders).toEqual([]);
  });

  it("lists the newest real orders past any run of abandoned checkouts", async () => {
    const f = await fixture();
    const paid = await f.order({ status: "settled", settledAt: Date.now() });
    const released = await f.order({
      status: "expired",
      releasedBeforePayment: { at: Date.now(), actor: "staff", reason: "PO" },
    });
    for (let i = 0; i < 12; i += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: creation order matters
      await f.order({ status: "expired" });
    }
    const hold = await f.order({ status: "hold" });
    const summary = await f.adminClient.query(
      api.registrationDashboard.summary,
      {}
    );
    expect(summary.recentOrders.map((o) => o._id)).toEqual([
      hold,
      released,
      paid,
    ]);
  });
});
