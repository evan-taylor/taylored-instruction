import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import { mutation, query } from "./_generated/server";

export const attachUserDataOnLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    const identity = await ctx.auth.getUserIdentity();
    const email = (user?.email ?? identity?.email ?? "").toLowerCase();

    if (!email) {
      return {
        attached: false,
        reason: "No email found on user record or identity",
      };
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const stagingProfile = await ctx.db
      .query("staging_profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!stagingProfile) {
      return { attached: false, reason: "No staging profile found" };
    }

    if (stagingProfile.processedAt !== undefined) {
      return {
        attached: false,
        reason: "Staging profile already processed",
      };
    }

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        isInstructor: stagingProfile.isInstructor,
        updatedAt: stagingProfile.updatedAt,
      });

      await ctx.db.patch(stagingProfile._id, {
        convexUserId: userId,
        processedAt: Date.now(),
      });

      return {
        attached: true,
        merged: true,
        profile: {
          isInstructor: stagingProfile.isInstructor,
          supabaseUserId: stagingProfile.supabaseUserId,
        },
      };
    }

    // No profile exists yet - updateLastLogin will handle profile creation
    // This prevents race condition where both mutations try to insert profiles
    return {
      attached: false,
      reason: "Profile will be created by updateLastLogin mutation",
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

    const user = await ctx.db.get(userId);
    const identity = await ctx.auth.getUserIdentity();
    const email = (user?.email ?? identity?.email ?? "").toLowerCase();

    if (!email) {
      return null;
    }

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

    const user = await ctx.db.get(userId);
    const identity = await ctx.auth.getUserIdentity();
    const email = user?.email ?? identity?.email ?? "";

    if (!isAdminEmail(email)) {
      throw new Error("Admin access required");
    }

    const allStaging = await ctx.db.query("staging_profiles").collect();
    const processed = allStaging.filter((p) => p.processedAt !== undefined);
    const unprocessed = allStaging.filter((p) => p.processedAt === undefined);

    return {
      processed: processed.length,
      processedRate:
        allStaging.length > 0
          ? (
              (processed.length / allStaging.length) *
              PERCENTAGE_MULTIPLIER
            ).toFixed(1)
          : "0",
      total: allStaging.length,
      unprocessed: unprocessed.length,
    };
  },
});

export const importStagingProfile = mutation({
  args: {
    email: v.string(),
    isInstructor: v.boolean(),
    lastLogin: v.optional(v.string()),
    supabaseUserId: v.string(),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("staging_profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { id: existing._id, imported: false, reason: "Already exists" };
    }

    const id = await ctx.db.insert("staging_profiles", {
      email: args.email.toLowerCase(),
      isInstructor: args.isInstructor,
      lastLogin: args.lastLogin,
      supabaseUserId: args.supabaseUserId,
      updatedAt: args.updatedAt,
    });

    return { id, imported: true };
  },
});

export const importProducts = mutation({
  args: {
    products: v.array(
      v.object({
        categories: v.optional(v.array(v.string())),
        description: v.optional(v.string()),
        imageUrls: v.optional(v.string()),
        name: v.string(),
        originalCsvId: v.optional(v.number()),
        requiresInstructor: v.boolean(),
        sku: v.optional(v.string()),
        stripePriceId: v.optional(v.string()),
        type: v.string(),
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
          imported: false,
          name: product.name,
          reason: "Already exists",
        });
        continue;
      }

      const id = await ctx.db.insert("products", product);
      results.push({ id, imported: true, name: product.name });
    }

    return results;
  },
});
