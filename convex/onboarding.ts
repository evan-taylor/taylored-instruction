import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

type InstructorContext = {
  userId: Id<"users">;
  email: string | null;
};

const sanitizeSlug = (value: string): string => {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base.length > 0 ? base : "step";
};

const getNextOrder = (orders: number[]): number => {
  if (orders.length === 0) {
    return 1;
  }

  const maxOrder = Math.max(...orders);
  return maxOrder + 1;
};

type ConvexCtx = QueryCtx | MutationCtx;

const requireInstructor = async (
  ctx: ConvexCtx
): Promise<InstructorContext> => {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!profile || profile.deactivatedAt || !profile.isInstructor) {
    throw new Error("Forbidden: Instructor access required");
  }

  const user = await ctx.db.get(userId);

  return {
    userId,
    email: user?.email ?? null,
  };
};

const ensureUniqueSlug = async (
  ctx: ConvexCtx,
  desiredSlug: string,
  existingId?: Id<"onboarding_steps">
): Promise<string> => {
  const baseSlug = sanitizeSlug(desiredSlug);
  let slug = baseSlug;
  let suffix = 1;
  let hasConflict = true;

  while (hasConflict) {
    const conflict = await ctx.db
      .query("onboarding_steps")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!conflict || conflict._id === existingId) {
      hasConflict = false;
    } else {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  return slug;
};

export const listSteps = query({
  args: {
    includeDrafts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireInstructor(ctx);

    const steps = await ctx.db.query("onboarding_steps").collect();
    const includeDrafts = args.includeDrafts ?? true;

    return steps
      .filter((step) => includeDrafts || step.isPublished)
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step._id,
        slug: step.slug,
        title: step.title,
        summary: step.summary ?? "",
        content: step.content,
        order: step.order,
        isPublished: step.isPublished,
        updatedAt: step.updatedAt,
        updatedByEmail: step.updatedByEmail ?? null,
      }));
  },
});

export const saveStep = mutation({
  args: {
    stepId: v.optional(v.id("onboarding_steps")),
    title: v.string(),
    summary: v.optional(v.string()),
    content: v.string(),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, email } = await requireInstructor(ctx);
    const now = new Date().toISOString();

    if (args.stepId) {
      const existing = await ctx.db.get(args.stepId);
      if (!existing) {
        throw new Error("Step not found");
      }

      await ctx.db.patch(args.stepId, {
        title: args.title,
        summary: args.summary,
        content: args.content,
        isPublished: args.isPublished,
        order: args.order ?? existing.order,
        updatedAt: now,
        updatedByUserId: userId,
        updatedByEmail: email ?? undefined,
      });

      return args.stepId;
    }

    const currentSteps = await ctx.db.query("onboarding_steps").collect();
    const slug = await ensureUniqueSlug(ctx, args.title);
    const order =
      args.order ?? getNextOrder(currentSteps.map((step) => step.order));

    return ctx.db.insert("onboarding_steps", {
      slug,
      title: args.title,
      summary: args.summary,
      content: args.content,
      order,
      isPublished: args.isPublished,
      updatedAt: now,
      updatedByUserId: userId,
      updatedByEmail: email ?? undefined,
    });
  },
});

export const deleteStep = mutation({
  args: {
    stepId: v.id("onboarding_steps"),
  },
  handler: async (ctx, args) => {
    await requireInstructor(ctx);

    await ctx.db.delete(args.stepId);

    const remaining = await ctx.db.query("onboarding_steps").collect();
    const sorted = remaining.sort((a, b) => a.order - b.order);

    let position = 1;
    for (const step of sorted) {
      await ctx.db.patch(step._id, { order: position });
      position += 1;
    }
  },
});

export const reorderSteps = mutation({
  args: {
    orderedStepIds: v.array(v.id("onboarding_steps")),
  },
  handler: async (ctx, args) => {
    await requireInstructor(ctx);

    let position = 1;
    for (const stepId of args.orderedStepIds) {
      await ctx.db.patch(stepId, { order: position });
      position += 1;
    }
  },
});
