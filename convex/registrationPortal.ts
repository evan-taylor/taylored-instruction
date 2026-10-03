import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { BATCH, email, HOLD_MS } from "../shared/registration/domain";
import { calendar } from "../shared/registration/schedule";
import { internalMutation, mutation, query } from "./_generated/server";
import { hash, portalEmail, rate } from "./registrationHelpers";

export const issue = internalMutation({
  args: { email: v.string(), tokenHash: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = email(args.email);
    await rate(ctx, `portal:${normalized}`, 3);
    await ctx.db.insert("registrationGrants", {
      email: normalized,
      hash: args.tokenHash,
      purpose: "challenge",
      expires: Date.now() + HOLD_MS,
      consumed: false,
    });
    return null;
  },
});
export const exchange = mutation({
  args: { token: v.string(), grantHash: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const digest = await hash(args.token);
    const row = await ctx.db
      .query("registrationGrants")
      .withIndex("by_hash", (q) => q.eq("hash", digest))
      .unique();
    if (
      row?.purpose !== "challenge" ||
      row.consumed ||
      row.expires <= Date.now() ||
      args.grantHash.length !== 64
    ) {
      return false;
    }
    await ctx.db.patch(row._id, { consumed: true });
    await ctx.db.insert("registrationGrants", {
      email: row.email,
      hash: args.grantHash,
      purpose: "portal",
      consumed: false,
      expires: Date.now() + 86_400_000,
    });
    return true;
  },
});
const portalSeat = v.object({
  id: v.id("registrationSeats"),
  name: v.string(),
  state: v.string(),
  title: v.string(),
  sessionId: v.optional(v.id("registrationSessions")),
  materials: v.array(
    v.object({
      id: v.id("registrationEntitlements"),
      title: v.string(),
      state: v.string(),
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
    grant: v.optional(v.string()),
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
    const identity = await portalEmail(ctx, args.grant);
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
          ? await ctx.db
              .query("registrationEntitlements")
              .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
              .take(BATCH)
          : [];
        return {
          id: seat._id,
          name: seat.name,
          state: seat.state,
          title: session?.title ?? course?.title ?? "Course",
          sessionId: session?._id,
          materials: entitlements.map((e) => ({
            id: e._id,
            title: e.title,
            state: e.state,
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
    grant: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.id("registrationOrders"),
        title: v.string(),
        status: v.string(),
        total: v.number(),
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
    const identity = await portalEmail(ctx, args.grant);
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
  args: { grant: v.optional(v.string()), id: v.id("registrationEntitlements") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx, args.grant);
    const entitlement = await ctx.db.get(args.id);
    const seat = entitlement ? await ctx.db.get(entitlement.seatId) : null;
    if (!entitlement || seat?.email !== identity || !seat.settledAt) {
      throw new Error("Material access denied");
    }
    return entitlement.storageId
      ? await ctx.storage.getUrl(entitlement.storageId)
      : (entitlement.url ?? null);
  },
});
export const calendarFile = query({
  args: { grant: v.optional(v.string()), seatId: v.id("registrationSeats") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await portalEmail(ctx, args.grant);
    const seat = await ctx.db.get(args.seatId);
    if (!seat || seat.email !== identity || !seat.sessionId) {
      throw new Error("Calendar access denied");
    }
    const session = await ctx.db.get(seat.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    return calendar(session, Date.now());
  },
});
export const status = query({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: v.union(
    v.object({ status: v.string(), total: v.number() }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    return order?.requestKey === args.requestKey
      ? { status: order.status, total: order.total }
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
