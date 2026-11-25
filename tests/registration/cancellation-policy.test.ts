import { readdirSync, readFileSync } from "node:fs";
import { convexTest } from "convex-test";
import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { linkStripePayment } from "../../convex/registrationPolicy";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import {
  AGREEMENT_LABEL,
  CANCELLATION_POLICIES,
  type CancellationPolicy,
  policySnapshot,
  sha256,
} from "../../shared/cancellation-policy";
import {
  disputeEvidenceText,
  evidencePdf,
  evidenceSections,
} from "../../shared/registration/evidence";

const policy = vi.hoisted(() => ({
  next: null as null | CancellationPolicy,
}));
vi.mock("../../shared/cancellation-policy", async (original) => {
  const actual =
    await original<typeof import("../../shared/cancellation-policy")>();
  return {
    ...actual,
    get CURRENT_CANCELLATION_POLICY() {
      return policy.next ?? actual.CURRENT_CANCELLATION_POLICY;
    },
  };
});

const stripe = vi.hoisted(() => ({
  sessions: [] as Record<string, unknown>[],
  files: [] as Record<string, unknown>[],
  disputes: [] as { id: string; params: Record<string, unknown> }[],
  disputeFailures: 0,
}));
vi.mock("stripe", async (original) => {
  const actual = await original<typeof import("stripe")>();
  class FakeStripe {
    static readonly errors = actual.default.errors;
    readonly customers = {
      list: () => ({ autoPagingToArray: async () => [] }),
      search: () => ({ autoPagingToArray: async () => [] }),
      retrieve: async (id: string) => ({ id, email: "buyer@example.test" }),
      create: async () => ({ id: "cus_1", email: "buyer@example.test" }),
      update: async (id: string) => ({ id }),
    };
    readonly checkout = {
      sessions: {
        create: (params: Record<string, unknown>) => {
          stripe.sessions.push(params);
          return Promise.resolve({
            id: `cs_${stripe.sessions.length}`,
            client_secret: "cs_secret",
            livemode: false,
          });
        },
      },
    };
    readonly files = {
      create: (params: Record<string, unknown>) => {
        stripe.files.push(params);
        return Promise.resolve({ id: "file_evidence" });
      },
    };
    readonly disputes = {
      update: (id: string, params: Record<string, unknown>) => {
        if (stripe.disputeFailures > 0) {
          stripe.disputeFailures -= 1;
          return Promise.reject(new Error("Stripe is unavailable"));
        }
        stripe.disputes.push({ id, params });
        return Promise.resolve({ id });
      },
    };
  }
  return { ...actual, default: FakeStripe };
});

