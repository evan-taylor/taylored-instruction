"use node";
import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import {
  registrationIsLive,
  registrationStripeKey,
} from "../shared/registration/environment";
import {
  type CustomerDetails,
  customerKey,
  matchingCustomers,
  normalizeEmail,
} from "../shared/stripe-customer";
import { rateLimitedHttpClient } from "../shared/stripe-rate-limit";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";
import { legacyOwners, stripeCustomerFor } from "./registrationCustomers";

const PAGE = 25;
/**
 * Stop starting purchasers, and stop waiting out 429s, early enough to return
 * a cursor before Convex's 10-minute action limit.
 */
const BUDGET_MS = 8 * 60_000;
const NETWORK_RETRIES = 3;
/** Stripe's live Search limit is about 20 requests a second, shared with checkout traffic. */
const SEARCH_INTERVAL_MS = 250;
const RATE_LIMIT_RETRIES = 6;
const RATE_LIMIT_BASE_MS = 1000;
const RATE_LIMIT_MAX_MS = 16_000;

type Tally = {
  orders: number;
  purchasers: number;
  alreadyStored: number;
  link: number;
  create: number;
  conflicts: { email: string; customers: string[] }[];
};

type Stopped = "done" | "limit" | "budget" | "rateLimited" | "error";

/** Where to resume: a page of paid orders and how many of its orders are already handled. */
type Position = { page: string | null; skip: number };

type Job = {
  ctx: ActionCtx;
  client: Stripe;
  live: boolean;
  dryRun: boolean;
  deadline: number;
  limit: number;
  seen: Set<string>;
  tally: Tally;
};

type Halt = { stopped: Exclude<Stopped, "done">; skip: number; error?: string };

function encodeCursor(position: Position) {
  return Buffer.from(JSON.stringify(position)).toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): Position {
  if (!cursor) {
    return { page: null, skip: 0 };
  }
  try {
    const position = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as Partial<Position>;
    if (
      (typeof position.page === "string" || position.page === null) &&
      Number.isInteger(position.skip) &&
      (position.skip ?? -1) >= 0
    ) {
      return { page: position.page, skip: position.skip ?? 0 };
    }
  } catch {
    // Reported below.
  }
  throw new ConvexError("Unrecognized cursor. Pass the cursor a run returned.");
}

async function visit(
  job: Job,
  purchaser: CustomerDetails
): Promise<"stored" | "link" | "create" | string[]> {
  const stored = await job.ctx.runQuery(internal.registrationCustomers.stored, {
    key: customerKey(purchaser),
    live: job.live,
  });
  if (stored) {
    return "stored";
  }
  const matches = await matchingCustomers(
    job.client,
    purchaser,
    legacyOwners(job.ctx)
  );
  if (matches.length > 1) {
    return matches.map((customer) => customer.id);
  }
  if (!job.dryRun) {
    await stripeCustomerFor(job.ctx, job.client, purchaser);
  }
  return matches.length ? "link" : "create";
}

