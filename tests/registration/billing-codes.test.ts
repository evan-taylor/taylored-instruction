import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import {
  agreedAmount,
  amountAfterCancellation,
  billingCodeProblem,
  endOfBusinessDay,
  generateBillingCode,
  normalizeBillingCode,
  splitAmount,
} from "../../shared/registration/billing";
import { agreement } from "./fixtures/policy";

const modules = import.meta.glob("../../convex/**/*.ts");
const DAY = 86_400_000;
const PAGE = { numItems: 100, cursor: null };
const GENERATED = /^ACMEHE-[A-Z2-9]{6}$/u;
const bill = {
  billToName: "Acme Health",
  billToEmail: "ap@acme.example.test",
  billToAddress: "1 Main St",
  city: "Vancouver",
  state: "WA",
  postalCode: "98660",
  country: "US",
  poNumber: "",
  notes: "",
  dueDays: 30,
};

const settings = (tuition: number) => ({
  tuition,
  materials: [],
  questions: [],
  outcomes: [],
  emails: [],
  cutoffMinutes: 0,
});

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
      settings: settings(8000),
      enrollmentOpen: true,
      revision: 1,
    });
    const acls = await ctx.db.insert("registrationCourses", {
      slug: "acls",
      title: "ACLS",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      settings: settings(20_000),
      enrollmentOpen: true,
      revision: 1,
    });
    const session = (
      courseId: Id<"registrationCourses">,
      code: string,
      days: number
    ) => {
      const start = Date.now() + days * DAY;
      return ctx.db.insert("registrationSessions", {
        courseId,
        title: `${code} class`,
        code,
        publication: "published",
        visibility: "public",
        state: "open",
        capacity: 20,
        reserved: 0,
        timeZone: "America/Los_Angeles",
        meetings: [
          {
            id: "first",
            start,
            end: start + 4 * 3_600_000,
            location: "Training center",
            instructions: "",
            sequence: 0,
          },
        ],
        firstStart: start,
        lastEnd: start + 4 * 3_600_000,
        overrides: {},
        revision: 1,
        instructors: [],
        offerMinutes: 1440,
      });
    };
    return {
      admin,
      course,
      acls,
      early: await session(course, "bls-early", 14),
      late: await session(course, "bls-late", 2),
      aclsSession: await session(acls, "acls-class", 14),
    };
  });
  const admin = t.withIdentity({ subject: `${ids.admin}|session` });
  const organizationId = await admin.mutation(
    api.registrationGroups.saveOrganization,
    {
      name: "Acme Health",
      contactName: "Pat Payables",
      contactEmail: "ap@acme.example.test",
      phone: "",
      address: "1 Main St",
      city: "Vancouver",
      state: "WA",
      postalCode: "98660",
      country: "US",
      notes: "",
      archived: false,
    }
  );

  function register(
    name: string,
    code: string | undefined,
    sessionId: Id<"registrationSessions"> = ids.early,
    courseId: Id<"registrationCourses"> = ids.course
  ) {
    return t.mutation(api.registration.reserve, {
      courseId,
      sessionId,
      requestKey: crypto.randomUUID(),
      purchaser: `${name}@example.test`,
      purchaserName: name,
      cancellationPolicy: agreement,
      coupon: code,
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
  }
  function createCode(
    terms: Partial<{
      code: string;
      pricing: "percent" | "fixed" | "full";
      amount: number;
      courseIds: Id<"registrationCourses">[];
      expires: number;
      limit: number;
    }> = {}
  ) {
    return admin.mutation(api.registrationBilling.saveBillingCode, {
      organizationId,
      code: "",
      pricing: "percent",
      amount: 10,
      courseIds: [],
      active: true,
      ...terms,
    });
  }
  const balance = () =>
    admin.query(api.registrationBilling.organizationBalance, {
      organizationId,
    });
  return { t, ids, admin, organizationId, register, createCode, balance };
}

describe("organization billing codes", () => {
  it("covers a public registration and adds the agreed amount to the balance", async () => {
    const f = await fixture();
    const codeId = await f.createCode();
    const [code] = await f.admin.query(api.registrationBilling.billingCodes, {
      organizationId: f.organizationId,
    });
    expect(code?.code).toMatch(GENERATED);

    const result = await f.register("alyssa", code?.code.toLowerCase());
    expect(result).toMatchObject({ total: 0, status: "settled" });

    const order = await f.t.run((ctx) => ctx.db.get(result.orderId));
    expect(order).toMatchObject({
      source: "organization",
      billingCodeId: codeId,
      organizationId: f.organizationId,
      billedTo: "Acme Health",
      total: 0,
    });
    expect(order?.seats[0]?.lines[0]).toMatchObject({
      cents: 8000,
      discount: 8000,
    });

    const { unbilled, lines } = await f.balance();
    expect(unbilled).toBe(7200);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      attendeeName: "alyssa",
      title: "bls-early class",
      listPrice: 8000,
      amount: 7200,
      code: code?.code,
      state: "unbilled",
    });

    const roster = await f.admin.query(api.registrationOperations.roster, {
      sessionId: f.ids.early,
      paginationOpts: PAGE,
    });
    expect(roster.page[0]).toMatchObject({
      state: "active",
      billedTo: "Acme Health",
    });

    const jobs = await f.t.run((ctx) =>
      ctx.db.query("registrationJobs").collect()
    );
    const receipt = jobs.find((job) => job.key === `receipt:${result.orderId}`);
    expect(receipt?.body).toContain("covered by Acme Health");
    expect(receipt?.body).not.toContain("72.00");
    const email = await f.t.mutation(internal.registrationMail.claim, {
      id: receipt?._id as Id<"registrationJobs">,
    });
    expect(email?.body).toContain("covered by Acme Health");
    expect(email?.body).not.toContain("Thank you for your payment");

    const status = await f.t.query(api.registrationPortal.status, {
      orderId: result.orderId,
      requestKey: order?.requestKey ?? "",
    });
    expect(status).toEqual({
      status: "settled",
      total: 0,
      billedTo: "Acme Health",
    });
    const saved = await f.t.run((ctx) => ctx.db.get(codeId));
    expect(saved?.uses).toBe(1);
  });

  it("rejects invalid, inactive, expired, used-up and out-of-scope codes", async () => {
    const f = await fixture();
    await expect(f.register("nobody", "NOPE-0000")).rejects.toThrow(
      "don't recognize this code"
    );
    const inactive = await f.createCode({ code: "ACME-OFF" });
    await f.admin.mutation(api.registrationBilling.setBillingCodeActive, {
      id: inactive,
      active: false,
    });
    await expect(f.register("off", "acme-off")).rejects.toThrow(
      "no longer active"
    );
    const expired = await f.createCode({ code: "ACME-OLD" });
    await f.t.run((ctx) => ctx.db.patch(expired, { expires: Date.now() - 1 }));
    await expect(f.register("old", "ACME-OLD")).rejects.toThrow("expired");
    await f.createCode({ code: "ACME-ONE", limit: 1 });
    await f.register("first", "ACME-ONE");
    await expect(f.register("second", "ACME-ONE")).rejects.toThrow("used up");
    await f.createCode({ code: "ACME-BLS", courseIds: [f.ids.course] });
    await expect(
      f.register("acls", "ACME-BLS", f.ids.aclsSession, f.ids.acls)
    ).rejects.toThrow("doesn't cover this class");

    const { lines } = await f.balance();
    expect(lines).toHaveLength(1);
  });

  it("keeps billing codes and coupons in one case-insensitive namespace", async () => {
    const f = await fixture();
    await f.createCode({ code: "teamtrain" });
    await expect(f.createCode({ code: "TEAMTRAIN" })).rejects.toThrow(
      "already used"
    );
    await expect(
      f.admin.mutation(api.registration.saveCoupon, {
        code: "TeamTrain",
        type: "percent",
        amount: 10,
        materialIds: [],
        allMaterials: false,
        courseIds: [],
        expires: Date.now() + DAY,
        limit: 5,
        reserved: 0,
        consumed: 0,
        disabled: false,
      })
    ).rejects.toThrow("billing code already uses");
    await f.admin.mutation(api.registration.saveCoupon, {
      code: "SPRING",
      type: "percent",
      amount: 10,
      materialIds: [],
      allMaterials: false,
      courseIds: [],
      expires: Date.now() + DAY,
      limit: 5,
      reserved: 0,
      consumed: 0,
      disabled: false,
    });
    await expect(f.createCode({ code: "spring" })).rejects.toThrow(
      "already used"
    );
  });

  it("invoices unbilled lines through the existing invoice flow", async () => {
    const f = await fixture();
    await f.createCode({ code: "ACME-FIXED", pricing: "fixed", amount: 6000 });
    await f.register("ben", "ACME-FIXED");
    await f.register("cara", "ACME-FIXED");
    const { unbilled, lines } = await f.balance();
    expect(unbilled).toBe(12_000);

    const orderId = await f.admin.mutation(
      api.registrationBilling.invoiceBalance,
      { organizationId: f.organizationId, chargeIds: lines.map((l) => l._id) }
    );
    const order = await f.t.run((ctx) => ctx.db.get(orderId));
    expect(order).toMatchObject({
      status: "unpaid",
      total: 12_000,
      organizationBalance: true,
      organizationId: f.organizationId,
    });
    expect(order?.seats.map((seat) => seat.attendee.name).sort()).toEqual([
      "ben",
      "cara",
    ]);
    const lineIds = order?.seats.flatMap((seat) =>
      seat.lines.map((line) => line.id)
    );
    expect(new Set(lineIds).size).toBe(lineIds?.length);
    expect(order?.seats.every((seat) => seat.total === 6000)).toBe(true);
    expect((await f.balance()).unbilled).toBe(0);
    await expect(
      f.admin.mutation(api.registrationBilling.invoiceBalance, {
        organizationId: f.organizationId,
        chargeIds: lines.map((l) => l._id),
      })
    ).rejects.toThrow("no longer unbilled");

    await f.admin.mutation(api.registrationBilling.returnBalanceOrder, {
      orderId,
      reason: "Wrong lines",
    });
    expect((await f.balance()).unbilled).toBe(12_000);

    const second = await f.admin.mutation(
      api.registrationBilling.invoiceBalance,
      { organizationId: f.organizationId, chargeIds: lines.map((l) => l._id) }
    );
    const invoiceId = await f.admin.mutation(
      api.registrationGroups.createInvoice,
      { orderId: second, ...bill, organizationId: f.organizationId }
    );
    const invoice = await f.t.run((ctx) => ctx.db.get(invoiceId));
    expect(invoice).toMatchObject({ amount: 12_000, status: "draft" });
    await f.admin.mutation(api.registrationGroups.recordInvoicePayment, {
      id: invoiceId,
      reason: "Check 1042",
    });
    const paid = await f.balance();
    expect(paid.lines.every((line) => line.state === "invoiced")).toBe(true);
    expect(
      paid.lines.every((line) => line.billingOrderStatus === "settled")
    ).toBe(true);
  });

  it("applies the cancellation policy to unbilled lines and flags invoiced ones", async () => {
    const f = await fixture();
    const codeId = await f.createCode({ code: "ACME-TEN" });
    const early = await f.register("early", "ACME-TEN", f.ids.early);
    const late = await f.register("late", "ACME-TEN", f.ids.late);
    const invoiced = await f.register("billed", "ACME-TEN", f.ids.early);
    const seatOf = async (orderId: Id<"registrationOrders">) => {
      const seat = await f.t.run((ctx) =>
        ctx.db
          .query("registrationSeats")
          .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
          .first()
      );
      if (!seat) {
        throw new Error("seat missing");
      }
      return seat._id;
    };
    const billedLine = (await f.balance()).lines.find(
      (line) => line.attendeeName === "billed"
    );
    await f.admin.mutation(api.registrationBilling.invoiceBalance, {
      organizationId: f.organizationId,
      chargeIds: billedLine ? [billedLine._id] : [],
    });
    const cancel = async (orderId: Id<"registrationOrders">) =>
      f.admin.mutation(api.registrationOperations.cancelSeat, {
        seatId: await seatOf(orderId),
        reason: "Employee left",
        notify: true,
      });
    await cancel(early.orderId);
    await cancel(late.orderId);
    await cancel(invoiced.orderId);

    const { lines, unbilled } = await f.balance();
    const byName = Object.fromEntries(lines.map((l) => [l.attendeeName, l]));
    expect(byName.early).toMatchObject({ state: "void", amount: 0 });
    expect(byName.late).toMatchObject({ state: "unbilled", amount: 2000 });
    expect(byName.late?.adjustment?.reason).toContain("administrative fee");
    expect(byName.billed).toMatchObject({ state: "invoiced", amount: 7200 });
    expect(byName.billed?.followUp?.reason).toContain(
      "Canceled after invoicing"
    );
    expect(unbilled).toBe(2000);
    const code = await f.t.run((ctx) => ctx.db.get(codeId));
    expect(code?.uses).toBe(2);

    if (byName.billed) {
      await f.admin.mutation(api.registrationBilling.resolveFollowUp, {
        chargeId: byName.billed._id,
        note: "Credited on the next invoice",
      });
    }
    const resolved = (await f.balance()).lines.find(
      (line) => line.attendeeName === "billed"
    );
    expect(resolved?.followUp).toBeUndefined();
    expect(resolved?.followUpResolved?.reason).toBe(
      "Credited on the next invoice"
    );
  });

  it("moves the balance line when a covered seat is transferred", async () => {
    const f = await fixture();
    await f.createCode({ code: "ACME-MOVE" });
    const result = await f.register("mover", "ACME-MOVE", f.ids.early);
    const seat = await f.t.run((ctx) =>
      ctx.db
        .query("registrationSeats")
        .withIndex("by_orderId", (q) => q.eq("orderId", result.orderId))
        .first()
    );
    if (!seat) {
      throw new Error("seat missing");
    }
    const transfer = {
      seatId: seat._id,
      sessionId: f.ids.late,
      reason: "Schedule change",
      requestKey: crypto.randomUUID(),
    };
    await expect(
      f.admin.mutation(api.registrationTransfers.transfer, {
        ...transfer,
        choice: "collect",
      })
    ).rejects.toThrow("billed to Acme Health");
    const moved = await f.admin.mutation(api.registrationTransfers.transfer, {
      ...transfer,
      choice: "keep",
    });
    const [line] = (await f.balance()).lines;
    expect(line).toMatchObject({
      seatId: moved.seatId,
      sessionId: f.ids.late,
      state: "unbilled",
      amount: 7200,
    });
    const roster = await f.admin.query(api.registrationOperations.roster, {
      sessionId: f.ids.late,
      paginationOpts: PAGE,
    });
    expect(roster.page[0]?.billedTo).toBe("Acme Health");
  });
});

