import { ConvexError, v } from "convex/values";
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

/**
 * Records a sign-in. A first sign-in attaches a migrated instructor profile
 * when one is staged for this email; otherwise it creates nothing, because
 * students sign in here too and an account is not an instructor request.
 */
export const updateLastLogin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Unauthorized");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const now = new Date().toISOString();

    if (profile) {
      await ctx.db.patch(profile._id, { lastLogin: now });
      return;
    }

    const user = await ctx.db.get(userId);
    const email = user?.email?.toLowerCase();
    const stagingProfile = email
      ? await ctx.db
          .query("staging_profiles")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first()
      : null;

    // Staged users are already-approved migrations; no admin notification.
    if (stagingProfile && stagingProfile.processedAt === undefined) {
      await ctx.db.insert("profiles", {
        userId,
        isInstructor: stagingProfile.isInstructor,
        updatedAt: stagingProfile.updatedAt ?? now,
        lastLogin: now,
        notifiedAt: now, // Set to prevent duplicate notifications (important-comment)
      });
      await ctx.db.patch(stagingProfile._id, {
        processedAt: Date.now(),
        convexUserId: userId,
      });
    }
  },
});

/** The explicit instructor signup: creates the pending profile and tells admins. */
export const requestInstructorAccess = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Unauthorized");
    }
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user?.email || user.emailVerificationTime === undefined) {
      throw new ConvexError("Verified email required");
    }
    const now = new Date().toISOString();
    await ctx.db.insert("profiles", {
      userId,
      isInstructor: false,
      updatedAt: now,
      lastLogin: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendNewUserAdminNotification,
      { userId, userEmail: user.email }
    );
    return null;
  },
});

export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    if (!isAdminEmail(user.email)) {
      throw new ConvexError("Forbidden");
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
    throw new ConvexError("Unauthorized");
  }

  const user = await ctx.db.get(currentUserId);
  if (!user) {
    throw new ConvexError("User not found");
  }

  if (!isAdminEmail(user.email)) {
    throw new ConvexError("Forbidden: Admin access required");
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
      throw new ConvexError("Profile not found");
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
      throw new ConvexError("Profile not found");
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
      throw new ConvexError("Profile not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(profile._id, {
      deactivatedAt: now,
    });
  },
});
