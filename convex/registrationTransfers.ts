import { v } from "convex/values";
import { BATCH, quote } from "../shared/registration/domain";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { audit, offering, settle, staff } from "./registrationHelpers";
import { allocateRefund } from "./registrationRefundAllocation";

export const transfer = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    sessionId: v.id("registrationSessions"),
    choice: v.union(
      v.literal("collect"),
      v.literal("refund"),
      v.literal("keep")
    ),
    reason: v.string(),
    requestKey: v.string(),
  },
  returns: v.object({
    orderId: v.id("registrationOrders"),
    seatId: v.id("registrationSeats"),
    adjustment: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Transfer reason required");
    }
    const previous = await previousTransfer(ctx, args.seatId);
    if (previous) {
      return previous;
    }
    const source = await ctx.db.get(args.seatId);
    const target = await ctx.db.get(args.sessionId);
    if (
      !source?.settledAt ||
      source.state !== "active" ||
      !target ||
      target.state !== "open" ||
      target._id === source.sessionId
    ) {
      throw new Error(
        "Choose a settled active registration and a different open session"
      );
    }
    const { config } = await offering(ctx, target.courseId, target._id);
    if (target.reserved >= target.capacity) {
      throw new Error("Target session is full");
    }
    const duplicate = await ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_email", (q) =>
        q.eq("sessionId", target._id).eq("email", source.email)
      )
      .take(BATCH);
    if (
      duplicate.some((seat) => seat.state === "active" || seat.state === "held")
    ) {
      throw new Error("Attendee already registered in destination");
    }
    const selections = new Set(config.materials.map((m) => m.id));
    const [snapshot] = quote(
      config,
      [
        {
          ...source.snapshot.attendee,
          selected: source.snapshot.attendee.selected.filter((id) =>
            selections.has(id)
          ),
          waived: source.snapshot.attendee.waived.filter((id) =>
            selections.has(id)
          ),
        },
      ],
      null,
      0
    );
    if (!snapshot) {
      throw new Error("Unable to price transfer");
    }
    const difference = snapshot.total - source.snapshot.total;
    if (difference > 0 && args.choice === "refund") {
      throw new Error("Choose collect or keep for a higher-price transfer");
    }
    if (difference < 0 && args.choice === "collect") {
      throw new Error("Choose refund or keep for a lower-price transfer");
    }
    const sourceOrder = await ctx.db.get(source.orderId);
    if (!sourceOrder) {
      throw new Error("Original order missing");
    }
    const adjustment = args.choice === "keep" ? 0 : difference;
    const total = Math.max(0, adjustment);
    const orderId = await ctx.db.insert("registrationOrders", {
      requestKey: args.requestKey,
      purchaser: sourceOrder.purchaser,
      purchaserName: sourceOrder.purchaserName,
      courseId: target.courseId,
      sessionId: target._id,
      title: target.title,
      status: "unpaid",
      seats: [
        {
          ...snapshot,
          lines: [
            {
              id: "adjustment",
              title: "Transfer price difference",
              cents: total,
              discount: 0,
            },
          ],
          total,
        },
      ],
      total,
      currency: "usd",
      expires: Date.now() + 1_800_000,
      couponUses: 0,
      restoredUses: 0,
      refunded: 0,
      refundReserved: 0,
    });
    const seatId = await ctx.db.insert("registrationSeats", {
      orderId,
      courseId: target.courseId,
      sessionId: target._id,
      email: source.email,
      name: source.name,
      state: "held",
      snapshot,
      outcomeDefinitions: config.outcomes,
      transferredFrom: source._id,
    });
    await ctx.db.patch(target._id, { reserved: target.reserved + 1 });
    await ctx.db.patch(source._id, { state: "transferred" });
    if (source.sessionId) {
      const old = await ctx.db.get(source.sessionId);
      if (old) {
        await ctx.db.patch(old._id, { reserved: old.reserved - 1 });
      }
    }
    // Preserve historical assignments, and reference matching already-delivered assets without consuming stock again.
    const oldEntitlements = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", source._id))
      .take(BATCH);
    await Promise.all(
      oldEntitlements
        .filter(
          (e) =>
            e.state === "ready" &&
            snapshot.materials.some((m) => m.materialId === e.materialId)
        )
        .map(({ _id, _creationTime, ...entitlement }) =>
          ctx.db.insert("registrationEntitlements", { ...entitlement, seatId })
        )
    );
    const pendingEntitlements = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", source._id))
      .take(BATCH);
    await Promise.all(
      pendingEntitlements
        .filter((e) => e.state === "pending")
        .map((e) => ctx.db.patch(e._id, { state: "canceled" }))
    );
    await queueTransferRefund(
      ctx,
      sourceOrder,
      adjustment,
      args.requestKey,
      args.reason,
      actor.userId
    );
    if (total === 0) {
      const order = await ctx.db.get(orderId);
      if (order) {
        await settle(ctx, order, "transfer");
      }
    }
    await ctx.db.insert("registrationTransfers", {
      from: source._id,
      to: seatId,
      actor: actor.userId,
      reason: args.reason,
      adjustment,
      choice: args.choice,
      at: Date.now(),
    });
    await audit(
      ctx,
      actor.userId,
      "registration-transferred",
      source._id,
      `${target._id}: ${adjustment}; ${args.reason}`
    );
    return { orderId, seatId, adjustment };
  },
});

