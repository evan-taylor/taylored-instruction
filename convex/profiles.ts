import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      return {
        id: existingProfile._id,
        userId: existingProfile.userId,
        is_instructor: existingProfile.isInstructor,
        updated_at: existingProfile.updatedAt,
        last_login: existingProfile.lastLogin,
      };
    }

    return null;
  },
});

export const updateLastLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      const now = new Date().toISOString();
      await ctx.db.insert("profiles", {
        userId,
        isInstructor: false,
        updatedAt: now,
        lastLogin: now,
      });
      return;
    }

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      lastLogin: now,
    });
  },
});

export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user) {
      throw new Error("User not found");
    }

    const adminEmails = [
      "admin@tayloredinstruction.com",
      "evan@tayloredinstruction.com",
    ];
    const isAdmin = user.email && adminEmails.includes(user.email);

    if (!isAdmin) {
      throw new Error("Forbidden");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    return {
      id: profile._id,
      userId: profile.userId,
      is_instructor: profile.isInstructor,
      updated_at: profile.updatedAt,
      last_login: profile.lastLogin,
    };
  },
});
