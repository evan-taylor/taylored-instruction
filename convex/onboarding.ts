import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!isAdminEmail(user.email)) {
    throw new Error("Admin access required");
  }

  return { email: user.email, userId };
}

async function requireInstructor(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!profile?.isInstructor) {
    throw new Error("Instructor access required");
  }

  return { profile, userId };
}

export const getSteps = query({
  args: {},
  handler: async (ctx) => {
    await requireInstructor(ctx);

    const steps = await ctx.db
      .query("onboarding_steps")
      .withIndex("by_order")
      .collect();

    return steps;
  },
});

export const getStep = query({
  args: { id: v.id("onboarding_steps") },
  handler: async (ctx, args) => {
    await requireInstructor(ctx);

    const step = await ctx.db.get(args.id);
    return step;
  },
});

export const createStep = mutation({
  args: {
    content: v.string(),
    order: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const now = new Date().toISOString();

    const stepId = await ctx.db.insert("onboarding_steps", {
      content: args.content,
      createdAt: now,
      createdBy: userId,
      order: args.order,
      title: args.title,
      updatedAt: now,
    });

    return stepId;
  },
});

export const updateStep = mutation({
  args: {
    content: v.optional(v.string()),
    id: v.id("onboarding_steps"),
    order: v.optional(v.number()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    const step = await ctx.db.get(id);

    if (!step) {
      throw new Error("Step not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});

export const deleteStep = mutation({
  args: { id: v.id("onboarding_steps") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const step = await ctx.db.get(args.id);
    if (!step) {
      throw new Error("Step not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const reorderSteps = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("onboarding_steps"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    for (const update of args.updates) {
      await ctx.db.patch(update.id, {
        order: update.order,
        updatedAt: new Date().toISOString(),
      });
    }

    return true;
  },
});

export const getStepsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const steps = await ctx.db
      .query("onboarding_steps")
      .withIndex("by_order")
      .collect();

    return steps;
  },
});
