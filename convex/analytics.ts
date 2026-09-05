import { v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const DEFAULT_ANALYTICS_LIMIT = 100;

export const trackEvent = mutation({
  args: {
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    referrer: v.optional(v.string()),
    region: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    await ctx.db.insert("analytics", {
      city: args.city,
      country: args.country,
      ipAddress: args.ipAddress,
      referrer: args.referrer,
      region: args.region,
      url: args.url,
      userId: userId || undefined,
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

    if (!isAdminEmail(user.email)) {
      throw new Error("Forbidden: Admin access required");
    }

    const analytics = await ctx.db
      .query("analytics")
      .order("desc")
      .take(args.limit ?? DEFAULT_ANALYTICS_LIMIT);

    return analytics.map((event) => ({
      city: event.city,
      country: event.country,
      createdAt: event._creationTime,
      id: event._id,
      ipAddress: event.ipAddress,
      referrer: event.referrer,
      region: event.region,
      url: event.url,
      userId: event.userId,
    }));
  },
});
