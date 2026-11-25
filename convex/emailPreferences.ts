import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  httpAction,
  internalMutation,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";

function normalized(email: string) {
  return email.trim().toLowerCase();
}

async function byEmail(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query("emailPreferences")
    .withIndex("by_email", (q) => q.eq("email", normalized(email)))
    .unique();
}

async function byToken(ctx: QueryCtx, token: string) {
  const row = token
    ? await ctx.db
        .query("emailPreferences")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique()
    : null;
  if (!row) {
    throw new ConvexError("This unsubscribe link is not valid.");
  }
  return row;
}

/** True when the address opted out of reminder and marketing email. */
export async function unsubscribed(ctx: QueryCtx, email: string) {
  return Boolean((await byEmail(ctx, email))?.unsubscribedAt);
}

/** The address's unsubscribe token, created on first use. */
export async function preferenceToken(ctx: MutationCtx, email: string) {
  const existing = await byEmail(ctx, email);
  if (existing) {
    return existing.token;
  }
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll(
    "-",
    ""
  );
  await ctx.db.insert("emailPreferences", {
    email: normalized(email),
    token,
    updatedAt: Date.now(),
  });
  return token;
}

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export const status = query({
  args: { token: v.string() },
  returns: v.object({ email: v.string(), unsubscribed: v.boolean() }),
  handler: async (ctx, args) => {
    const row = await byToken(ctx, args.token);
    return {
      email: maskEmail(row.email),
      unsubscribed: Boolean(row.unsubscribedAt),
    };
  },
});

async function setSubscribed(
  ctx: MutationCtx,
  token: string,
  subscribed: boolean
) {
  const row = await byToken(ctx, token);
  await ctx.db.patch(row._id, {
    unsubscribedAt: subscribed ? undefined : (row.unsubscribedAt ?? Date.now()),
    updatedAt: Date.now(),
  });
  return null;
}

/** The unsubscribe page's button. Transactional mail keeps arriving. */
export const unsubscribe = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: (ctx, args) => setSubscribed(ctx, args.token, false),
});

export const resubscribe = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: (ctx, args) => setSubscribed(ctx, args.token, true),
});

export const unsubscribeByToken = internalMutation({
  args: { token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    try {
      await setSubscribed(ctx, args.token, false);
      return true;
    } catch {
      return false;
    }
  },
});

/**
 * RFC 8058 one-click unsubscribe: mail clients POST here from the
 * List-Unsubscribe header without opening a page.
 */
export const oneClickUnsubscribe = httpAction(async (ctx, request) => {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const done = await ctx.runMutation(
    internal.emailPreferences.unsubscribeByToken,
    {
      token,
    }
  );
  return new Response(done ? "Unsubscribed" : "Unknown link", {
    status: done ? 200 : 404,
  });
});
