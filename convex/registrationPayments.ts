import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { BATCH, cents } from "../shared/registration/domain";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { audit, offering, release, settle, staff } from "./registrationHelpers";
import { allocateRefund } from "./registrationRefundAllocation";
import schema from "./schema";

export const checkoutOrder = internalQuery({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: doc(schema, "registrationOrders"),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || order.requestKey !== args.requestKey) {
      throw new Error("Order not found");
    }
    if (order.status !== "hold" || order.expires <= Date.now()) {
      throw new Error("Checkout has expired or is already complete");
    }
    const { course, session, config } = await offering(
      ctx,
      order.courseId,
      order.sessionId
    );
    const coupon = order.couponId ? await ctx.db.get(order.couponId) : null;
    if (
      !course.enrollmentOpen ||
      course.publication !== "published" ||
      coupon?.disabled ||
      (session &&
        (session.state !== "open" ||
          Date.now() >= session.firstStart - config.cutoffMinutes * 60_000))
    ) {
      throw new Error(
        "This checkout is no longer eligible; contact us for help"
      );
    }
    return order;
  },
});
export const attachCheckout = internalMutation({
  args: {
    orderId: v.id("registrationOrders"),
    session: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (
      !order ||
      (order.stripeSession && order.stripeSession !== args.session)
    ) {
      throw new Error("Checkout mismatch");
    }
    await ctx.db.patch(order._id, {
      stripeSession: args.session,
      checkoutUrl: args.url,
    });
    return null;
  },
});
export const checkoutFailed = internalMutation({
  args: { orderId: v.id("registrationOrders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (order) {
      await release(ctx, order, "Checkout creation failed");
    }
    return null;
  },
});
export const paymentEvent = internalMutation({
  args: {
    eventId: v.string(),
    orderId: v.id("registrationOrders"),
    session: v.string(),
    amount: v.number(),
    currency: v.string(),
    paid: v.boolean(),
    live: v.boolean(),
    type: v.string(),
    paymentIntent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.live) {
      throw new Error("Registration accepts test-mode events only");
    }
    const event = await ctx.db
      .query("registrationEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (event) {
      return null;
    }
    const order = await ctx.db.get(args.orderId);
    if (
      !order ||
      (order.stripeSession && order.stripeSession !== args.session) ||
      order.currency !== args.currency ||
      order.total !== args.amount
    ) {
      throw new Error("Payment does not match the authoritative quote");
    }
    if (!order.stripeSession) {
      throw new Error("Checkout attachment pending; retry event");
    }
    if (
      args.type === "checkout.session.expired" ||
      args.type === "checkout.session.async_payment_failed"
    ) {
      await release(ctx, order, args.type);
    } else if (args.paid) {
      await settle(ctx, order, "stripe-test", args.paymentIntent);
    } else {
      return null;
    }
    await ctx.db.insert("registrationEvents", {
      eventId: args.eventId,
      orderId: order._id,
      type: args.type,
      at: Date.now(),
    });
    return null;
  },
});
export const expire = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("registrationOrders")
      .withIndex("by_status_and_expires", (q) =>
        q.eq("status", "hold").lte("expires", Date.now())
      )
      .take(BATCH);
    await orders.reduce(async (prior, order) => {
      await prior;
      await release(
        ctx,
        order,
        "Reservation expired; late payments require reconciliation"
      );
    }, Promise.resolve());
    return null;
  },
});
export const requestRefund = mutation({
  args: {
    orderId: v.id("registrationOrders"),
    cents: v.number(),
    key: v.string(),
    reason: v.string(),
  },
  returns: v.id("registrationRefunds"),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    cents(args.cents);
    if (!args.reason.trim() || args.cents <= 0 || args.key.length < 24) {
      throw new Error("Refund amount, reason, and operation key required");
    }
    const previous = await ctx.db
      .query("registrationRefunds")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (previous) {
      return previous._id;
    }
    const order = await ctx.db.get(args.orderId);
    if (
      !order?.paymentIntent ||
      order.status !== "settled" ||
      args.cents > order.total - order.refunded - order.refundReserved
    ) {
      throw new Error("Refund exceeds remaining Stripe payment");
    }
    await ctx.db.patch(order._id, {
      refundReserved: order.refundReserved + args.cents,
    });
    const id = await ctx.db.insert("registrationRefunds", {
      ...args,
      allocations: await allocateRefund(ctx, order, args.cents),
      actor: actor.userId,
      state: "pending",
    });
    await audit(
      ctx,
      actor.userId,
      "refund-requested",
      order._id,
      `${args.cents}: ${args.reason}`
    );
    return id;
  },
});
export const refundData = internalQuery({
  args: { id: v.id("registrationRefunds") },
  returns: v.object({
    refund: doc(schema, "registrationRefunds"),
    order: doc(schema, "registrationOrders"),
  }),
  handler: async (ctx, args) => {
    const refund = await ctx.db.get(args.id);
    const order = refund ? await ctx.db.get(refund.orderId) : null;
    if (!(refund && order)) {
      throw new Error("Refund not found");
    }
    return { refund, order };
  },
});
export const finishRefund = internalMutation({
  args: { id: v.id("registrationRefunds"), stripeId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const refund = await ctx.db.get(args.id);
    if (refund?.state !== "pending") {
      return null;
    }
    const order = await ctx.db.get(refund.orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    await ctx.db.patch(refund._id, {
      state: "succeeded",
      stripeId: args.stripeId,
    });
    await ctx.db.patch(order._id, {
      refunded: order.refunded + refund.cents,
      refundReserved: order.refundReserved - refund.cents,
    });
    await audit(
      ctx,
      refund.actor,
      "refund-completed",
      order._id,
      `${refund.cents}`
    );
    return null;
  },
});
export const createPaymentLink = mutation({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (order?.status !== "unpaid" || args.requestKey.length < 24) {
      throw new Error("Unpaid order required");
    }
    await ctx.db.patch(order._id, {
      status: "hold",
      requestKey: args.requestKey,
      expires: Date.now() + 1_800_000,
    });
    await audit(
      ctx,
      actor.userId,
      "payment-link-requested",
      order._id,
      "30-minute payment reservation"
    );
    return null;
  },
});
export const pendingRefunds = internalQuery({
  args: {},
  returns: v.array(v.id("registrationRefunds")),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("registrationRefunds")
      .withIndex("by_state", (q) => q.eq("state", "pending"))
      .take(BATCH);
    return rows.filter((r) => r.state === "pending").map((r) => r._id);
  },
});
export const refundFailure = internalMutation({
  args: { id: v.id("registrationRefunds"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const refund = await ctx.db.get(args.id);
    if (refund?.state === "pending") {
      await ctx.db.patch(refund._id, { error: args.error });
    }
    return null;
  },
});
export const refundEvent = internalMutation({
  args: {
    id: v.id("registrationRefunds"),
    stripeId: v.string(),
    amount: v.number(),
    paymentIntent: v.string(),
    succeeded: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const refund = await ctx.db.get(args.id);
    const order = refund ? await ctx.db.get(refund.orderId) : null;
    if (
      !(refund && order) ||
      refund.cents !== args.amount ||
      order.paymentIntent !== args.paymentIntent
    ) {
      throw new Error("Refund event mismatch");
    }
    if (args.succeeded && refund.state === "pending") {
      await ctx.db.patch(refund._id, {
        state: "succeeded",
        stripeId: args.stripeId,
      });
      await ctx.db.patch(order._id, {
        refunded: order.refunded + refund.cents,
        refundReserved: order.refundReserved - refund.cents,
      });
    }
    return null;
  },
});