const ORIGIN = "https://training.example.test";
const DELETE_OR_REPLACE = /db\.(delete|replace)\(/u;
const PATCH = /db\.patch\(/gu;
const INSERT = /db\.insert\(/gu;
const NOT_CLICK_THROUGH = /^Not a click-through\./u;
const CURRENT = CANCELLATION_POLICIES[0] as CancellationPolicy;
const agreement = { version: CURRENT.version, label: AGREEMENT_LABEL };
const modules = import.meta.glob("../../convex/**/*.ts");

beforeEach(() => {
  vi.stubEnv("SITE_URL", ORIGIN);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_policy");
  stripe.sessions.length = 0;
  stripe.files.length = 0;
  stripe.disputes.length = 0;
  stripe.disputeFailures = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  policy.next = null;
});

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    });
    const outsider = await ctx.db.insert("users", {
      email: "outsider@example.test",
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
    return { admin, outsider, course, session };
  });
  const adminClient = t.withIdentity({ subject: `${ids.admin}|session` });
  const outsiderClient = t.withIdentity({
    subject: `${ids.outsider}|session`,
  });
  const visitor = t.withRequestMetadata({
    ip: "203.0.113.9",
    userAgent: "Mozilla/5.0 (Policy test)",
  });
  const input = (name: string) => ({
    courseId: ids.course,
    sessionId: ids.session,
    requestKey: crypto.randomUUID(),
    purchaser: `${name}-buyer@example.test`,
    purchaserName: `${name} Buyer`,
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
  async function register(name: string, consent = agreement) {
    const args = input(name);
    const order = await visitor.mutation(api.registration.reserve, {
      ...args,
      cancellationPolicy: consent,
    });
    return { ...order, requestKey: args.requestKey, name };
  }
  async function pay(order: {
    orderId: Id<"registrationOrders">;
    total: number;
    name: string;
  }) {
    await t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session: `cs_${order.name}`,
      secret: "secret",
    });
    await t.mutation(internal.registrationPayments.paymentEvent, {
      orderId: order.orderId,
      session: `cs_${order.name}`,
      eventId: `evt_${order.name}`,
      amount: order.total,
      currency: "usd",
      paid: true,
      live: false,
      type: "checkout.session.completed",
      paymentIntent: `pi_${order.name}`,
    });
  }
  const acknowledgements = (orderId: Id<"registrationOrders">) =>
    t.run((ctx) =>
      ctx.db
        .query("registrationPolicyAcknowledgements")
        .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
        .collect()
    );
  async function receipt(orderId: Id<"registrationOrders">) {
    const job = await t.run((ctx) =>
      ctx.db
        .query("registrationJobs")
        .withIndex("by_key", (q) => q.eq("key", `receipt:${orderId}`))
        .unique()
    );
    if (!job) {
      throw new Error("Missing receipt");
    }
    const mail = await t.mutation(internal.registrationMail.claim, {
      id: job._id,
    });
    return { job, mail };
  }
  return {
    t,
    ids,
    adminClient,
    outsiderClient,
    input,
    register,
    pay,
    acknowledgements,
    receipt,
  };
}

describe("Cancellation policy agreement at checkout", () => {
  it("refuses a public registration without the exact, current agreement", async () => {
    const f = await fixture();
    const { cancellationPolicy: _omitted, ...missing } = {
      ...f.input("nobody"),
      cancellationPolicy: agreement,
    };
    await expect(
      f.t.mutation(api.registration.reserve, missing)
    ).rejects.toThrow("Agree to the Cancellation Policy");
    await expect(
      f.register("altered", { ...agreement, label: "I agree" })
    ).rejects.toThrow("Agree to the Cancellation Policy");
    await expect(
      f.register("stale", { ...agreement, version: "2020-01-01" })
    ).rejects.toThrow("was updated");
    const left = await f.t.run(async (ctx) => ({
      orders: await ctx.db.query("registrationOrders").collect(),
      seats: await ctx.db.query("registrationSeats").collect(),
      session: await ctx.db.get(f.ids.session),
    }));
    expect(left.orders).toHaveLength(0);
    expect(left.seats).toHaveLength(0);
    expect(left.session?.reserved).toBe(0);
  });

  it("will not open a card payment for an order nobody agreed on", async () => {
    const f = await fixture();
    const staffOrder = await f.adminClient.mutation(api.registration.reserve, {
      ...f.input("group"),
      admin: { overbook: false, reason: "Group", payment: "unpaid" },
    });
    const requestKey = "a".repeat(32);
    await f.adminClient.mutation(api.registrationPayments.createPaymentLink, {
      orderId: staffOrder.orderId,
      requestKey,
    });
    await expect(
      f.t.action(api.registrationExternal.checkout, {
        orderId: staffOrder.orderId,
        requestKey,
      })
    ).rejects.toThrow("Agree to the Cancellation Policy before paying");
    await expect(
      f.t.mutation(api.registrationPayments.beginRequestedPayment, {
        orderId: staffOrder.orderId,
        requestKey,
      })
    ).rejects.toThrow("Agree to the Cancellation Policy");
    expect(stripe.sessions).toHaveLength(0);
    await f.t
      .withRequestMetadata({ ip: "198.51.100.4", userAgent: "Payer browser" })
      .mutation(api.registrationPayments.beginRequestedPayment, {
        orderId: staffOrder.orderId,
        requestKey,
        cancellationPolicy: agreement,
      });
    const opened = await f.t.action(api.registrationExternal.checkout, {
      orderId: staffOrder.orderId,
      requestKey,
    });
    expect(opened).toEqual({ secret: "cs_secret", termsConsent: false });
    const rows = await f.acknowledgements(staffOrder.orderId);
    expect(rows.map((row) => [row.kind, row.channel])).toEqual([
      ["disclosed", "staff-booking"],
      ["click-through", "payment-request-page"],
    ]);
    expect(rows[1]?.ip).toBe("198.51.100.4");
  });

  it("asks Stripe for its terms checkbox only when the deployment opts in", async () => {
    const f = await fixture();
    vi.stubEnv("REGISTRATION_STRIPE_TERMS_CONSENT", "required");
    const order = await f.register("consent");
    const opened = await f.t.action(api.registrationExternal.checkout, {
      orderId: order.orderId,
      requestKey: order.requestKey,
    });
    expect(opened.termsConsent).toBe(true);
    expect(stripe.sessions[0]?.consent_collection).toEqual({
      terms_of_service: "required",
    });
    vi.stubEnv("REGISTRATION_STRIPE_TERMS_CONSENT", "");
    const reopened = await f.t.action(api.registrationExternal.checkout, {
      orderId: order.orderId,
      requestKey: order.requestKey,
    });
    expect(reopened.termsConsent).toBe(true);
    expect(stripe.sessions).toHaveLength(1);
  });
});

