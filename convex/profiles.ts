import { ConvexError, v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { revokeInvitationsFor } from "./instructorInvitations";

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

    if (existingProfile?.deactivatedAt) {
      return null;
    }

    const user = await ctx.db.get(userId);

    // Every signed-in account resolves here, with or without an instructor
    // profile: admin access comes from the email allowlist, and students have
    // no profile at all. `id` is null until an invitation is accepted.
    return {
      id: existingProfile?._id ?? null,
      userId,
      email: user?.email ?? null,
      is_instructor: existingProfile?.isInstructor ?? false,
      updated_at: existingProfile?.updatedAt ?? null,
      last_login: existingProfile?.lastLogin ?? null,
    };
  },
});

/**
 * Records a sign-in. A first sign-in attaches a migrated instructor profile
 * when one is staged for this email; otherwise it creates nothing. Students
 * sign in here too, and instructor access comes only from accepting an
 * invitation (see instructorInvitations.accept).
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
    if (!willBeInstructor) {
      const user = await ctx.db.get(args.userId);
      if (user?.email) {
        await revokeInvitationsFor(ctx, user.email);
      }
    }

    // Note: Approval email is now sent by the admin UI via Next.js server action (important-comment)
    // This provides better security (no exposed secrets) and error handling
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
    const user = await ctx.db.get(args.userId);
    if (user?.email) {
      await revokeInvitationsFor(ctx, user.email);
    }
  },
});
