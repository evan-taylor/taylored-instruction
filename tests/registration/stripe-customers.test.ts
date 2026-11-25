import { convexTest } from "convex-test";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as cartCheckout } from "../../app/api/create-cart-checkout/route";
import { POST as ecardCheckout } from "../../app/api/create-checkout-session/route";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import { findOrCreateCustomer } from "../../shared/stripe-customer";

type FakeCustomer = {
  id: string;
  email: string | null;
  name?: string;
  created: number;
  metadata: Record<string, string>;
};
type Params = Record<string, unknown>;

const stripe = vi.hoisted(() => ({
  customers: [] as FakeCustomer[],
  created: [] as { params: Params; idempotencyKey?: string }[],
  updated: [] as { id: string; params: Params }[],
  sessions: [] as Params[],
  invoices: [] as Params[],
  items: new Map<string, number>(),
  keys: new Map<string, FakeCustomer>(),
  listDelay: 0,
  lists: 0,
  failCreate: false,
}));

vi.mock("stripe", async (original) => {
  const actual = await original<typeof import("stripe")>();
  const pause = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  class FakeStripe {
    static readonly errors = actual.default.errors;
    readonly customers = {
      list: async ({ email }: { email: string }) => {
        stripe.lists += 1;
        await pause(stripe.listDelay);
        return { data: stripe.customers.filter((c) => c.email === email) };
      },
      create: async (
        params: Params & { email: string; metadata?: Record<string, string> },
        options?: { idempotencyKey?: string }
      ) => {
        await pause(0);
        if (stripe.failCreate) {
          throw new Error("Stripe unavailable");
        }
        const reused = options?.idempotencyKey
          ? stripe.keys.get(options.idempotencyKey)
          : undefined;
        if (reused) {
          return reused;
        }
        const customer = {
          id: `cus_${stripe.customers.length + 1}`,
          email: params.email,
          name: params.name as string | undefined,
          created: stripe.customers.length + 1,
          metadata: params.metadata ?? {},
        };
        stripe.customers.push(customer);
        stripe.created.push({
          params,
          idempotencyKey: options?.idempotencyKey,
        });
        if (options?.idempotencyKey) {
          stripe.keys.set(options.idempotencyKey, customer);
        }
        return customer;
      },
      update: async (id: string, params: Params) => {
        await pause(0);
        stripe.updated.push({ id, params });
        return { id };
      },
    };
    readonly checkout = {
      sessions: {
        create: async (params: Params) => {
          await pause(0);
          stripe.sessions.push(params);
          const id = `cs_${stripe.sessions.length}`;
          return {
            id,
            client_secret: `${id}_secret`,
            url: `https://checkout.stripe.test/${id}`,
            livemode: false,
          };
        },
      },
    };
    readonly products = {
      retrieve: async (id: string) => {
        await pause(0);
        return { id };
      },
    };
    readonly invoices = {
      create: async (params: Params) => {
        await pause(0);
        stripe.invoices.push(params);
        return { id: `in_${stripe.invoices.length}` };
      },
      finalizeInvoice: async (id: string) => {
        await pause(0);
        const total = stripe.items.get(id) ?? 0;
        return {
          id,
          livemode: false,
          hosted_invoice_url: `https://invoice.stripe.test/${id}`,
          invoice_pdf: null,
          subtotal: total,
          total_excluding_tax: total,
          total,
        };
      },
    };
    readonly invoiceItems = {
      create: async (params: {
        invoice: string;
        price_data: { unit_amount: number };
      }) => {
        await pause(0);
        stripe.items.set(
          params.invoice,
          (stripe.items.get(params.invoice) ?? 0) +
            params.price_data.unit_amount
        );
        return {};
      },
    };
  }
  return { default: FakeStripe };
});
vi.mock("@/lib/posthog", () => ({ default: () => null }));
vi.mock("@/instrumentation", () => ({
  flushPostHogLogs: async () => {
    await Promise.resolve();
  },
  getPostHogLogLogger: () => null,
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: () => null,
}));

const modules = import.meta.glob("../../convex/**/*.ts");

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_customer_fixture");
  vi.stubEnv("SITE_URL", "https://site.example.test");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://site.example.test");
  stripe.customers.length = 0;
  stripe.created.length = 0;
  stripe.updated.length = 0;
  stripe.sessions.length = 0;
  stripe.invoices.length = 0;
  stripe.items.clear();
  stripe.keys.clear();
  stripe.listDelay = 0;
  stripe.lists = 0;
  stripe.failCreate = false;
});
afterEach(() => vi.unstubAllEnvs());

