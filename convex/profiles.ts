import { v } from "convex/values";
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
        id: existingProfile._id,
        userId: existingProfile.userId,
        email: user?.email ?? null,
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
          userId,
          isInstructor: stagingProfile.isInstructor,
          updatedAt: stagingProfile.updatedAt ?? now,
          lastLogin: now,
          notifiedAt: now, // Set to prevent duplicate notifications (important-comment)
        });

        // Mark staging profile as processed
        await ctx.db.patch(stagingProfile._id, {
          processedAt: Date.now(),
          convexUserId: userId,
        });

        return;
      }

      // No staging profile or already processed - create new profile and notify admin
      await ctx.db.insert("profiles", {
        userId,
        isInstructor: false,
        updatedAt: now,
        lastLogin: now,
      });

      try {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendNewUserAdminNotification,
          {
            userId,
            userEmail: user?.email,
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

const assertAdmin = async (ctx: MutationCtx) => {
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
    throw new Error("Forbidden: Admin access required");
  }
};

export const approveInstructor = mutation({
  args: {
    userId: v.id("users"),
    approve: v.boolean(),
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