describe("billing code rules", () => {
  it("computes the agreed amount for each pricing option", () => {
    expect(agreedAmount({ pricing: "percent", amount: 10 }, 8000)).toBe(7200);
    expect(agreedAmount({ pricing: "fixed", amount: 6500 }, 8000)).toBe(6500);
    expect(agreedAmount({ pricing: "full", amount: 0 }, 8000)).toBe(8000);
  });

  it("follows the cancellation policy's seven-day and $20 terms", () => {
    const now = Date.now();
    expect(amountAfterCancellation(7200, now + 8 * DAY, false, now)).toBe(0);
    expect(amountAfterCancellation(7200, now + 2 * DAY, false, now)).toBe(2000);
    expect(amountAfterCancellation(1500, now + 2 * DAY, false, now)).toBe(1500);
    expect(amountAfterCancellation(7200, now + 2 * DAY, true, now)).toBe(0);
  });

  it("expires codes at the end of the business day in Pacific time", () => {
    expect(new Date(endOfBusinessDay("2026-12-15")).toISOString()).toBe(
      "2026-12-16T07:59:59.999Z"
    );
    expect(new Date(endOfBusinessDay("2026-07-04")).toISOString()).toBe(
      "2026-07-05T06:59:59.999Z"
    );
    expect(new Date(endOfBusinessDay("2026-03-08")).toISOString()).toBe(
      "2026-03-09T06:59:59.999Z"
    );
    expect(new Date(endOfBusinessDay("2026-11-01")).toISOString()).toBe(
      "2026-11-02T07:59:59.999Z"
    );
  });

  it("splits the agreed amount across priced lines", () => {
    expect(splitAmount([8000, 2000], 7200)).toEqual([5760, 1440]);
    expect(splitAmount([1000, 1000, 1000], 1000)).toEqual([334, 333, 333]);
    expect(splitAmount([0, 0], 2000)).toEqual([2000, 0]);
  });

  it("normalizes and generates codes", () => {
    expect(normalizeBillingCode(" acme-bls ")).toBe("ACME-BLS");
    expect(normalizeBillingCode("no spaces")).toBeNull();
    expect(generateBillingCode("Acme Health")).toMatch(GENERATED);
    expect(
      billingCodeProblem(
        { active: true, uses: 4, limit: 5, courseIds: [] },
        "course",
        2,
        Date.now()
      )
    ).toContain("1 registration left");
  });
});