function existingCustomer(
  email: string,
  metadata: Record<string, string> = {}
) {
  const customer = {
    id: `cus_existing_${stripe.customers.length + 1}`,
    email,
    created: stripe.customers.length + 1,
    metadata,
  };
  stripe.customers.push(customer);
  return customer.id;
}

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    });
    const course = await ctx.db.insert("registrationCourses", {
      slug: "blended",
      title: "Blended course",
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
      title: "Test class",
      code: "customer-code",
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
          instructions: "Private",
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
    const organization = await ctx.db.insert("registrationOrganizations", {
      name: "Acme Safety",
      contactName: "Pat Buyer",
      contactEmail: "buyer@example.test",
      phone: "+15555550100",
      address: "1 Main St",
      city: "Vancouver",
      state: "WA",
      postalCode: "98660",
      country: "US",
      notes: "",
      archived: false,
    });
    return { course, session, organization, admin };
  });
  return {
    t,
    ...ids,
    adminClient: t.withIdentity({ subject: `${ids.admin}|session` }),
  };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

function attempt(f: Fixture, purchaser = "buyer@example.test") {
  return {
    courseId: f.course,
    sessionId: f.session,
    requestKey: crypto.randomUUID(),
    purchaser,
    purchaserName: "Pat Buyer",
    purchaserPhone: "(555) 555-0100",
    attendees: [
      {
        name: "Student",
        email: `student-${crypto.randomUUID()}@example.test`,
        selected: [],
        waived: [],
        answers: [],
      },
    ],
  };
}

async function checkout(f: Fixture, purchaser?: string) {
  const args = attempt(f, purchaser);
  const order = await f.t.mutation(api.registration.reserve, args);
  await f.t.action(api.registrationExternal.checkout, {
    orderId: order.orderId,
    requestKey: args.requestKey,
  });
  return stripe.sessions.at(-1);
}

