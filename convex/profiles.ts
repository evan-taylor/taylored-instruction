import { v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import { internal } from "./_generated/api";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
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
      if (existingProfile.deactivatedAt) {
        return null;
      }

      const user = await ctx.db.get(userId);

      return {
        email: user?.email ?? null,
        id: existingProfile._id,
        is_instructor: existingProfile.isInstructor,
        last_login: existingProfile.lastLogin,
        updated_at: existingProfile.updatedAt,
        userId: existingProfile.userId,
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
      const user = await ctx.db.get(userId);
      const email = user?.email?.toLowerCase();

      // Check for staging profile to determine if this is a migration or new user
      const stagingProfile = email
        ? await ctx.db
            .query("staging_profiles")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first()
        : null;

      const now = new Date().toISOString();

      // If staging profile exists and is unprocessed, auto-approve user with staging data
      // No admin notification email is sent for staged users
      if (stagingProfile && stagingProfile.processedAt === undefined) {
        await ctx.db.insert("profiles", {
          isInstructor: stagingProfile.isInstructor,
          lastLogin: now,
          notifiedAt: now, // Set to prevent duplicate notifications (important-comment)
          updatedAt: stagingProfile.updatedAt ?? now,
          userId,
        });

        // Mark staging profile as processed
        await ctx.db.patch(stagingProfile._id, {
          convexUserId: userId,
          processedAt: Date.now(),
        });

        return;
      }

      // No staging profile or already processed - create new profile and notify admin
      await ctx.db.insert("profiles", {
        isInstructor: false,
        lastLogin: now,
        updatedAt: now,
        userId,
      });

      try {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendNewUserAdminNotification,
          {
            userEmail: user?.email,
            userId,
          }
        );
      } catch (error) {
        console.error("Failed to schedule notification email:", error);
      }

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

    if (!isAdminEmail(user.email)) {
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
      is_instructor: profile.isInstructor,
      last_login: profile.lastLogin,
      updated_at: profile.updatedAt,
      userId: profile.userId,
    };
  },
});

const assertAdmin = async (ctx: MutationCtx) => {
  const currentUserId = await auth.getUserId(ctx);
  if (!currentUserId) {
    throw new Error("Unauthorized");
  }

  const user = await ctx.db.get(currentUserId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!isAdminEmail(user.email)) {
    throw new Error("Forbidden: Admin access required");
  }
};

export const approveInstructor = mutation({
  args: {
    approve: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const wasInstructor = profile.isInstructor;
    const willBeInstructor = args.approve;

    if (wasInstructor === willBeInstructor) {
      return;
    }

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      isInstructor: willBeInstructor,
      updatedAt: now,
    });

    // Note: Approval email is now sent by the admin UI via Next.js server action (important-comment)
    // This provides better security (no exposed secrets) and error handling
  },
});

export const markUserNotified = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      notifiedAt: now,
    });
  },
});

export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      deactivatedAt: now,
    });
  },
});
