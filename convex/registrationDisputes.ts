import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { audit, staff } from "./registrationHelpers";
import schema from "./schema";

const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 60_000;

/**
 * Records each Stripe dispute once and queues its evidence draft. Stripe may
 * deliver the event more than once; later deliveries change nothing.
 */
export const opened = internalMutation({
  args: { disputeId: v.string(), paymentIntent: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("registrationDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .unique();
    if (existing) {
      return null;
    }
    const order = await ctx.db
      .query("registrationOrders")
      .withIndex("by_paymentIntent", (q) =>
        q.eq("paymentIntent", args.paymentIntent)
      )
      .first();
    await ctx.db.insert("registrationDisputes", {
      ...args,
      orderId: order?._id,
      state: "pending",
      attempts: 0,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.registrationEvidence.prefillDispute,
      { disputeId: args.disputeId }
    );
    return null;
  },
});

/**
 * A dispute can arrive before the payment webhook links its PaymentIntent to
 * the order. Linking the payment reopens drafts that gave up meanwhile.
 */
export async function reopenDisputes(ctx: MutationCtx, paymentIntent: string) {
  const rows = await ctx.db
    .query("registrationDisputes")
    .withIndex("by_paymentIntent", (q) => q.eq("paymentIntent", paymentIntent))
    .take(10);
  await Promise.all(
    rows
      .filter((row) => row.state === "failed" || row.state === "no-evidence")
      .map(async (row) => {
        await ctx.db.patch(row._id, {
          state: "pending",
          attempts: 0,
          error: undefined,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.registrationEvidence.prefillDispute,
          { disputeId: row.disputeId }
        );
      })
  );
}

/** Clears a failed draft from the attention list once staff submit evidence themselves. */
export const markHandled = mutation({
  args: { id: v.id("registrationDisputes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const row = await ctx.db.get(args.id);
    if (row?.state !== "failed") {
      return null;
    }
    await ctx.db.patch(row._id, { state: "handled" });
    await audit(
      ctx,
      actor.userId,
      "dispute-evidence-handled",
      row.orderId ?? row.disputeId,
      `Stripe dispute ${row.disputeId}: evidence submitted by staff after the draft failed`
    );
    return null;
  },
});

export const get = internalQuery({
  args: { disputeId: v.string() },
  returns: v.union(doc(schema, "registrationDisputes"), v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("registrationDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .unique(),
});

export const fileUploaded = internalMutation({
  args: { disputeId: v.string(), fileId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("registrationDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { fileId: args.fileId });
    }
    return null;
  },
});

/**
 * Settles one draft attempt: drafted, nothing to draft, or a failure that is
 * retried with backoff and, after the last attempt, left for staff.
 */
export const result = internalMutation({
  args: {
    disputeId: v.string(),
    outcome: v.union(
      v.literal("drafted"),
      v.literal("no-evidence"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("registrationDisputes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", args.disputeId))
      .unique();
    if (row?.state !== "pending") {
      return null;
    }
    const entity = row.orderId ?? row.disputeId;
    if (args.outcome === "drafted") {
      await ctx.db.patch(row._id, { state: "drafted", error: undefined });
      await audit(
        ctx,
        "system",
        "dispute-evidence-drafted",
        entity,
        `Stripe dispute ${row.disputeId}: evidence drafted from the cancellation policy acknowledgement, not submitted`
      );
      return null;
    }
    if (args.outcome === "no-evidence") {
      await ctx.db.patch(row._id, { state: "no-evidence" });
      await audit(
        ctx,
        "system",
        "dispute-evidence-missing",
        entity,
        `Stripe dispute ${row.disputeId}: no cancellation policy acknowledgement on file, so no evidence was drafted`
      );
      return null;
    }
    const attempts = row.attempts + 1;
    const error = args.error ?? "Dispute evidence draft failed";
    if (attempts < MAX_ATTEMPTS) {
      await ctx.db.patch(row._id, { attempts, error });
      await ctx.scheduler.runAfter(
        RETRY_BASE_MS * 2 ** row.attempts,
        internal.registrationEvidence.prefillDispute,
        { disputeId: row.disputeId }
      );
      return null;
    }
    await ctx.db.patch(row._id, { attempts, error, state: "failed" });
    await audit(
      ctx,
      "system",
      "dispute-evidence-failed",
      entity,
      `Stripe dispute ${row.disputeId}: evidence draft failed after ${attempts} attempts (${error}). Export dispute evidence from the order and submit it in the Stripe Dashboard.`
    );
    return null;
  },
});