const bill = {
  billToName: "Pat Buyer",
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

async function invoice(f: Fixture, organizationId?: Fixture["organization"]) {
  const order = await f.adminClient.mutation(api.registration.reserve, {
    ...attempt(f),
    admin: { payment: "unpaid", overbook: false, reason: "Group booking" },
  });
  const id = await f.adminClient.mutation(
    api.registrationGroups.createInvoice,
    {
      orderId: order.orderId,
      organizationId,
      ...bill,
    }
  );
  await f.adminClient.action(api.registrationInvoiceActions.issue, { id });
  return await f.t.run((ctx) => ctx.db.get(id));
}

const client = () => new Stripe("sk_test_customer_fixture");

describe("findOrCreateCustomer", () => {
  it("reuses the oldest Customer with the same email, whatever its case", async () => {
    const first = existingCustomer("buyer@example.test");
    existingCustomer("buyer@example.test");
    expect(
      await findOrCreateCustomer(
        client(),
        { email: " Buyer@Example.test " },
        "key"
      )
    ).toBe(first);
    expect(stripe.created).toHaveLength(0);
  });
  it("finds a Customer stored with a mixed-case email", async () => {
    const mixed = existingCustomer("Buyer@Example.test");
    expect(
      await findOrCreateCustomer(
        client(),
        { email: "Buyer@Example.test" },
        "key"
      )
    ).toBe(mixed);
  });
  it("creates a Customer with a normalized email, name, and phone", async () => {
    const id = await findOrCreateCustomer(
      client(),
      { email: "New@Example.test", name: "New Buyer", phone: "+15555550100" },
      "key"
    );
    expect(stripe.created).toEqual([
      {
        params: {
          email: "new@example.test",
          name: "New Buyer",
          phone: "+15555550100",
          address: undefined,
          metadata: {},
        },
        idempotencyKey: "key",
      },
    ]);
    expect(id).toBe(stripe.customers[0]?.id);
  });
  it("keeps organization and individual Customers apart", async () => {
    const org = existingCustomer("buyer@example.test", {
      registrationOrganization: "org_1",
    });
    const person = await findOrCreateCustomer(
      client(),
      { email: "buyer@example.test" },
      "person"
    );
    expect(person).not.toBe(org);
    expect(
      await findOrCreateCustomer(
        client(),
        { email: "buyer@example.test", organizationId: "org_1" },
        "org"
      )
    ).toBe(org);
  });
});

describe("Registration checkout Customers", () => {
  it("attaches a new Customer instead of a guest email and stores it", async () => {
    const f = await fixture();
    const session = await checkout(f);
    expect(stripe.created).toHaveLength(1);
    const [customer] = stripe.customers;
    expect(customer).toMatchObject({
      email: "buyer@example.test",
      name: "Pat Buyer",
    });
    expect(session).toMatchObject({
      customer: customer?.id,
      customer_update: { address: "auto", name: "auto" },
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
    });
    expect(session).not.toHaveProperty("customer_email");
    const rows = await f.t.run((ctx) =>
      ctx.db.query("registrationStripeCustomers").collect()
    );
    expect(rows).toEqual([
      expect.objectContaining({
        key: "email:buyer@example.test",
        live: false,
        stripeCustomerId: customer?.id,
      }),
    ]);
  });
  it("reuses the Customer on a second checkout with the same email", async () => {
    const f = await fixture();
    const first = await checkout(f);
    const second = await checkout(f, "BUYER@example.test");
    expect(stripe.created).toHaveLength(1);
    expect(second?.customer).toBe(first?.customer);
  });
  it("uses a stored Customer id without searching Stripe", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.insert("registrationStripeCustomers", {
        key: "email:buyer@example.test",
        live: false,
        email: "buyer@example.test",
        stripeCustomerId: "cus_stored",
      })
    );
    const session = await checkout(f);
    expect(session?.customer).toBe("cus_stored");
    expect(stripe.lists).toBe(0);
  });
  it("links an existing Stripe Customer found by email", async () => {
    const f = await fixture();
    const existing = existingCustomer("buyer@example.test");
    const session = await checkout(f);
    expect(session?.customer).toBe(existing);
    expect(stripe.created).toHaveLength(0);
  });
  it("creates one Customer when two checkouts for one email start together", async () => {
    const f = await fixture();
    stripe.listDelay = 200;
    const sessions = await Promise.all([checkout(f), checkout(f)]);
    expect(stripe.created).toHaveLength(1);
    expect(new Set(sessions.map((s) => s?.customer)).size).toBe(1);
  });
  it("lets only one caller claim a purchaser until the Customer is stored", async () => {
    const f = await fixture();
    const base = {
      key: "email:buyer@example.test",
      live: false,
      email: "buyer@example.test",
    };
    const claim = (token: string) =>
      f.t.mutation(internal.registrationCustomers.claim, { ...base, token });
    expect(await claim("a")).toEqual({ claimed: true });
    expect(await claim("b")).toEqual({ claimed: false });
    await f.t.mutation(internal.registrationCustomers.store, {
      ...base,
      customer: "cus_first",
    });
    expect(
      await f.t.mutation(internal.registrationCustomers.store, {
        ...base,
        customer: "cus_second",
      })
    ).toBe("cus_first");
    expect(await claim("c")).toEqual({
      customer: "cus_first",
      claimed: false,
    });
  });
  it("frees the claim when Stripe fails so the next checkout can retry", async () => {
    const f = await fixture();
    stripe.failCreate = true;
    await expect(checkout(f)).rejects.toThrow("Stripe unavailable");
    const [row] = await f.t.run((ctx) =>
      ctx.db.query("registrationStripeCustomers").collect()
    );
    expect(row?.claim).toBeUndefined();
    stripe.failCreate = false;
    const session = await checkout(f);
    expect(session?.customer).toBe(stripe.customers[0]?.id);
  });
  it("charges a requested card payment for an organization to the organization's own Customer", async () => {
    const f = await fixture();
    const person = await checkout(f);
    const args = attempt(f);
    const order = await f.adminClient.mutation(api.registration.reserve, {
      ...args,
      admin: {
        payment: "unpaid",
        overbook: false,
        reason: "Group booking",
        organizationId: f.organization,
      },
    });
    const requestKey = await f.t.run(
      async (ctx) => (await ctx.db.get(order.orderId))?.requestKey ?? ""
    );
    await f.t.mutation(api.registrationPayments.beginRequestedPayment, {
      orderId: order.orderId,
      requestKey,
    });
    await f.t.action(api.registrationExternal.checkout, {
      orderId: order.orderId,
      requestKey,
    });
    expect(stripe.sessions.at(-1)?.customer).not.toBe(person?.customer);
    expect(stripe.customers.at(-1)).toMatchObject({
      email: "buyer@example.test",
      name: "Acme Safety",
      metadata: { registrationOrganization: f.organization },
    });
  });
});

describe("Invoice Customers", () => {
  it("invoices a past buyer on the Customer their checkout created", async () => {
    const f = await fixture();
    const session = await checkout(f);
    const issued = await invoice(f);
    expect(stripe.created).toHaveLength(1);
    expect(issued?.stripeCustomerId).toBe(session?.customer);
    expect(stripe.invoices.at(-1)?.customer).toBe(session?.customer);
    expect(stripe.updated.at(-1)).toEqual({
      id: session?.customer,
      params: {
        address: {
          line1: "100 Main St",
          city: "Vancouver",
          state: "WA",
          postal_code: "98660",
          country: "US",
        },
      },
    });
  });
  it("keeps the organization's bill-to Customer apart from the person's", async () => {
    const f = await fixture();
    const session = await checkout(f);
    const first = await invoice(f, f.organization);
    const second = await invoice(f, f.organization);
    expect(first?.stripeCustomerId).not.toBe(session?.customer);
    expect(second?.stripeCustomerId).toBe(first?.stripeCustomerId);
    expect(stripe.created).toHaveLength(2);
    expect(stripe.updated.at(-1)?.params).toMatchObject({
      name: "Pat Buyer",
      email: "buyer@example.test",
    });
  });
});