/** Visits one page's purchasers one at a time, from `index` on. */
async function purchasers(
  job: Job,
  page: CustomerDetails[],
  index: number
): Promise<Halt | null> {
  const purchaser = page[index];
  if (!purchaser) {
    return null;
  }
  if (Date.now() > job.deadline) {
    return { stopped: "budget", skip: index };
  }
  const email = normalizeEmail(purchaser.email);
  if (!job.seen.has(email)) {
    if (job.tally.purchasers >= job.limit) {
      return { stopped: "limit", skip: index };
    }
    let result: Awaited<ReturnType<typeof visit>>;
    try {
      result = await visit(job, purchaser);
    } catch (error) {
      return {
        stopped:
          error instanceof Stripe.errors.StripeRateLimitError
            ? "rateLimited"
            : "error",
        skip: index,
        error: `${email}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    job.seen.add(email);
    job.tally.purchasers += 1;
    if (Array.isArray(result)) {
      job.tally.conflicts.push({ email, customers: result });
    } else if (result === "stored") {
      job.tally.alreadyStored += 1;
    } else {
      job.tally[result] += 1;
    }
  }
  job.tally.orders += 1;
  return await purchasers(job, page, index + 1);
}

async function pages(
  job: Job,
  position: Position
): Promise<{ stopped: Stopped; at: Position | null; error?: string }> {
  const page = await job.ctx.runQuery(
    internal.registrationCustomers.paidPurchasers,
    { cursor: position.page, numItems: PAGE }
  );
  const halt = await purchasers(job, page.purchasers, position.skip);
  if (halt) {
    return {
      stopped: halt.stopped,
      at: { page: position.page, skip: halt.skip },
      error: halt.error,
    };
  }
  if (page.isDone) {
    return { stopped: "done", at: null };
  }
  return await pages(job, { page: page.continueCursor, skip: 0 });
}

/**
 * Finds or creates a Stripe Customer for every past paid purchaser who has
 * none stored, so staff can invoice them later. Past guest payments stay
 * guest payments: Stripe cannot attach them to a Customer afterwards.
 *
 * Purchasers are handled one at a time with Stripe Search paced and 429s
 * retried with backoff. `link` counts purchasers matched to one existing
 * Customer and `create` those who need a new one; with dryRun nothing is
 * written and the counts say what a real run would do. Purchasers with
 * several matching Customers are reported under `conflicts` and left alone.
 *
 * A run stops after `limit` purchasers, near the action time limit, or when
 * Stripe keeps rate limiting or fails, and says why in `stopped`. Unless it
 * is `done`, pass `next` as the arguments of the next run; the purchaser it
 * stopped on is retried. Reruns are safe: Customers created before a failure
 * are found and linked instead of created again.
 */
export const run = internalAction({
  args: {
    dryRun: v.boolean(),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
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
    stopped: v.union(
      v.literal("done"),
      v.literal("limit"),
      v.literal("budget"),
      v.literal("rateLimited"),
      v.literal("error")
    ),
    error: v.union(v.string(), v.null()),
    cursor: v.union(v.string(), v.null()),
    next: v.union(
      v.object({
        dryRun: v.boolean(),
        cursor: v.string(),
        limit: v.optional(v.number()),
      }),
      v.null()
    ),
  }),
  handler: async (ctx, args) => {
    if (
      args.limit !== undefined &&
      !(Number.isInteger(args.limit) && args.limit > 0)
    ) {
      throw new ConvexError("limit must be a positive whole number");
    }
    const live = registrationIsLive();
    const deadline = Date.now() + BUDGET_MS;
    const client = new Stripe(registrationStripeKey(), {
      apiVersion: "2026-09-30.endive",
      maxNetworkRetries: NETWORK_RETRIES,
      httpClient: rateLimitedHttpClient(Stripe.createNodeHttpClient(), {
        retries: RATE_LIMIT_RETRIES,
        baseMs: RATE_LIMIT_BASE_MS,
        maxMs: RATE_LIMIT_MAX_MS,
        searchIntervalMs: SEARCH_INTERVAL_MS,
        deadline,
      }),
    });
    const tally: Tally = {
      orders: 0,
      purchasers: 0,
      alreadyStored: 0,
      link: 0,
      create: 0,
      conflicts: [],
    };
    const result = await pages(
      {
        ctx,
        client,
        live,
        dryRun: args.dryRun,
        deadline,
        limit: args.limit ?? Number.POSITIVE_INFINITY,
        seen: new Set(),
        tally,
      },
      decodeCursor(args.cursor)
    );
    const cursor = result.at ? encodeCursor(result.at) : null;
    return {
      dryRun: args.dryRun,
      live,
      ...tally,
      stopped: result.stopped,
      error: result.error ?? null,
      cursor,
      next: cursor
        ? {
            dryRun: args.dryRun,
            cursor,
            ...(args.limit === undefined ? {} : { limit: args.limit }),
          }
        : null,
    };
  },
});
