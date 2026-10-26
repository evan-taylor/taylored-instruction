import { ConvexError, v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { internalMutation, query } from "./_generated/server";
import { staff } from "./registrationHelpers";
import schema from "./schema";

function firstAt(matches: boolean, previous: number | undefined, at: number) {
  return matches ? Math.min(previous ?? at, at) : previous;
}
function lastAt(matches: boolean, previous: number | undefined, at: number) {
  return matches ? Math.max(previous ?? at, at) : previous;
}

export const recordEmailEvent = internalMutation({
  args: {
    eventId: v.string(),
    providerId: v.string(),
    type: v.string(),
    at: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("registrationEmailEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) {
      return null;
    }
    await ctx.db.insert("registrationEmailEvents", args);
    const prior = await ctx.db
      .query("registrationEmailTracking")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .unique();
    const opened = args.type === "email.opened";
    const clicked = args.type === "email.clicked";
    const delivered = args.type === "email.delivered";
    // Engagement must not replace delivery failures, and late events must not
    // move the latest delivery status backwards.
    const updateStatus =
      !(opened || clicked) && (!prior || args.at >= prior.statusAt);
    const tracking = {
      providerId: args.providerId,
      status: updateStatus ? args.type : (prior?.status ?? "unknown"),
      statusAt: updateStatus ? args.at : (prior?.statusAt ?? 0),
      deliveredAt: firstAt(delivered, prior?.deliveredAt, args.at),
      openedAt: firstAt(opened, prior?.openedAt, args.at),
      clickedAt: firstAt(clicked, prior?.clickedAt, args.at),
      lastOpenedAt: lastAt(opened, prior?.lastOpenedAt, args.at),
      lastClickedAt: lastAt(clicked, prior?.lastClickedAt, args.at),
      opens: (prior?.opens ?? 0) + Number(opened),
      clicks: (prior?.clicks ?? 0) + Number(clicked),
    };
    if (prior) {
      await ctx.db.patch(prior._id, tracking);
    } else {
      await ctx.db.insert("registrationEmailTracking", tracking);
    }
    return null;
  },
});

export const history = query({
  args: { seatId: v.id("registrationSeats") },
  returns: v.object({
    emails: v.array(
      v.object({
        job: doc(schema, "registrationJobs"),
        tracking: v.union(doc(schema, "registrationEmailTracking"), v.null()),
      })
    ),
    materials: v.array(
      v.object({
        id: v.id("registrationEntitlements"),
        title: v.string(),
        firstAccessedAt: v.optional(v.number()),
        lastAccessedAt: v.optional(v.number()),
        accessCount: v.number(),
      })
    ),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Billing messages can contain purchaser details, so this history is admin-only.
    await staff(ctx);
    const seat = await ctx.db.get(args.seatId);
    if (!seat) {
      throw new ConvexError("Registration not found");
    }
    const childOrders = await ctx.db
      .query("registrationOrders")
      .withIndex("by_parentOrderId", (q) => q.eq("parentOrderId", seat.orderId))
      .take(201);
    const orderIds = [
      seat.orderId,
      ...childOrders
        .filter((order) => order.materialSeatId === seat._id)
        .map((order) => order._id),
    ];
    const invoiceGroups = await Promise.all(
      orderIds.map((orderId) =>
        ctx.db
          .query("registrationInvoices")
          .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
          .take(201)
      )
    );
    const prefixes = [
      ...orderIds.flatMap((orderId) => [
        `receipt:${orderId}`,
        `payment-request:${orderId}:`,
      ]),
      ...invoiceGroups
        .flat()
        .flatMap((invoice) => [
          `invoice:${invoice._id}`,
          `invoice-reminder:${invoice._id}:`,
        ]),
    ];
    const [seatJobs, billingJobs, materials] = await Promise.all([
      ctx.db
        .query("registrationJobs")
        .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
        .order("desc")
        .take(201),
      Promise.all(
        prefixes.map((prefix) =>
          ctx.db
            .query("registrationJobs")
            .withIndex("by_key", (q) =>
              q.gte("key", prefix).lt("key", `${prefix}\uffff`)
            )
            .take(201)
        )
      ),
      ctx.db
        .query("registrationEntitlements")
        .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
        .take(201),
    ]);
    const jobs = [
      ...new Map(
        [...seatJobs, ...billingJobs.flat()].map((job) => [job._id, job])
      ).values(),
    ].sort((a, b) => b._creationTime - a._creationTime);
    return {
      emails: await Promise.all(
        jobs.map(async (job) => ({
          job,
          tracking: job.providerId
            ? await ctx.db
                .query("registrationEmailTracking")
                .withIndex("by_providerId", (q) =>
                  q.eq("providerId", job.providerId ?? "")
                )
                .unique()
            : null,
        }))
      ),
      materials: materials.map((material) => ({
        id: material._id,
        title: material.title,
        firstAccessedAt: material.firstAccessedAt,
        lastAccessedAt: material.lastAccessedAt,
        accessCount: material.accessCount ?? 0,
      })),
      truncated:
        childOrders.length > 200 ||
        invoiceGroups.some((invoices) => invoices.length > 200) ||
        seatJobs.length > 200 ||
        materials.length > 200 ||
        billingJobs.some((jobsForKey) => jobsForKey.length > 200),
    };
  },
});
