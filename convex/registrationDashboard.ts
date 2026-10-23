import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { BATCH } from "../shared/registration/domain";
import { query } from "./_generated/server";
import { staff } from "./registrationHelpers";
import schema from "./schema";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
const LOW_STOCK = 5;
const RECENT = 8;

/**
 * Staff overview for the admin dashboard. Reads bounded recent slices only;
 * every list here is capped so the dashboard stays fast as data grows.
 */
export const summary = query({
  args: {},
  returns: v.object({
    windowDays: v.number(),
    sampled: v.boolean(),
    revenue: v.number(),
    seatsSold: v.number(),
    ordersSettled: v.number(),
    upcomingSessions: v.number(),
    seatsReserved: v.number(),
    seatsCapacity: v.number(),
    unpaidOrders: v.number(),
    unpaidTotal: v.number(),
    openInvoices: v.number(),
    openInvoiceTotal: v.number(),
    overdueInvoices: v.number(),
    newGroupRequests: v.number(),
    failedEmails: v.number(),
    pendingRefunds: v.number(),
    paymentExceptions: v.number(),
    lowStock: v.array(
      v.object({
        id: v.id("registrationMaterials"),
        title: v.string(),
        available: v.number(),
      })
    ),
    nextSessions: v.array(doc(schema, "registrationSessions")),
    recentOrders: v.array(doc(schema, "registrationOrders")),
    recentActivity: v.array(doc(schema, "registrationActivity")),
  }),
  handler: async (ctx) => {
    await staff(ctx);
    const now = Date.now();
    const since = now - WINDOW_DAYS * DAY_MS;
    const sessions = await ctx.db
      .query("registrationSessions")
      .withIndex("by_firstStart", (q) => q.gte("firstStart", now))
      .filter((q) => q.eq(q.field("state"), "open"))
      .take(BATCH * 4);
    const upcoming = sessions
      .filter((s) => s.state === "open" && s.firstStart >= now)
      .sort((a, b) => a.firstStart - b.firstStart);
    const orders = await ctx.db
      .query("registrationOrders")
      .order("desc")
      .take(BATCH * 4);
    const settled = orders.filter(
      (o) =>
        o.status === "settled" &&
        o.source !== "waived" &&
        (o.settledAt ?? 0) >= since
    );
    const unpaid = await ctx.db
      .query("registrationOrders")
      .withIndex("by_status_and_expires", (q) => q.eq("status", "unpaid"))
      .take(BATCH);
    const exceptions = await ctx.db
      .query("registrationOrders")
      .withIndex("by_status_and_expires", (q) => q.eq("status", "exception"))
      .take(BATCH);
    const openInvoices = await ctx.db
      .query("registrationInvoices")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(BATCH);
    const requests = await ctx.db
      .query("registrationGroupRequests")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .take(BATCH);
    const failedEmails = await ctx.db
      .query("registrationJobs")
      .withIndex("by_state_and_due", (q) => q.eq("state", "failed"))
      .take(BATCH);
    const refunds = await ctx.db
      .query("registrationRefunds")
      .withIndex("by_state", (q) => q.eq("state", "pending"))
      .take(BATCH);
    const materials = await ctx.db.query("registrationMaterials").take(BATCH);
    const activity = await ctx.db
      .query("registrationActivity")
      .order("desc")
      .take(RECENT);
    return {
      windowDays: WINDOW_DAYS,
      sampled:
        sessions.length === BATCH * 4 ||
        orders.length === BATCH * 4 ||
        [
          unpaid,
          exceptions,
          openInvoices,
          requests,
          failedEmails,
          refunds,
          materials,
        ].some((rows) => rows.length === BATCH),
      // A returned duplicate card payment keeps the original offline sale,
      // including its tax; only its own refund is excluded.
      revenue: settled.reduce(
        (sum, o) =>
          sum +
          o.total +
          (o.tax ?? 0) -
          (o.source === "invoice-extra-payment" ? 0 : o.refunded),
        0
      ),
      seatsSold: settled.reduce((sum, o) => sum + o.seats.length, 0),
      ordersSettled: settled.length,
      upcomingSessions: upcoming.length,
      seatsReserved: upcoming.reduce((sum, s) => sum + s.reserved, 0),
      seatsCapacity: upcoming.reduce((sum, s) => sum + s.capacity, 0),
      unpaidOrders: unpaid.length,
      unpaidTotal: unpaid.reduce((sum, o) => sum + o.total, 0),
      openInvoices: openInvoices.length,
      openInvoiceTotal: openInvoices.reduce(
        (sum, i) => sum + i.amount + (i.tax ?? 0),
        0
      ),
      overdueInvoices: openInvoices.filter((i) => i.dueAt < now).length,
      newGroupRequests: requests.length,
      failedEmails: failedEmails.length,
      pendingRefunds: refunds.length,
      paymentExceptions: exceptions.length,
      lowStock: materials
        .filter(
          (m) =>
            m.kind === "keycode" &&
            !m.perSession &&
            !m.archived &&
            (m.availableCount ?? 0) <= LOW_STOCK
        )
        .map((m) => ({
          id: m._id,
          title: m.title,
          available: m.availableCount ?? 0,
        })),
      nextSessions: upcoming.slice(0, RECENT),
      recentOrders: orders.slice(0, RECENT),
      recentActivity: activity,
    };
  },
});

/** Finds every order and seat tied to an email so staff can help a caller fast. */
export const lookup = query({
  args: { email: v.string() },
  returns: v.object({
    orders: v.array(doc(schema, "registrationOrders")),
    seats: v.array(doc(schema, "registrationSeats")),
  }),
  handler: async (ctx, args) => {
    await staff(ctx);
    const normalized = args.email.trim().toLowerCase();
    if (!normalized) {
      return { orders: [], seats: [] };
    }
    const purchased = await ctx.db
      .query("registrationOrders")
      .withIndex("by_purchaser", (q) => q.eq("purchaser", normalized))
      .order("desc")
      .take(BATCH);
    const seats = await ctx.db
      .query("registrationSeats")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .order("desc")
      .take(BATCH);
    const seatOrders = await Promise.all(
      seats
        .filter((s) => !purchased.some((o) => o._id === s.orderId))
        .map((s) => ctx.db.get(s.orderId))
    );
    return {
      orders: [...purchased, ...seatOrders.filter((o) => o !== null)].filter(
        (o, index, all) => all.findIndex((x) => x._id === o._id) === index
      ),
      seats,
    };
  },
});
