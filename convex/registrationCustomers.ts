import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import {
  registrationIsLive,
  registrationStripeKey,
} from "../shared/registration/environment";
import {
  type CustomerDetails,
  customerKey,
  findOrCreateCustomer,
  type InvoiceOrganizations,
  normalizeEmail,
} from "../shared/stripe-customer";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  action,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "./_generated/server";

/** A claim older than this belongs to a crashed action and can be taken over. */
const CLAIM_MS = 60_000;
const POLL_MS = 500;
const POLLS = 30;

async function row(ctx: Pick<QueryCtx, "db">, key: string, live: boolean) {
  return await ctx.db
    .query("registrationStripeCustomers")
    .withIndex("by_key_and_live", (q) => q.eq("key", key).eq("live", live))
    .unique();
}

export const stored = internalQuery({
  args: { key: v.string(), live: v.boolean() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) =>
    (await row(ctx, args.key, args.live))?.stripeCustomerId ?? null,
});

/**
 * Serializes Customer creation per purchaser: the first caller gets the claim
 * and talks to Stripe while concurrent callers wait for the stored id.
 */
export const claim = internalMutation({
  args: {
    key: v.string(),
    live: v.boolean(),
    email: v.string(),
    organizationId: v.optional(v.id("registrationOrganizations")),
    token: v.string(),
  },
  returns: v.object({
    customer: v.optional(v.string()),
    claimed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await row(ctx, args.key, args.live);
    if (existing?.stripeCustomerId) {
      return { customer: existing.stripeCustomerId, claimed: false };
    }
    if (existing?.claimedAt && existing.claimedAt > Date.now() - CLAIM_MS) {
      return { claimed: false };
    }
    const fields = { claim: args.token, claimedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("registrationStripeCustomers", {
        key: args.key,
        live: args.live,
        email: normalizeEmail(args.email),
        organizationId: args.organizationId,
        ...fields,
      });
    }
    return { claimed: true };
  },
});

export const release = internalMutation({
  args: { key: v.string(), live: v.boolean(), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await row(ctx, args.key, args.live);
    if (
      existing &&
      !existing.stripeCustomerId &&
      existing.claim === args.token
    ) {
      await ctx.db.patch(existing._id, {
        claim: undefined,
        claimedAt: undefined,
      });
    }
    return null;
  },
});

/** Keeps the first stored Customer; a later caller gets that id back. */
export const store = internalMutation({
  args: {
    key: v.string(),
    live: v.boolean(),
    email: v.string(),
    organizationId: v.optional(v.id("registrationOrganizations")),
    customer: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await row(ctx, args.key, args.live);
    if (existing?.stripeCustomerId) {
      return existing.stripeCustomerId;
    }
    const fields = {
      stripeCustomerId: args.customer,
      claim: undefined,
      claimedAt: undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("registrationStripeCustomers", {
        key: args.key,
        live: args.live,
        email: normalizeEmail(args.email),
        organizationId: args.organizationId,
        ...fields,
      });
    }
    return args.customer;
  },
});

/** One page of paid orders' purchasers, for the Customer backfill. */
export const paidPurchasers = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), numItems: v.number() },
  returns: v.object({
    purchasers: v.array(
      v.object({
        email: v.string(),
        name: v.string(),
        phone: v.optional(v.string()),
      })
    ),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("registrationOrders")
      .filter((q) => q.neq(q.field("settledAt"), undefined))
      .paginate({ cursor: args.cursor, numItems: args.numItems });
    return {
      purchasers: page.page.map((order) => ({
        email: order.purchaser,
        name: order.purchaserName,
        phone: order.purchaserPhone,
      })),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/** Drops a stored Customer that was deleted in Stripe so it can be found or created again. */
export const forget = internalMutation({
  args: { key: v.string(), live: v.boolean(), customer: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await row(ctx, args.key, args.live);
    if (existing?.stripeCustomerId === args.customer) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/** Organizations billed by invoices from before Customers were shared. */
export const invoiceOrganizations = internalQuery({
  args: { ids: v.array(v.string()) },
  returns: v.record(v.string(), v.string()),
  handler: async (ctx, args) => {
    const owners: Record<string, string> = {};
    const invoices = await Promise.all(
      args.ids.map(async (id) => {
        const invoiceId = ctx.db.normalizeId("registrationInvoices", id);
        return invoiceId ? await ctx.db.get(invoiceId) : null;
      })
    );
    for (const invoice of invoices) {
      if (invoice?.organizationId) {
        owners[invoice._id] = invoice.organizationId;
      }
    }
    return owners;
  },
});

export function legacyOwners(ctx: ActionCtx): InvoiceOrganizations {
  return (ids) =>
    ctx.runQuery(internal.registrationCustomers.invoiceOrganizations, { ids });
}

export const organization = internalQuery({
  args: { id: v.id("registrationOrganizations") },
  returns: v.union(
    v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      address: v.object({
        line1: v.string(),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postal_code: v.optional(v.string()),
        country: v.string(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) {
      return null;
    }
    return {
      name: org.name,
      email: org.contactEmail,
      phone: org.phone,
      address: {
        line1: org.address,
        city: org.city,
        state: org.state,
        postal_code: org.postalCode,
        country: org.country || "US",
      },
    };
  },
});

/** Bill-to details for an organization's own Stripe Customer. */
export async function organizationCustomer(
  ctx: ActionCtx,
  organizationId: Id<"registrationOrganizations">
): Promise<CustomerDetails> {
  const org = await ctx.runQuery(internal.registrationCustomers.organization, {
    id: organizationId,
  });
  if (!org) {
    throw new ConvexError("Organization not found");
  }
  return {
    ...org,
    address: org.address.line1 ? org.address : undefined,
    organizationId,
  };
}

/**
 * Finds or creates the purchaser's Stripe Customer once per email (or
 * organization) and remembers it, so checkouts and invoices for the same
 * person share one Customer even when they start at the same moment.
 */
export async function stripeCustomerFor(
  ctx: ActionCtx,
  client: Stripe,
  details: CustomerDetails,
  polls = POLLS
): Promise<string> {
  const live = registrationIsLive();
  const key = customerKey(details);
  const organizationId = details.organizationId as
    | Id<"registrationOrganizations">
    | undefined;
  const token = crypto.randomUUID();
  const result = await ctx.runMutation(internal.registrationCustomers.claim, {
    key,
    live,
    email: details.email,
    organizationId,
    token,
  });
  if (result.customer) {
    const current = await client.customers.retrieve(result.customer);
    if (!current.deleted) {
      return result.customer;
    }
    await ctx.runMutation(internal.registrationCustomers.forget, {
      key,
      live,
      customer: result.customer,
    });
    return await stripeCustomerFor(ctx, client, details, polls);
  }
  if (result.claimed) {
    try {
      const customer = await findOrCreateCustomer(
        client,
        details,
        legacyOwners(ctx)
      );
      return await ctx.runMutation(internal.registrationCustomers.store, {
        key,
        live,
        email: details.email,
        organizationId,
        customer,
      });
    } catch (error) {
      await ctx.runMutation(internal.registrationCustomers.release, {
        key,
        live,
        token,
      });
      throw error;
    }
  }
  if (polls <= 0) {
    throw new ConvexError(
      "We couldn't prepare your payment yet. Please try again in a moment."
    );
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  return await stripeCustomerFor(ctx, client, details, polls - 1);
}

/** The signed-in person's own Customer, for the eCard checkout routes. */
export const signedInCustomer = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const profile = await ctx.runQuery(api.profiles.getProfile, {});
    if (!profile?.email) {
      throw new ConvexError("Sign in to buy eCards");
    }
    const client = new Stripe(registrationStripeKey(), {
      apiVersion: "2026-09-30.endive",
    });
    return await stripeCustomerFor(ctx, client, { email: profile.email });
  },
});
