import { ConvexError, v } from "convex/values";
import { createElement } from "react";
import { Resend } from "resend";
import { renderEmailHtml } from "../emails/components/render";
import InstructorInvitationEmail from "../emails/InstructorInvitationEmail";
import { isAdminEmail } from "../shared/adminEmails";
import { SUPPORT_EMAIL } from "../shared/email";
import { registrationRecipient } from "../shared/registration/environment";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { auth } from "./auth";

const invitation = v.object({
  id: v.id("instructorInvitations"),
  email: v.string(),
  invitedBy: v.union(v.string(), v.null()),
  createdAt: v.number(),
  acceptedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function normalize(email: string) {
  const value = email.trim().toLowerCase();
  if (!EMAIL.test(value)) {
    throw new ConvexError("Enter a valid email address");
  }
  return value;
}

async function admin(ctx: QueryCtx) {
  const userId = await auth.getUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (!(userId && user && isAdminEmail(user.email))) {
    throw new ConvexError("Forbidden: Admin access required");
  }
  return userId;
}

/** The signed-in account's verified email, or null when there is none. */
async function verifiedEmail(ctx: QueryCtx) {
  const userId = await auth.getUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (!(userId && user?.email && user.emailVerificationTime !== undefined)) {
    return null;
  }
  return { userId, email: user.email.trim().toLowerCase() };
}

async function pendingFor(ctx: QueryCtx, email: string) {
  const rows = await ctx.db
    .query("instructorInvitations")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  return rows.find((row) => !(row.acceptedAt || row.revokedAt)) ?? null;
}

/** True when an account holding this email already has active instructor access. */
async function isApprovedInstructor(ctx: QueryCtx, email: string) {
  const byEmail = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  const earlier = await ctx.db
    .query("instructorInvitations")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  const candidates = new Set<Id<"users">>();
  if (byEmail) {
    candidates.add(byEmail._id);
  }
  for (const row of earlier) {
    if (row.acceptedBy) {
      candidates.add(row.acceptedBy);
    }
  }
  const profiles = await Promise.all(
    [...candidates].map((userId) =>
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first()
    )
  );
  return profiles.some((p) => p?.isInstructor && !p.deactivatedAt);
}

async function grantInstructor(ctx: MutationCtx, userId: Id<"users">) {
  const now = new Date().toISOString();
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (profile) {
    await ctx.db.patch(profile._id, {
      isInstructor: true,
      deactivatedAt: undefined,
      updatedAt: now,
      lastLogin: now,
    });
    return;
  }
  await ctx.db.insert("profiles", {
    userId,
    isInstructor: true,
    updatedAt: now,
    lastLogin: now,
    notifiedAt: now,
  });
}

/**
 * Admin sends (or re-sends) an instructor invitation. One pending invitation
 * exists per email; inviting again re-sends the same one.
 */
export const invite = mutation({
  args: { email: v.string() },
  returns: v.id("instructorInvitations"),
  handler: async (ctx, args) => {
    const invitedBy = await admin(ctx);
    const email = normalize(args.email);
    if (await isApprovedInstructor(ctx, email)) {
      throw new ConvexError("That person is already an approved instructor");
    }
    const pending = await pendingFor(ctx, email);
    const id =
      pending?._id ??
      (await ctx.db.insert("instructorInvitations", {
        email,
        invitedBy,
        createdAt: Date.now(),
      }));
    await ctx.scheduler.runAfter(
      0,
      internal.instructorInvitations.sendInvitationEmail,
      { email }
    );
    return id;
  },
});

export const revoke = mutation({
  args: { id: v.id("instructorInvitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await admin(ctx);
    const row = await ctx.db.get(args.id);
    if (row && !(row.acceptedAt || row.revokedAt)) {
      await ctx.db.patch(row._id, { revokedAt: Date.now() });
    }
    return null;
  },
});

/** Admin view: pending invitations first, then the most recently settled ones. */
export const list = query({
  args: {},
  returns: v.array(invitation),
  handler: async (ctx) => {
    await admin(ctx);
    const rows = await ctx.db
      .query("instructorInvitations")
      .order("desc")
      .take(200);
    const inviterIds = [...new Set(rows.map((row) => row.invitedBy))];
    const inviters = new Map(
      await Promise.all(
        inviterIds.map(
          async (id) => [id, (await ctx.db.get(id))?.email ?? null] as const
        )
      )
    );
    const settled = (row: { acceptedAt?: number; revokedAt?: number }) =>
      row.acceptedAt || row.revokedAt ? 1 : 0;
    return rows
      .map((row) => ({
        id: row._id,
        email: row.email,
        invitedBy: inviters.get(row.invitedBy) ?? null,
        createdAt: row.createdAt,
        acceptedAt: row.acceptedAt,
        revokedAt: row.revokedAt,
      }))
      .sort((a, b) => settled(a) - settled(b));
  },
});

/** The signed-in person's own pending invitation, if their verified email has one. */
export const mine = query({
  args: {},
  returns: v.union(
    v.object({ id: v.id("instructorInvitations"), createdAt: v.number() }),
    v.null()
  ),
  handler: async (ctx) => {
    const me = await verifiedEmail(ctx);
    if (!me) {
      return null;
    }
    const pending = await pendingFor(ctx, me.email);
    return pending ? { id: pending._id, createdAt: pending.createdAt } : null;
  },
});

/**
 * Accepting is the only way an account becomes an instructor on its own.
 * The invitation must be pending for the account's verified email.
 */
export const accept = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const me = await verifiedEmail(ctx);
    if (!me) {
      throw new ConvexError("Sign in with a verified email first");
    }
    const pending = await pendingFor(ctx, me.email);
    if (!pending) {
      throw new ConvexError("No pending invitation for this email");
    }
    await ctx.db.patch(pending._id, {
      acceptedAt: Date.now(),
      acceptedBy: me.userId,
    });
    await grantInstructor(ctx, me.userId);
    return null;
  },
});

export const sendInvitationEmail = internalAction({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const { AUTH_EMAIL_FROM: from, SITE_URL: site } = process.env;
    if (!(from && site && process.env.RESEND_API_KEY)) {
      throw new Error(
        "Configure AUTH_EMAIL_FROM, SITE_URL, and RESEND_API_KEY"
      );
    }
    const { origin } = new URL(site);
    const signInUrl = `${origin}/my-account`;
    const response = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from,
      to: [registrationRecipient(args.email)],
      replyTo: SUPPORT_EMAIL,
      subject: "You’re invited to teach with Taylored Instruction",
      html: renderEmailHtml(
        createElement(InstructorInvitationEmail, {
          signInUrl,
          email: args.email,
        })
      ),
      text: [
        "You’re invited to teach with Taylored Instruction.",
        `Sign in at ${signInUrl} using ${args.email}, then choose “Accept invitation” on your account page. That unlocks instructor tools, eCard purchasing, and your assigned sessions.`,
        "No password is needed: we email you a one-time code when you sign in.",
        `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
      ].join("\n\n"),
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return null;
  },
});
