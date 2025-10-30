import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const attachUserDataOnLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("No email found for user");
    }

    const email = identity.email.toLowerCase();

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      return { attached: false, reason: "Profile already exists" };
    }

    const stagingProfile = await ctx.db
      .query("staging_profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("processedAt"), undefined))
      .first();

    if (!stagingProfile) {
      return { attached: false, reason: "No staging profile found" };
    }

    await ctx.db.insert("profiles", {
      userId,
      isInstructor: stagingProfile.isInstructor,
      updatedAt: stagingProfile.updatedAt,
      lastLogin: new Date().toISOString(),
    });

    await ctx.db.patch(stagingProfile._id, {
      processedAt: Date.now(),
      convexUserId: userId,
    });

    return {
      attached: true,
      profile: {
        isInstructor: stagingProfile.isInstructor,
        supabaseUserId: stagingProfile.supabaseUserId,
      },
    };
  },
});

export const checkStagingProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return null;
    }

    const email = identity.email.toLowerCase();

    const stagingProfile = await ctx.db
      .query("staging_profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    return stagingProfile;
  },
});

const PERCENTAGE_MULTIPLIER = 100;

export const getMigrationStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const identity = await ctx.auth.getUserIdentity();
    const isAdmin =
      identity?.email === "admin@tayloredinstruction.com" ||
      identity?.email === "evan@tayloredinstruction.com";

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const allStaging = await ctx.db.query("staging_profiles").collect();
    const processed = allStaging.filter((p) => p.processedAt !== undefined);
    const unprocessed = allStaging.filter((p) => p.processedAt === undefined);

    return {
      total: allStaging.length,
      processed: processed.length,
      unprocessed: unprocessed.length,
      processedRate:
        allStaging.length > 0
          ? (
              (processed.length / allStaging.length) *
              PERCENTAGE_MULTIPLIER
            ).toFixed(1)
          : "0",
    };
  },
});

export const importStagingProfile = mutation({
  args: {
    email: v.string(),
    supabaseUserId: v.string(),
    isInstructor: v.boolean(),
    updatedAt: v.optional(v.string()),
    lastLogin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("staging_profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { imported: false, reason: "Already exists", id: existing._id };
    }

    const id = await ctx.db.insert("staging_profiles", {
      email: args.email.toLowerCase(),
      supabaseUserId: args.supabaseUserId,
      isInstructor: args.isInstructor,
      updatedAt: args.updatedAt,
      lastLogin: args.lastLogin,
    });

    return { imported: true, id };
  },
});

export const importProducts = mutation({
  args: {
    products: v.array(
      v.object({
        originalCsvId: v.optional(v.number()),
        sku: v.optional(v.string()),
        name: v.string(),
        description: v.optional(v.string()),
        imageUrls: v.optional(v.string()),
        categories: v.optional(v.array(v.string())),
        type: v.string(),
        requiresInstructor: v.boolean(),
        stripePriceId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      name: string;
      imported: boolean;
      reason?: string;
      id?: unknown;
    }> = [];

    for (const product of args.products) {
      const existing = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("name"), product.name))
        .first();

      if (existing) {
        results.push({
          name: product.name,
          imported: false,
          reason: "Already exists",
        });
        continue;
      }

      const id = await ctx.db.insert("products", product);
      results.push({ name: product.name, imported: true, id });
    }

    return results;
  },
});
