"use node";
import { v } from "convex/values";
import Stripe from "stripe";
import {
  registrationIsLive,
  registrationStripeKey,
} from "../shared/registration/environment";
import {
  type CustomerDetails,
  matchingCustomers,
  normalizeEmail,
} from "../shared/stripe-customer";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";
import { customerKey, stripeCustomerFor } from "./registrationCustomers";

const PAGE = 25;
/** Stop early enough to return a cursor before Convex's 10-minute action limit. */
const BUDGET_MS = 8 * 60_000;
const NETWORK_RETRIES = 3;

type Tally = {
  orders: number;
  purchasers: number;
  alreadyStored: number;
  link: number;
  create: number;
  conflicts: { email: string; customers: string[] }[];
};

async function visit(
  ctx: ActionCtx,
  client: Stripe,
  live: boolean,
  dryRun: boolean,
  purchaser: CustomerDetails
): Promise<"stored" | "link" | "create" | string[]> {
  const stored = await ctx.runQuery(internal.registrationCustomers.stored, {
    key: customerKey(purchaser),
    live,
  });
  if (stored) {
    return "stored";
  }
  const matches = await matchingCustomers(client, purchaser);
  if (matches.length > 1) {
    return matches.map((customer) => customer.id);
  }
  if (!dryRun) {
    await stripeCustomerFor(ctx, client, purchaser);
  }
  return matches.length ? "link" : "create";
}

async function pages(
  ctx: ActionCtx,
  args: { dryRun: boolean; cursor: string | null; deadline: number },
  client: Stripe,
  live: boolean,
  seen: Set<string>,
  tally: Tally
): Promise<string | null> {
  const page = await ctx.runQuery(
    internal.registrationCustomers.paidPurchasers,
    {
      cursor: args.cursor,
      numItems: PAGE,
    }
  );
  tally.orders += page.purchasers.length;
  const fresh = page.purchasers.filter((purchaser) => {
    const email = normalizeEmail(purchaser.email);
    if (seen.has(email)) {
      return false;
    }
    seen.add(email);
    return true;
  });
  tally.purchasers += fresh.length;
  const results = await Promise.all(
    fresh.map((purchaser) => visit(ctx, client, live, args.dryRun, purchaser))
  );
  for (const [index, result] of results.entries()) {
    if (Array.isArray(result)) {
      tally.conflicts.push({
        email: normalizeEmail(fresh[index]?.email ?? ""),
        customers: result,
      });
    } else if (result === "stored") {
      tally.alreadyStored += 1;
    } else {
      tally[result] += 1;
    }
  }
  if (page.isDone) {
    return null;
  }
  if (Date.now() > args.deadline) {
    return page.continueCursor;
  }
  return await pages(
    ctx,
    { ...args, cursor: page.continueCursor },
    client,
    live,
    seen,
    tally
  );
}

/**
 * Finds or creates a Stripe Customer for every past paid purchaser who has
 * none stored, so staff can invoice them later. Past guest payments stay
 * guest payments: Stripe cannot attach them to a Customer afterwards.
 *
 * `link` counts purchasers matched to one existing Customer and `create`
 * those who need a new one; with dryRun nothing is written and the counts say
 * what a real run would do. Purchasers with several matching Customers are reported under
 * `conflicts` and left alone. Pass the returned cursor to continue.
 */
export const run = internalAction({
  args: {
    dryRun: v.boolean(),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    dryRun: v.boolean(),
    live: v.boolean(),
    orders: v.number(),
    purchasers: v.number(),
    alreadyStored: v.number(),
    link: v.number(),
    create: v.number(),
    conflicts: v.array(
      v.object({ email: v.string(), customers: v.array(v.string()) })
    ),
    cursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const live = registrationIsLive();
    const client = new Stripe(registrationStripeKey(), {
      apiVersion: "2026-09-30.endive",
      maxNetworkRetries: NETWORK_RETRIES,
    });
    const tally: Tally = {
      orders: 0,
      purchasers: 0,
      alreadyStored: 0,
      link: 0,
      create: 0,
      conflicts: [],
    };
    const cursor = await pages(
      ctx,
      {
        dryRun: args.dryRun,
        cursor: args.cursor ?? null,
        deadline: Date.now() + BUDGET_MS,
      },
      client,
      live,
      new Set(),
      tally
    );
    return { dryRun: args.dryRun, live, ...tally, cursor };
  },
});