async function previousTransfer(
  ctx: QueryCtx,
  seatId: Id<"registrationSeats">
) {
  const previous = await ctx.db
    .query("registrationTransfers")
    .withIndex("by_from", (q) => q.eq("from", seatId))
    .first();
  if (previous) {
    const destination = await ctx.db.get(previous.to);
    if (!destination) {
      throw new Error("Transfer requires reconciliation");
    }
    return {
      orderId: destination.orderId,
      seatId: destination._id,
      adjustment: previous.adjustment,
    };
  }
  return null;
}

async function queueTransferRefund(
  ctx: MutationCtx,
  sourceOrder: Doc<"registrationOrders">,
  adjustment: number,
  requestKey: string,
  reason: string,
  actorId: Id<"users">
) {
  if (adjustment < 0) {
    const refund = -adjustment;
    if (
      !sourceOrder.paymentIntent ||
      refund >
        sourceOrder.total - sourceOrder.refunded - sourceOrder.refundReserved
    ) {
      throw new Error(
        "Original payment cannot support this refund; choose keep or reconcile first"
      );
    }
    await ctx.db.patch(sourceOrder._id, {
      refundReserved: sourceOrder.refundReserved + refund,
    });
    await ctx.db.insert("registrationRefunds", {
      orderId: sourceOrder._id,
      key: `transfer:${requestKey}`,
      cents: refund,
      allocations: await allocateRefund(ctx, sourceOrder, refund),
      reason,
      actor: actorId,
      state: "pending",
    });
  }
}

export const preview = query({
  args: {
    seatId: v.id("registrationSeats"),
    sessionId: v.id("registrationSessions"),
  },
  returns: v.object({
    original: v.number(),
    destination: v.number(),
    difference: v.number(),
  }),
  handler: async (ctx, args) => {
    await staff(ctx);
    const seat = await ctx.db.get(args.seatId);
    const target = await ctx.db.get(args.sessionId);
    if (!(seat && target)) {
      throw new Error("Registration or session missing");
    }
    const { config } = await offering(ctx, target.courseId, target._id);
    const allowed = new Set(config.materials.map((m) => m.id));
    const [priced] = quote(
      config,
      [
        {
          ...seat.snapshot.attendee,
          selected: seat.snapshot.attendee.selected.filter((id) =>
            allowed.has(id)
          ),
          waived: seat.snapshot.attendee.waived.filter((id) => allowed.has(id)),
        },
      ],
      null,
      0
    );
    if (!priced) {
      throw new Error("Unable to price transfer");
    }
    return {
      original: seat.snapshot.total,
      destination: priced.total,
      difference: priced.total - seat.snapshot.total,
    };
  },
});
