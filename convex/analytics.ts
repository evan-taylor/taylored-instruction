import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const DEFAULT_ANALYTICS_LIMIT = 100;

export const trackEvent = mutation({
  args: {
    url: v.optional(v.string()),
    referrer: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    await ctx.db.insert("analytics", {
      url: args.url,
      referrer: args.referrer,
      userId: userId || undefined,
      ipAddress: args.ipAddress,
      city: args.city,
      region: args.region,
      country: args.country,
    });

    return { success: true };
  },
});

export const getAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const adminEmails = [
      "admin@tayloredinstruction.com",
      "evan@tayloredinstruction.com",
    ];
    const isAdmin = user.email && adminEmails.includes(user.email);

    if (!isAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const analytics = await ctx.db
      .query("analytics")
      .order("desc")
      .take(args.limit ?? DEFAULT_ANALYTICS_LIMIT);

    return analytics.map((event) => ({
      id: event._id,
      url: event.url,
      referrer: event.referrer,
      userId: event.userId,
      ipAddress: event.ipAddress,
      city: event.city,
      region: event.region,
      country: event.country,
      createdAt: event._creationTime,
    }));
  },
});