describe("eCard checkout Customers", () => {
  const request = (url: string, body: Params) =>
    new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
  it("passes a Customer on single and cart eCard checkouts and reuses it", async () => {
    const single = await ecardCheckout(
      request("https://site.example.test/api/create-checkout-session", {
        priceId: "price_1",
        email: "Ecard@Example.test",
        quantity: 2,
        metadata: {},
      })
    );
    expect(single.status).toBe(200);
    const cart = await cartCheckout(
      request("https://site.example.test/api/create-cart-checkout", {
        lineItems: [{ price: "price_1", quantity: 1 }],
        email: "ecard@example.test",
        metadata: {},
      })
    );
    expect(cart.status).toBe(200);
    expect(stripe.created).toHaveLength(1);
    const customer = stripe.customers[0]?.id;
    for (const session of stripe.sessions) {
      expect(session).toMatchObject({
        customer,
        customer_update: { address: "auto", name: "auto" },
        automatic_tax: { enabled: true },
      });
      expect(session).not.toHaveProperty("customer_email");
    }
  });
});

describe("Customer backfill", () => {
  async function paidOrder(f: Fixture, purchaser: string) {
    await f.t.run((ctx) =>
      ctx.db.insert("registrationOrders", {
        requestKey: crypto.randomUUID(),
        purchaser,
        purchaserName: "Past Buyer",
        courseId: f.course,
        title: "Past class",
        status: "settled",
        seats: [],
        total: 0,
        currency: "usd",
        expires: 0,
        couponUses: 0,
        restoredUses: 0,
        refunded: 0,
        refundReserved: 0,
        settledAt: Date.now(),
      })
    );
  }
  it("reports what it would do on a dry run, then links and creates once", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.insert("registrationStripeCustomers", {
        key: "email:stored@example.test",
        live: false,
        email: "stored@example.test",
        stripeCustomerId: "cus_stored",
      });
      await ctx.db.insert("registrationOrders", {
        requestKey: crypto.randomUUID(),
        purchaser: "abandoned@example.test",
        purchaserName: "Never Paid",
        courseId: f.course,
        title: "Past class",
        status: "expired",
        seats: [],
        total: 0,
        currency: "usd",
        expires: 0,
        couponUses: 0,
        restoredUses: 0,
        refunded: 0,
        refundReserved: 0,
      });
    });
    const known = existingCustomer("known@example.test");
    const duplicates = [
      existingCustomer("twice@example.test"),
      existingCustomer("twice@example.test"),
    ];
    await Promise.all(
      [
        "stored@example.test",
        "known@example.test",
        "new@example.test",
        "new@example.test",
        "twice@example.test",
      ].map((email) => paidOrder(f, email))
    );
    const dry = await f.t.action(internal.registrationCustomerBackfill.run, {
      dryRun: true,
    });
    expect(dry).toEqual({
      dryRun: true,
      live: false,
      orders: 5,
      purchasers: 4,
      alreadyStored: 1,
      link: 1,
      create: 1,
      conflicts: [{ email: "twice@example.test", customers: duplicates }],
      cursor: null,
    });
    expect(stripe.created).toHaveLength(0);
    expect(
      await f.t.run((ctx) =>
        ctx.db.query("registrationStripeCustomers").collect()
      )
    ).toHaveLength(1);

    const real = await f.t.action(internal.registrationCustomerBackfill.run, {
      dryRun: false,
    });
    expect(real).toMatchObject({ link: 1, create: 1, alreadyStored: 1 });
    expect(stripe.created).toHaveLength(1);
    const rows = await f.t.run((ctx) =>
      ctx.db.query("registrationStripeCustomers").collect()
    );
    expect(
      Object.fromEntries(rows.map((r) => [r.email, r.stripeCustomerId]))
    ).toEqual({
      "stored@example.test": "cus_stored",
      "known@example.test": known,
      "new@example.test": stripe.customers.at(-1)?.id,
    });

    const again = await f.t.action(internal.registrationCustomerBackfill.run, {
      dryRun: false,
    });
    expect(again).toMatchObject({ link: 0, create: 0, alreadyStored: 3 });
    expect(stripe.created).toHaveLength(1);
  });
});
