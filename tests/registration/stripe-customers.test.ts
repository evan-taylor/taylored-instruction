import { convexTest } from "convex-test";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as cartCheckout } from "../../app/api/create-cart-checkout/route";
import { POST as ecardCheckout } from "../../app/api/create-checkout-session/route";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import {
  completeCustomer,
  findOrCreateCustomer,
} from "../../shared/stripe-customer";
import { agreement } from "./fixtures/policy";

type FakeCustomer = {
  id: string;
  email: string | null;
  name?: string | null;
  phone?: string | null;
  address?: Record<string, string | undefined> | null;
  created: number;
  metadata: Record<string, string>;
  deleted?: boolean;
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
  failUpdate: false,
  voided: [] as string[],
  beforeFinalize: undefined as (() => void) | undefined,
}));

vi.mock("stripe", async (original) => {
  const actual = await original<typeof import("stripe")>();
  const pause = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  class FakeStripe {
    static readonly errors = actual.default.errors;
    readonly customers = {
      list: ({ email }: { email: string }) => ({
        autoPagingToArray: async () => {
          stripe.lists += 1;
          await pause(stripe.listDelay);
          return stripe.customers.filter(
            (c) => !c.deleted && c.email === email
          );
        },
      }),
      search: ({ query }: { query: string }) => ({
        autoPagingToArray: async () => {
          await pause(0);
          const email = query.slice(7, -1);
          return stripe.customers.filter(
            (c) => !c.deleted && c.email?.toLowerCase() === email
          );
        },
      }),
      retrieve: async (id: string) => {
        await pause(0);
        const found = stripe.customers.find((c) => c.id === id);
        return found?.deleted || !found ? { id, deleted: true } : found;
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
        const customer: FakeCustomer = {
          id: `cus_${stripe.customers.length + 1}`,
          email: params.email,
          name: null,
          phone: null,
          address: null,
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
        if (stripe.failUpdate) {
          throw new Error("Update failed");
        }
        stripe.updated.push({ id, params });
        const customer = stripe.customers.find((c) => c.id === id);
        if (customer) {
          Object.assign(customer, params);
        }
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
      voidInvoice: async (id: string) => {
        await pause(0);
        stripe.voided.push(id);
        return { id };
      },
      finalizeInvoice: async (id: string) => {
        await pause(0);
        const total = stripe.items.get(id) ?? 0;
        const index = Number(id.slice(3)) - 1;
        if (stripe.beforeFinalize) {
          stripe.beforeFinalize();
        }
        const customer = stripe.customers.find(
          (c) => c.id === stripe.invoices[index]?.customer
        );
        return {
          id,
          customer_name: customer?.name,
          customer_address: customer?.address,
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
const signedIn = vi.hoisted(() => ({
  customer: "cus_signed_in" as string | null,
}));
vi.mock("@/lib/signed-in-customer", () => ({
  signedInCustomer: async () => {
    await Promise.resolve();
    return signedIn.customer;
  },
}));
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
  stripe.failUpdate = false;
  stripe.voided.length = 0;
  stripe.beforeFinalize = undefined;
  signedIn.customer = "cus_signed_in";
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
    cancellationPolicy: agreement,
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

const findId = async (
  details: Parameters<typeof findOrCreateCustomer>[1],
  owners?: Parameters<typeof findOrCreateCustomer>[2]
) => (await findOrCreateCustomer(client(), details, owners)).id;

describe("findOrCreateCustomer", () => {
  it("reuses the oldest Customer with the same email, whatever its case", async () => {
    const first = existingCustomer("Buyer@Example.test");
    existingCustomer("buyer@example.test");
    expect(await findId({ email: " buyer@example.test " })).toBe(first);
    expect(stripe.created).toHaveLength(0);
  });
  it("creates under a key every path shares, then completes name and phone", async () => {
    const details = {
      email: "New@Example.test",
      name: "New Buyer",
      phone: "+15555550100",
    };
    const customer = await findOrCreateCustomer(client(), details);
    expect(stripe.created).toEqual([
      {
        params: { email: "new@example.test", metadata: {} },
        idempotencyKey: "stripe-customer:email:new@example.test",
      },
    ]);
    await completeCustomer(client(), customer, details);
    expect(stripe.updated).toEqual([
      { id: customer.id, params: { name: "New Buyer", phone: "+15555550100" } },
    ]);
    stripe.customers.length = 0;
    expect(await findId({ email: "new@example.test" })).toBe(customer.id);
    expect(stripe.created).toHaveLength(1);
  });
  it("creates an organization's Customer with the same request whatever its billing email", async () => {
    const first = await findId({
      email: "ap@example.test",
      organizationId: "org_1",
    });
    stripe.customers.length = 0;
    const retried = await findId({
      email: "billing@example.test",
      organizationId: "org_1",
    });
    expect(retried).toBe(first);
    expect(stripe.created).toEqual([
      {
        params: { metadata: { registrationOrganization: "org_1" } },
        idempotencyKey: "stripe-customer:organization:org_1",
      },
    ]);
  });
  it("keeps organization and individual Customers apart", async () => {
    const org = existingCustomer("buyer@example.test", {
      registrationOrganization: "org_1",
    });
    expect(await findId({ email: "buyer@example.test" })).not.toBe(org);
    expect(
      await findId({ email: "buyer@example.test", organizationId: "org_1" })
    ).toBe(org);
  });
  it("treats a Customer from an old organization invoice as the organization's and tags it", async () => {
    const legacy = existingCustomer("buyer@example.test", {
      registrationInvoice: "inv_org",
    });
    const owners = async (ids: string[]) => {
      await Promise.resolve();
      return Object.fromEntries(
        ids.filter((id) => id === "inv_org").map((id) => [id, "org_1"])
      );
    };
    expect(await findId({ email: "buyer@example.test" }, owners)).not.toBe(
      legacy
    );
    const details = { email: "buyer@example.test", organizationId: "org_1" };
    const found = await findOrCreateCustomer(client(), details, owners);
    expect(found.id).toBe(legacy);
    await completeCustomer(client(), found, details);
    expect(stripe.updated.at(-1)).toEqual({
      id: legacy,
      params: { metadata: { registrationOrganization: "org_1" } },
    });
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
    stripe.customers.push({
      id: "cus_stored",
      email: "buyer@example.test",
      created: 0,
      metadata: {},
    });
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
  it("replaces a stored Customer that was deleted in Stripe", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.insert("registrationStripeCustomers", {
        key: "email:buyer@example.test",
        live: false,
        email: "buyer@example.test",
        stripeCustomerId: "cus_deleted",
      })
    );
    const session = await checkout(f);
    expect(session?.customer).toBe(stripe.customers[0]?.id);
    expect(session?.customer).not.toBe("cus_deleted");
    const rows = await f.t.run((ctx) =>
      ctx.db.query("registrationStripeCustomers").collect()
    );
    expect(rows.map((r) => r.stripeCustomerId)).toEqual([session?.customer]);
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
  it("stores a new Customer before completing it, so a failed update is not lost", async () => {
    const f = await fixture();
    stripe.failUpdate = true;
    await expect(checkout(f)).rejects.toThrow("Update failed");
    stripe.failUpdate = false;
    const session = await checkout(f);
    expect(stripe.created).toHaveLength(1);
    expect(session?.customer).toBe(stripe.customers[0]?.id);
    expect(stripe.customers[0]).toMatchObject({ name: "Pat Buyer" });
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
      cancellationPolicy: agreement,
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
        name: "Pat Buyer",
        email: "buyer@example.test",
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

describe("Invoice billing details", () => {
  it("voids the invoice when another payment changes the Customer before finalizing", async () => {
    const f = await fixture();
    stripe.beforeFinalize = () => {
      const [customer] = stripe.customers;
      if (customer) {
        customer.name = "Someone Else";
      }
    };
    await expect(invoice(f)).rejects.toThrow("Void this invoice");
    expect(stripe.voided).toEqual(["in_1"]);
  });
});

describe("eCard checkout Customers", () => {
  const request = (url: string, body: Params) =>
    new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
  it("passes the signed-in account's Customer on single and cart eCard checkouts", async () => {
    const single = await ecardCheckout(
      request("https://site.example.test/api/create-checkout-session", {
        priceId: "price_1",
        email: "someone.else@example.test",
        quantity: 2,
        metadata: {},
      })
    );
    expect(single.status).toBe(200);
    const cart = await cartCheckout(
      request("https://site.example.test/api/create-cart-checkout", {
        lineItems: [{ price: "price_1", quantity: 1 }],
        metadata: {},
      })
    );
    expect(cart.status).toBe(200);
    expect(stripe.sessions).toHaveLength(2);
    for (const session of stripe.sessions) {
      expect(session).toMatchObject({
        customer: "cus_signed_in",
        customer_update: { address: "auto", name: "auto" },
        automatic_tax: { enabled: true },
      });
      expect(session).not.toHaveProperty("customer_email");
    }
  });
  it("refuses eCard checkout without a signed-in account", async () => {
    signedIn.customer = null;
    const response = await cartCheckout(
      request("https://site.example.test/api/create-cart-checkout", {
        lineItems: [{ price: "price_1", quantity: 1 }],
        metadata: {},
      })
    );
    expect(response.status).toBe(401);
    expect(stripe.sessions).toHaveLength(0);
  });
  it("finds the Customer for the account's own email, shared with registration", async () => {
    const f = await fixture();
    await expect(
      f.t.action(api.registrationCustomers.signedInCustomer, {})
    ).rejects.toThrow("Sign in");
    const ecard = await f.adminClient.action(
      api.registrationCustomers.signedInCustomer,
      {}
    );
    const session = await checkout(f, ADMIN_EMAILS[0]);
    expect(session?.customer).toBe(ecard);
    expect(stripe.created).toHaveLength(1);
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