describe("Cancellation policy acknowledgement record", () => {
  it("captures the IP address and user agent on the server, not from the browser", async () => {
    const f = await fixture();
    await expect(
      f.register("spoof", {
        ...agreement,
        ip: "10.0.0.1",
      } as typeof agreement)
    ).rejects.toThrow();
    const order = await f.register("alice");
    const [row] = await f.acknowledgements(order.orderId);
    const seats = await f.t.run((ctx) =>
      ctx.db
        .query("registrationSeats")
        .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
        .collect()
    );
    expect(row).toMatchObject({
      kind: "click-through",
      channel: "registration-form",
      statement: "I have read and agree to the Cancellation Policy",
      policyVersion: CURRENT.version,
      policySnapshot: policySnapshot(CURRENT),
      policyHash: await sha256(policySnapshot(CURRENT)),
      purchaserName: "alice Buyer",
      purchaserEmail: "alice-buyer@example.test",
      seatIds: seats.map((seat) => seat._id),
      sessionId: f.ids.session,
      courseId: f.ids.course,
      actor: "guest",
      ip: "203.0.113.9",
      userAgent: "Mozilla/5.0 (Policy test)",
    });
    expect(row?.recordedAt).toBeGreaterThan(Date.now() - 60_000);
  });

  it("fills each Stripe id once and never edits the agreement itself", async () => {
    const f = await fixture();
    const order = await f.register("bob");
    const [before] = await f.acknowledgements(order.orderId);
    await f.pay(order);
    const [paid] = await f.acknowledgements(order.orderId);
    expect(paid?.stripeCheckoutSession).toBe("cs_bob");
    expect(paid?.stripePaymentIntent).toBe("pi_bob");
    await f.t.run((ctx) =>
      linkStripePayment(ctx, order.orderId, {
        checkoutSession: "cs_other",
        paymentIntent: "pi_other",
      })
    );
    const [after] = await f.acknowledgements(order.orderId);
    expect(after?.stripeCheckoutSession).toBe("cs_bob");
    expect(after?.stripePaymentIntent).toBe("pi_bob");
    const {
      stripeCheckoutSession: _s,
      stripePaymentIntent: _p,
      ...evidence
    } = after ?? {};
    const {
      stripeCheckoutSession: _bs,
      stripePaymentIntent: _bp,
      ...original
    } = before ?? {};
    expect(evidence).toEqual(original);
  });

  it("has a single writer that only inserts rows and fills Stripe ids", () => {
    const convex = new URL("../../convex/", import.meta.url);
    const writers = readdirSync(convex)
      .filter((name) => name.endsWith(".ts"))
      .filter((name) =>
        readFileSync(new URL(name, convex), "utf8").includes(
          "registrationPolicyAcknowledgements"
        )
      );
    expect(writers.sort()).toEqual([
      "registrationPolicy.ts",
      "registrationSchema.ts",
    ]);
    const source = readFileSync(
      new URL("registrationPolicy.ts", convex),
      "utf8"
    );
    expect(source).not.toMatch(DELETE_OR_REPLACE);
    expect(source.match(PATCH)).toHaveLength(1);
    expect(source.match(INSERT)).toHaveLength(1);
  });

  it("detects a record edited behind the application's back", async () => {
    const f = await fixture();
    const order = await f.register("carol");
    const intact = await f.adminClient.query(api.registrationPolicy.evidence, {
      orderId: order.orderId,
    });
    expect(intact?.acknowledgements[0]?.integrity).toMatchObject({
      digestMatches: true,
      hashMatches: true,
    });
    await f.t.run(async (ctx) => {
      const [row] = await ctx.db
        .query("registrationPolicyAcknowledgements")
        .collect();
      if (row) {
        await ctx.db.patch(row._id, { ip: "192.0.2.1" });
      }
    });
    const tampered = await f.adminClient.query(
      api.registrationPolicy.evidence,
      { orderId: order.orderId }
    );
    expect(tampered?.acknowledgements[0]?.integrity.digestMatches).toBe(false);
    await expect(
      f.outsiderClient.query(api.registrationPolicy.evidence, {
        orderId: order.orderId,
      })
    ).rejects.toThrow();
  });

  it("keeps an old order on the version it agreed to after the policy changes", async () => {
    const f = await fixture();
    const before = await f.register("early");
    const next: CancellationPolicy = {
      ...CURRENT,
      version: "2099-01-01",
      publishedAt: "2099-01-01",
      keyTerms: ["A changed term."],
    };
    policy.next = next;
    await expect(f.register("lagging")).rejects.toThrow("was updated");
    const after = await f.register("late", {
      version: next.version,
      label: AGREEMENT_LABEL,
    });
    await f.pay(before);
    await f.pay(after);
    const [old] = await f.acknowledgements(before.orderId);
    const [fresh] = await f.acknowledgements(after.orderId);
    expect(old?.policyVersion).toBe(CURRENT.version);
    expect(old?.policySnapshot).toBe(policySnapshot(CURRENT));
    expect(old?.policySnapshot).not.toContain("A changed term.");
    expect(fresh?.policyVersion).toBe("2099-01-01");
    expect(fresh?.policySnapshot).toContain("A changed term.");
    expect((await f.receipt(before.orderId)).mail?.body).toContain(
      `version ${CURRENT.version}`
    );
    expect((await f.receipt(after.orderId)).mail?.body).toContain(
      "version 2099-01-01"
    );
  });

  it("pins every published version, so an old version can't be edited in place", async () => {
    const pinned: Record<string, string> = {
      "2026-11-25": await sha256(policySnapshot(CURRENT)),
    };
    const hashes = Object.fromEntries(
      await Promise.all(
        CANCELLATION_POLICIES.map(
          async (each) =>
            [each.version, await sha256(policySnapshot(each))] as const
        )
      )
    );
    expect(hashes).toEqual(pinned);
    expect(pinned["2026-11-25"]).toBe(
      "2438ed638a78f56a53cb6eff31d98c9701570fd1b968b1c7b18d14efa58570b7"
    );
  });
});

