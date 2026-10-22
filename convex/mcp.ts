import { ConvexError, v } from "convex/values";
import { importPKCS8, SignJWT } from "jose";
import { isAdminEmail } from "../shared/adminEmails";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { hash, staff } from "./registrationHelpers";

/**
 * Agent access for the admin workspace.
 *
 * An administrator mints a bearer token in the admin UI. The MCP route in
 * Next.js exchanges that token for a short-lived Convex Auth session JWT and
 * then calls the same public functions the admin UI uses, so every existing
 * `staff()` check, audit entry, and payment-mode guard applies unchanged.
 */
export const TOKEN_PREFIX = "ti_mcp_";
const TOKEN_HEX = 64;
const TOKEN_LENGTH = TOKEN_PREFIX.length + TOKEN_HEX;
const PREVIEW_CHARS = 8;
/**
 * Agent sessions are short: the MCP route exchanges on every request, so a
 * revoked token fails immediately and an already-issued JWT dies within minutes.
 */
export const SESSION_MS = 5 * 60 * 1000;
const MAX_TOKENS = 20;

const tokenView = v.object({
  _id: v.id("mcpTokens"),
  label: v.string(),
  prefix: v.string(),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
});

function view(row: Doc<"mcpTokens">) {
  return {
    _id: row._id,
    label: row.label,
    prefix: row.prefix,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

async function admin(ctx: QueryCtx) {
  const actor = await staff(ctx);
  if (!actor.admin) {
    throw new ConvexError("Administrator access required");
  }
  return actor;
}

/** Tokens owned by the signed-in administrator, newest first. */
export const tokens = query({
  args: {},
  returns: v.array(tokenView),
  handler: async (ctx) => {
    const actor = await admin(ctx);
    const rows = await ctx.db
      .query("mcpTokens")
      .withIndex("by_userId", (q) => q.eq("userId", actor.userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).map(view);
  },
});

/** Mints a token. The plaintext is returned once and never stored. */
export const createToken = mutation({
  args: { label: v.string() },
  returns: v.object({ id: v.id("mcpTokens"), token: v.string() }),
  handler: async (ctx, args) => {
    const actor = await admin(ctx);
    const label = args.label.trim();
    if (!label || label.length > 80) {
      throw new ConvexError("Give the token a short label (1–80 characters)");
    }
    const active = await ctx.db
      .query("mcpTokens")
      .withIndex("by_userId", (q) => q.eq("userId", actor.userId))
      .collect();
    if (active.filter((row) => !row.revokedAt).length >= MAX_TOKENS) {
      throw new ConvexError("Revoke an unused token before creating another");
    }
    const token = `${TOKEN_PREFIX}${crypto.randomUUID().replaceAll("-", "")}${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const id = await ctx.db.insert("mcpTokens", {
      hash: await hash(token),
      prefix: token.slice(0, TOKEN_PREFIX.length + PREVIEW_CHARS),
      label,
      userId: actor.userId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("registrationActivity", {
      actor: actor.userId,
      action: "mcp-token-created",
      entity: id,
      detail: label,
      at: Date.now(),
    });
    return { id, token };
  },
});

/** Revokes a token and ends the agent session it was using. */
export const revokeToken = mutation({
  args: { id: v.id("mcpTokens") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await admin(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== actor.userId) {
      throw new ConvexError("Token not found");
    }
    if (row.revokedAt) {
      return null;
    }
    await ctx.db.patch(row._id, { revokedAt: Date.now() });
    if (row.sessionId) {
      const session = await ctx.db.get(row.sessionId);
      if (session) {
        await ctx.db.delete(session._id);
      }
    }
    await ctx.db.insert("registrationActivity", {
      actor: actor.userId,
      action: "mcp-token-revoked",
      entity: row._id,
      detail: row.label,
      at: Date.now(),
    });
    return null;
  },
});

async function signSessionToken(
  userId: Id<"users">,
  sessionId: Id<"authSessions">
) {
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const issuer = process.env.CONVEX_SITE_URL;
  if (!(privateKey && issuer)) {
    throw new Error("JWT_PRIVATE_KEY and CONVEX_SITE_URL must be configured");
  }
  const key = await importPKCS8(privateKey, "RS256");
  const expiresAt = Date.now() + SESSION_MS;
  const jwt = await new SignJWT({ sub: `${userId}|${sessionId}` })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience("convex")
    .setExpirationTime(new Date(expiresAt))
    .sign(key);
  return { jwt, expiresAt };
}

/**
 * Exchanges an agent token for a Convex Auth session JWT. Returns null for
 * unknown, revoked, or non-administrator tokens so callers answer 401 without
 * leaking which case applied. Tokens carry 256 bits of entropy, so no
 * additional throttling is applied here.
 */
export const exchange = mutation({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      jwt: v.string(),
      expiresAt: v.number(),
      email: v.string(),
      userId: v.id("users"),
      label: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    if (
      args.token.length !== TOKEN_LENGTH ||
      !args.token.startsWith(TOKEN_PREFIX)
    ) {
      return null;
    }
    const digest = await hash(args.token);
    const row = await ctx.db
      .query("mcpTokens")
      .withIndex("by_hash", (q) => q.eq("hash", digest))
      .unique();
    if (!row || row.revokedAt) {
      return null;
    }
    const user = await ctx.db.get(row.userId);
    if (
      !user?.email ||
      user.emailVerificationTime === undefined ||
      !isAdminEmail(user.email)
    ) {
      return null;
    }
    const now = Date.now();
    const expirationTime = now + SESSION_MS;
    const existing = row.sessionId ? await ctx.db.get(row.sessionId) : null;
    let sessionId: Id<"authSessions">;
    if (existing) {
      sessionId = existing._id;
      await ctx.db.patch(sessionId, { expirationTime });
    } else {
      sessionId = await ctx.db.insert("authSessions", {
        userId: row.userId,
        expirationTime,
      });
    }
    await ctx.db.patch(row._id, { lastUsedAt: now, sessionId });
    const { jwt, expiresAt } = await signSessionToken(row.userId, sessionId);
    return {
      jwt,
      expiresAt,
      email: user.email,
      userId: row.userId,
      label: row.label,
    };
  },
});

/** Who the current session belongs to; lets an agent confirm its identity. */
export const whoami = query({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    admin: v.boolean(),
  }),
  handler: async (ctx) => {
    const actor = await staff(ctx);
    const user = await ctx.db.get(actor.userId);
    return {
      userId: actor.userId,
      email: user?.email ?? "",
      admin: actor.admin,
    };
  },
});

const readableTable = v.union(
  v.literal("registrationCourses"),
  v.literal("registrationSessions"),
  v.literal("registrationSeats"),
  v.literal("registrationOrders"),
  v.literal("registrationCoupons"),
  v.literal("registrationOrganizations"),
  v.literal("registrationGroupRequests"),
  v.literal("registrationInvoices"),
  v.literal("registrationMaterials"),
  v.literal("registrationLocations"),
  v.literal("registrationEntitlements"),
  v.literal("registrationRefunds"),
  v.literal("registrationJobs"),
  v.literal("registrationCodes"),
  v.literal("registrationWaitlist"),
  v.literal("registrationSessionFiles"),
  v.literal("seo_pages"),
  v.literal("profiles"),
  v.literal("users")
);

/** Reads one record by id. The admin UI gets these through live subscriptions. */
export const record = query({
  args: { table: readableTable, id: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await admin(ctx);
    const id = ctx.db.normalizeId(args.table, args.id);
    if (!id) {
      throw new ConvexError(`Not a valid ${args.table} id`);
    }
    return await ctx.db.get(id);
  },
});

/** Everything the registrations screen shows for one order. */
export const orderDetail = query({
  args: { orderId: v.id("registrationOrders") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await admin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError("Order not found");
    }
    const seats = await ctx.db
      .query("registrationSeats")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect();
    const [invoices, refunds, organization, session, course, emails] =
      await Promise.all([
        ctx.db
          .query("registrationInvoices")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect(),
        ctx.db
          .query("registrationRefunds")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect(),
        order.organizationId ? ctx.db.get(order.organizationId) : null,
        order.sessionId ? ctx.db.get(order.sessionId) : null,
        ctx.db.get(order.courseId),
        Promise.all(
          seats.map((seat) =>
            ctx.db
              .query("registrationJobs")
              .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
              .collect()
          )
        ),
      ]);
    return {
      order,
      seats,
      invoices,
      refunds,
      organization,
      session,
      course,
      emails: emails.flat(),
    };
  },
});

/** Session plus its course, roster counts, waitlist, and scheduled emails. */
export const sessionOverview = query({
  args: { sessionId: v.id("registrationSessions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await staff(ctx, args.sessionId);
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }
    const [course, seats, waitlist, instructors, files] = await Promise.all([
      ctx.db.get(session.courseId),
      ctx.db
        .query("registrationSeats")
        .withIndex("by_sessionId_and_state", (q) =>
          q.eq("sessionId", session._id)
        )
        .collect(),
      ctx.db
        .query("registrationWaitlist")
        .withIndex("by_sessionId_and_state", (q) =>
          q.eq("sessionId", session._id)
        )
        .collect(),
      Promise.all(session.instructors.map((id) => ctx.db.get(id))),
      ctx.db
        .query("registrationSessionFiles")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect(),
    ]);
    const counts = { held: 0, active: 0, canceled: 0, transferred: 0 };
    for (const seat of seats) {
      counts[seat.state] += 1;
    }
    return {
      session,
      course,
      seatCounts: counts,
      available: Math.max(0, session.capacity - session.reserved),
      waitlist,
      instructors: instructors
        .filter((u) => u !== null)
        .map((u) => ({ id: u._id, email: u.email ?? "", name: u.name })),
      files: files.map((f) => ({
        _id: f._id,
        name: f.name,
        type: f.type,
        size: f.size,
        uploadedAt: f.uploadedAt,
      })),
    };
  },
});

/** A SEO page in any publication state, by slug. */
export const seoPage = query({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await admin(ctx);
    return await ctx.db
      .query("seo_pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

const groupStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("quoted"),
  v.literal("scheduled"),
  v.literal("closed")
);

/**
 * Partial update of a group request in one transaction: omitted fields keep
 * their stored value, and null clears a link. The admin UI's form sends every
 * field, so it keeps using registrationGroups.updateGroupRequest.
 */
export const patchGroupRequest = mutation({
  args: {
    id: v.id("registrationGroupRequests"),
    status: v.optional(groupStatus),
    internalNotes: v.optional(v.string()),
    organizationId: v.optional(
      v.union(v.id("registrationOrganizations"), v.null())
    ),
    orderId: v.optional(v.union(v.id("registrationOrders"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await admin(ctx);
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new ConvexError("Request not found");
    }
    const patch: Partial<Doc<"registrationGroupRequests">> = {
      updatedAt: Date.now(),
    };
    if (args.status !== undefined) {
      patch.status = args.status;
    }
    if (args.internalNotes !== undefined) {
      if (args.internalNotes.length > 5000) {
        throw new ConvexError("Internal notes are too long");
      }
      patch.internalNotes = args.internalNotes;
    }
    if (args.organizationId !== undefined) {
      patch.organizationId = args.organizationId ?? undefined;
    }
    if (args.orderId !== undefined) {
      patch.orderId = args.orderId ?? undefined;
    }
    await ctx.db.patch(request._id, patch);
    await ctx.db.insert("registrationActivity", {
      actor: actor.userId,
      action: "group-request-updated",
      entity: request._id,
      detail: `${request.status} -> ${args.status ?? request.status}`,
      at: Date.now(),
    });
    return null;
  },
});

/** Pending and in-flight email jobs, oldest first. */
export const emailQueue = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await admin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const [pending, sending] = await Promise.all([
      ctx.db
        .query("registrationJobs")
        .withIndex("by_state_and_due", (q) => q.eq("state", "pending"))
        .take(limit),
      ctx.db
        .query("registrationJobs")
        .withIndex("by_state_and_due", (q) => q.eq("state", "sending"))
        .take(limit),
    ]);
    return [...pending, ...sending]
      .sort((a, b) => a.due - b.due)
      .slice(0, limit);
  },
});
