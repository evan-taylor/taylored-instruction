import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

const ADMIN_EMAILS = [
  "admin@tayloredinstruction.com",
  "evan@tayloredinstruction.com",
];

const SHORT_ID_PREFIX_LENGTH = 6;
const SHORT_ID_SUFFIX_LENGTH = 4;

// biome-ignore lint/suspicious/noExplicitAny: Convex context types are complex and not exported
async function requireAdmin(ctx: { db: any; auth: any }) {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email);
  if (!isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }

  return { userId, user };
}

export const getAllInstructors = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();

    const profilesWithUsers = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          id: profile._id,
          userId: profile.userId,
          is_instructor: profile.isInstructor,
          updated_at: profile.updatedAt,
          last_login: profile.lastLogin,
          user_email: user?.email || null,
          short_id: `${profile._id.slice(0, SHORT_ID_PREFIX_LENGTH)}...${profile._id.slice(-SHORT_ID_SUFFIX_LENGTH)}`,
        };
      })
    );

    return profilesWithUsers.sort((a, b) => {
      if (!a.updated_at) {
        return 1;
      }
      if (!b.updated_at) {
        return -1;
      }
      return b.updated_at.localeCompare(a.updated_at);
    });
  },
});

export const updateInstructorStatus = mutation({
  args: {
    profileId: v.id("profiles"),
    newStatus: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.profileId, {
      isInstructor: args.newStatus,
      updatedAt: now,
    });

    return { ok: true, updated_at: now };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerificationTime,
    }));
  },
});

export const deleteUserAndProfile = mutation({
  args: {
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.delete(args.profileId);

    return { ok: true };
  },
});