describe("Cancellation policy in confirmation emails", () => {
  it("tells a click-through purchaser which version they agreed to and when", async () => {
    const f = await fixture();
    const order = await f.register("dana");
    await f.pay(order);
    const { mail } = await f.receipt(order.orderId);
    const url = `${ORIGIN}/cancellation-policy/v/${CURRENT.version}`;
    const today = new Date().toLocaleDateString("en-US", {
      dateStyle: "long",
      timeZone: "America/Los_Angeles",
    });
    expect(mail?.body).toContain(
      `You agreed to our Cancellation Policy (version ${CURRENT.version}) on ${today}. Read that version at [${url}](${url})`
    );
  });

  it("states the policy in the attendee's confirmation without saying they agreed", async () => {
    const f = await fixture();
    const order = await f.register("gale");
    await f.pay(order);
    const job = await f.t.run(async (ctx) =>
      (await ctx.db.query("registrationJobs").collect()).find(
        (row) =>
          row.key.startsWith("confirmation:") &&
          row.recipient === "gale@example.test"
      )
    );
    if (!job) {
      throw new Error("Missing confirmation");
    }
    const mail = await f.t.mutation(internal.registrationMail.claim, {
      id: job._id,
    });
    expect(mail?.body).toContain(
      `This registration is subject to our Cancellation Policy (version ${CURRENT.version})`
    );
    expect(mail?.body).not.toContain("You agreed");
    expect(mail?.body).not.toContain("Total paid");
  });

  it("labels staff bookings and invoices as disclosures, not agreements", async () => {
    const f = await fixture();
    const offline = await f.adminClient.mutation(api.registration.reserve, {
      ...f.input("walkin"),
      admin: { overbook: false, reason: "Paid cash", payment: "offline" },
    });
    const { mail } = await f.receipt(offline.orderId);
    expect(mail?.body).toContain(
      `This registration is subject to our Cancellation Policy (version ${CURRENT.version})`
    );
    expect(mail?.body).not.toContain("You agreed");
    const unpaid = await f.adminClient.mutation(api.registration.reserve, {
      ...f.input("company"),
      admin: { overbook: false, reason: "Group", payment: "unpaid" },
    });
    const invoiceId = await f.adminClient.mutation(
      api.registrationGroups.createInvoice,
      {
        orderId: unpaid.orderId,
        billToName: "Acme",
        billToEmail: "ap@acme.example.test",
        billToAddress: "1 Main St",
        city: "Vancouver",
        state: "WA",
        postalCode: "98660",
        poNumber: "",
        notes: "",
        dueDays: 30,
      }
    );
    policy.next = { ...CURRENT, version: "2099-01-01" };
    await f.t.mutation(internal.registrationGroups.attachStripeInvoice, {
      id: invoiceId,
      stripeInvoiceId: "in_1",
      stripeCustomerId: "cus_1",
      hostedUrl: "https://invoice.stripe.test/in_1",
      tax: 0,
      policyVersion: CURRENT.version,
    });
    const rows = await f.acknowledgements(unpaid.orderId);
    expect(rows[1]?.policyVersion).toBe(CURRENT.version);
    expect(rows.map((row) => [row.kind, row.channel, row.ip])).toEqual([
      ["disclosed", "staff-booking", null],
      ["disclosed", "invoice", null],
    ]);
    expect(rows[1]?.statement).toMatch(NOT_CLICK_THROUGH);
    const job = await f.t.run((ctx) =>
      ctx.db
        .query("registrationJobs")
        .withIndex("by_key", (q) => q.eq("key", `invoice:${invoiceId}`))
        .unique()
    );
    const invoiceMail = job
      ? await f.t.mutation(internal.registrationMail.claim, { id: job._id })
      : null;
    expect(invoiceMail?.body).toContain(
      `This registration is subject to our Cancellation Policy (version ${CURRENT.version})`
    );
  });
});

