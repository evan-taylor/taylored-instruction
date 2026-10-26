import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { calendar } from "../shared/registration/schedule";
import { mutation, query } from "./_generated/server";
import { activeSeatMaterials, portalEmail } from "./registrationHelpers";

const portalSeat = v.object({
  id: v.id("registrationSeats"),
  name: v.string(),
  state: v.string(),
  title: v.string(),
  sessionId: v.optional(v.id("registrationSessions")),
  timeZone: v.optional(v.string()),
  materials: v.array(
    v.object({
      id: v.id("registrationEntitlements"),
      title: v.string(),
      state: v.string(),
      kind: v.optional(v.string()),
      instructions: v.optional(v.string()),
    })
  ),
  meetings: v.array(
    v.object({
      id: v.string(),
      start: v.number(),
      end: v.number(),
      location: v.string(),
      onlineUrl: v.optional(v.string()),
      instructions: v.string(),
    })
  ),
});
export const registrations = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(portalSeat),
    continueCursor: v.string(),
    isDone: v.boolean(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null()
      )
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx);
    const result = await ctx.db
      .query("registrationSeats")
      .withIndex("by_email", (q) => q.eq("email", identity))
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (seat) => {
        const session = seat.sessionId
          ? await ctx.db.get(seat.sessionId)
          : null;
        const course = await ctx.db.get(seat.courseId);
        const entitlements = seat.settledAt
          ? await activeSeatMaterials(ctx, seat._id)
          : [];
        return {
          id: seat._id,
          name: seat.name,
          state: session?.state === "canceled" ? "canceled" : seat.state,
          timeZone: session?.timeZone,
          title: session?.title ?? course?.title ?? "Course",
          sessionId: session?._id,
          materials: entitlements.map((e) => ({
            id: e._id,
            title: e.title,
            state: e.state,
            kind: e.kind,
            instructions: e.instructions,
          })),
          meetings: (session?.meetings ?? []).map(
            ({ id, start, end, location, onlineUrl, instructions }) => ({
              id,
              start,
              end,
              location,
              onlineUrl:
                seat.settledAt && seat.state === "active"
                  ? onlineUrl
                  : undefined,
              instructions:
                seat.settledAt && seat.state === "active" ? instructions : "",
            })
          ),
        };
      })
    );
    return { ...result, page };
  },
});
export const orders = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.id("registrationOrders"),
        title: v.string(),
        status: v.string(),
        total: v.number(),
        tax: v.optional(v.number()),
        refunded: v.number(),
        attendees: v.array(v.object({ name: v.string(), email: v.string() })),
      })
    ),
    continueCursor: v.string(),
    isDone: v.boolean(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null()
      )
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx);
    const result = await ctx.db
      .query("registrationOrders")
      .withIndex("by_purchaser", (q) => q.eq("purchaser", identity))
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((order) => ({
        id: order._id,
        title: order.title,
        status: order.status,
        total: order.total,
        tax: order.tax,
        refunded: order.refunded,
        attendees: order.seats.map((s) => ({
          name: s.attendee.name,
          email: s.attendee.email,
        })),
      })),
    };
  },
});
export const materialUrl = query({
  args: { id: v.id("registrationEntitlements") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx);
    const entitlement = await ctx.db.get(args.id);
    const seat = entitlement ? await ctx.db.get(entitlement.seatId) : null;
    if (
      !entitlement ||
      entitlement.state === "canceled" ||
      seat?.email !== identity ||
      !seat.settledAt
    ) {
      throw new ConvexError("Material access denied");
    }
    return entitlement.storageId
      ? await ctx.storage.getUrl(entitlement.storageId)
      : (entitlement.url ?? null);
  },
});
export const accessMaterial = mutation({
  args: { id: v.id("registrationEntitlements") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx);
    const entitlement = await ctx.db.get(args.id);
    const seat = entitlement ? await ctx.db.get(entitlement.seatId) : null;
    if (
      entitlement?.state !== "ready" ||
      seat?.email !== identity ||
      !seat.settledAt
    ) {
      throw new ConvexError("Material access denied");
    }
    const url = entitlement.storageId
      ? await ctx.storage.getUrl(entitlement.storageId)
      : (entitlement.url ?? null);
    if (url) {
      const now = Date.now();
      await ctx.db.patch(entitlement._id, {
        firstAccessedAt: entitlement.firstAccessedAt ?? now,
        lastAccessedAt: now,
        accessCount: (entitlement.accessCount ?? 0) + 1,
      });
    }
    return url;
  },
});
export const calendarFile = query({
  args: { seatId: v.id("registrationSeats") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx);
    const seat = await ctx.db.get(args.seatId);
    if (!seat || seat.email !== identity || !seat.sessionId) {
      throw new ConvexError("Calendar access denied");
    }
    const session = await ctx.db.get(seat.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }
    return calendar(session, Date.now());
  },
});
export const status = query({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: v.union(
    v.object({
      status: v.string(),
      total: v.number(),
      tax: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    return order?.requestKey === args.requestKey
      ? { status: order.status, total: order.total, tax: order.tax }
      : null;
  },
});
export const review = query({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: v.union(
    v.object({
      seats: v.array(
        v.object({
          name: v.string(),
          email: v.string(),
          total: v.number(),
          lines: v.array(
            v.object({
              id: v.string(),
              title: v.string(),
              cents: v.number(),
              discount: v.number(),
            })
          ),
        })
      ),
      total: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (order?.requestKey !== args.requestKey) {
      return null;
    }
    return {
      total: order.total,
      seats: order.seats.map((seat) => ({
        name: seat.attendee.name,
        email: seat.attendee.email,
        total: seat.total,
        lines: seat.lines.map(({ id, title, cents, discount }) => ({
          id,
          title,
          cents,
          discount,
        })),
      })),
    };
  },
});

export const materials = query({
  args: {
    seatId: v.id("registrationSeats"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      id: v.id("registrationEntitlements"),
      title: v.string(),
      state: v.string(),
      kind: v.optional(v.string()),
      instructions: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx);
    const seat = await ctx.db.get(args.seatId);
    if (seat?.email !== identity || !seat.settledAt) {
      throw new ConvexError("Material access denied");
    }
    const result = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((e) => ({
        id: e._id,
        title: e.title,
        state: e.state,
        kind: e.kind,
        instructions: e.instructions,
      })),
    };
  },
});