describe("Dispute evidence export", () => {
  async function paidAndEmailed() {
    const f = await fixture();
    const order = await f.register("erin");
    await f.pay(order);
    const { job, mail } = await f.receipt(order.orderId);
    await f.t.mutation(internal.registrationMail.result, {
      id: job._id,
      success: true,
      providerId: "re_receipt",
      deliveredTo: "erin-buyer@example.test",
      copy: { subject: mail?.subject ?? "", text: mail?.body ?? "" },
    });
    await f.t.run((ctx) =>
      ctx.db.insert("registrationEmailTracking", {
        providerId: "re_receipt",
        status: "delivered",
        statusAt: Date.now(),
        deliveredAt: Date.now(),
        opens: 0,
        clicks: 0,
      })
    );
    return { f, order };
  }

  it("exports every evidence field, the policy snapshot, and the delivered email", async () => {
    const { f, order } = await paidAndEmailed();
    const data = await f.adminClient.query(api.registrationPolicy.evidence, {
      orderId: order.orderId,
    });
    if (!data) {
      throw new Error("Missing evidence");
    }
    const text = JSON.stringify(evidenceSections(data, ORIGIN));
    for (const expected of [
      AGREEMENT_LABEL,
      CURRENT.version,
      data.acknowledgements[0]?.policyHash ?? "missing",
      `${ORIGIN}/cancellation-policy/v/${CURRENT.version}`,
      "203.0.113.9",
      "Mozilla/5.0 (Policy test)",
      "erin Buyer <erin-buyer@example.test>",
      order.orderId,
      data.order.seats[0]?.id ?? "missing",
      f.ids.session,
      "cs_erin",
      "pi_erin",
      "Passed: the record and policy text match their stored hashes",
      "Purchaser confirmation (receipt)",
      "re_receipt",
      "delivered at",
      "You agreed to our Cancellation Policy",
      "Rescheduling requests made 7 or more days",
    ]) {
      expect(text).toContain(expected);
    }
    const pdf = await evidencePdf(data, ORIGIN);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);
  });

  it("lets only admins download the PDF", async () => {
    const { f, order } = await paidAndEmailed();
    const file = await f.adminClient.action(
      api.registrationEvidence.exportEvidence,
      { orderId: order.orderId }
    );
    expect(file.filename).toBe(`dispute-evidence-${order.orderId}.pdf`);
    expect(atob(file.base64).startsWith("%PDF-")).toBe(true);
    await expect(
      f.outsiderClient.action(api.registrationEvidence.exportEvidence, {
        orderId: order.orderId,
      })
    ).rejects.toThrow();
  });

  async function disputeDrafts(f: Awaited<ReturnType<typeof fixture>>) {
    await f.t.finishAllScheduledFunctions(vi.runAllTimers);
    return await f.t.run((ctx) =>
      ctx.db.query("registrationDisputes").collect()
    );
  }

  it("drafts Stripe dispute evidence once, without submitting it", async () => {
    vi.useFakeTimers();
    const { f, order } = await paidAndEmailed();
    const delivery = { disputeId: "dp_1", paymentIntent: "pi_erin" };
    await f.t.mutation(internal.registrationDisputes.opened, delivery);
    await f.t.mutation(internal.registrationDisputes.opened, delivery);
    const [draft] = await disputeDrafts(f);
    vi.useRealTimers();
    expect(draft).toMatchObject({ state: "drafted", fileId: "file_evidence" });
    expect(stripe.files).toHaveLength(1);
    expect(stripe.files[0]).toMatchObject({ purpose: "dispute_evidence" });
    expect(stripe.disputes).toHaveLength(1);
    const [update] = stripe.disputes;
    expect(update?.id).toBe("dp_1");
    expect(update?.params.submit).toBe(false);
    expect(update?.params.evidence).toMatchObject({
      cancellation_policy: "file_evidence",
      refund_policy: "file_evidence",
      customer_email_address: "erin-buyer@example.test",
      customer_purchase_ip: "203.0.113.9",
    });
    const evidence = update?.params.evidence as
      | { cancellation_policy_disclosure: string }
      | undefined;
    expect(evidence?.cancellation_policy_disclosure).toContain(AGREEMENT_LABEL);
    const activity = await f.t.run((ctx) =>
      ctx.db
        .query("registrationActivity")
        .withIndex("by_entity", (q) => q.eq("entity", order.orderId))
        .collect()
    );
    expect(activity.map((row) => row.action)).toContain(
      "dispute-evidence-drafted"
    );
  });

  it("retries a failed dispute draft and flags it for staff after the last try", async () => {
    vi.useFakeTimers();
    const { f } = await paidAndEmailed();
    stripe.disputeFailures = 2;
    await f.t.mutation(internal.registrationDisputes.opened, {
      disputeId: "dp_retry",
      paymentIntent: "pi_erin",
    });
    const [recovered] = await disputeDrafts(f);
    expect(recovered).toMatchObject({ state: "drafted", attempts: 2 });
    expect(stripe.files).toHaveLength(1);
    stripe.disputeFailures = 10;
    await f.t.mutation(internal.registrationDisputes.opened, {
      disputeId: "dp_down",
      paymentIntent: "pi_erin",
    });
    const drafts = await disputeDrafts(f);
    vi.useRealTimers();
    expect(drafts.find((row) => row.disputeId === "dp_down")).toMatchObject({
      state: "failed",
      attempts: 5,
      error: "Stripe is unavailable",
    });
    const attention = await f.adminClient.query(
      api.registrationOperations.attention,
      {}
    );
    expect(attention.disputes.map((row) => row.disputeId)).toEqual(["dp_down"]);
    const [failed] = attention.disputes;
    if (!failed) {
      throw new Error("Missing failed dispute");
    }
    await expect(
      f.outsiderClient.mutation(api.registrationDisputes.markHandled, {
        id: failed._id,
      })
    ).rejects.toThrow();
    await f.adminClient.mutation(api.registrationDisputes.markHandled, {
      id: failed._id,
    });
    const cleared = await f.adminClient.query(
      api.registrationOperations.attention,
      {}
    );
    expect(cleared.disputes).toHaveLength(0);
  });

  it("drafts a dispute that arrived before its payment settled", async () => {
    vi.useFakeTimers();
    const f = await fixture();
    const order = await f.register("early");
    const unlinked = await f.t.run((ctx) =>
      ctx.db.insert("registrationDisputes", {
        disputeId: "dp_unlinked",
        paymentIntent: "pi_nobody",
        state: "pending",
        attempts: 0,
      })
    );
    await f.t.action(internal.registrationEvidence.prefillDispute, {
      disputeId: "dp_unlinked",
    });
    expect(await f.t.run((ctx) => ctx.db.get(unlinked))).toMatchObject({
      state: "pending",
      attempts: 1,
      error: "No order is linked to this payment yet",
    });
    await f.t.run((ctx) =>
      ctx.db.insert("registrationDisputes", {
        disputeId: "dp_early",
        paymentIntent: "pi_early",
        state: "failed",
        attempts: 5,
        error: "No order is linked to this payment yet",
      })
    );
    await f.pay(order);
    const drafts = await disputeDrafts(f);
    vi.useRealTimers();
    expect(drafts.find((row) => row.disputeId === "dp_early")).toMatchObject({
      state: "drafted",
    });
    expect(stripe.disputes.map((row) => row.id)).toEqual(["dp_early"]);
  });

  it("dates the disputed service in the class's own time zone", async () => {
    const { f, order } = await paidAndEmailed();
    const data = await f.adminClient.query(api.registrationPolicy.evidence, {
      orderId: order.orderId,
    });
    if (!data) {
      throw new Error("Missing evidence");
    }
    const evening = {
      ...data,
      order: {
        ...data.order,
        sessionStart: Date.UTC(2026, 11, 5, 2),
        sessionTimeZone: "America/Los_Angeles",
      },
    };
    expect(disputeEvidenceText(evening, ORIGIN)?.service_date).toBe(
      "2026-12-04"
    );
  });
});
