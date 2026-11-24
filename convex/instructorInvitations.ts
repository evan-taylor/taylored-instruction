import { ConvexError, v } from "convex/values";
import { createElement } from "react";
import { Resend } from "resend";
import { renderEmailHtml } from "../emails/components/render";
import InstructorInvitationEmail from "../emails/InstructorInvitationEmail";
import { isAdminEmail } from "../shared/adminEmails";
import { SUPPORT_EMAIL } from "../shared/email";
import { registrationRecipient } from "../shared/registration/environment";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { alignmentCourseIds, isActiveInstructorRecord } from "./aligned";
import { auth } from "./auth";

const invitation = v.object({
  id: v.id("instructorInvitations"),
  email: v.string(),
  invitedBy: v.union(v.string(), v.null()),
  createdAt: v.number(),
  acceptedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  sentAt: v.optional(v.number()),
  sendError: v.optional(v.string()),
  teaches: v.boolean(),
  courseIds: v.optional(v.array(v.id("registrationCourses"))),
});

/** Whether accepting makes them teach for us. Legacy aligned-only rows do not. */
function teachesFor(row: Doc<"instructorInvitations">) {
  return row.teaches ?? row.kind !== "aligned";
}

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

async function send(ctx: MutationCtx, row: Doc<"instructorInvitations">) {
  // Each send is numbered so a slow earlier attempt cannot overwrite the
  // outcome of a resend that finished after it.
  const attempt = (row.attempt ?? 0) + 1;
  await ctx.db.patch(row._id, {
    attempt,
    sentAt: undefined,
    sendError: undefined,
  });
  await ctx.scheduler.runAfter(
    0,
    internal.instructorInvitations.sendInvitationEmail,
    {
      id: row._id,
      email: row.email,
      attempt,
      teaches: teachesFor(row),
      courses: await courseTitles(ctx, row.courseIds),
    }
  );
}

async function courseTitles(
  ctx: QueryCtx,
  courseIds: Id<"registrationCourses">[] | undefined
) {
  const courses = await Promise.all(
    (courseIds ?? []).map((id) => ctx.db.get(id))
  );
  return courses.flatMap((course) => (course ? [course.title] : []));
}

/** True when an account holding this email already has an active instructor record. */
async function hasInstructorRecord(ctx: QueryCtx, email: string) {
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
  return profiles.some(isActiveInstructorRecord);
}

/** Accepting fills in the person's single instructor record. */
async function grantAccess(
  ctx: MutationCtx,
  userId: Id<"users">,
  row: Doc<"instructorInvitations">
) {
  const now = new Date().toISOString();
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (profile?.deactivatedAt) {
    throw new ConvexError("This account has been disabled. Contact us.");
  }
  const teaches = teachesFor(row);
  const courseIds = row.courseIds?.length
    ? await alignmentCourseIds(ctx, row.courseIds).catch(() => {
        throw new ConvexError(
          "The courses on this invitation are no longer available. Ask us to send an updated invitation."
        );
      })
    : null;
  const alignment = courseIds
    ? {
        courseIds: [
          ...new Set([...(profile?.alignment?.courseIds ?? []), ...courseIds]),
        ],
        since: profile?.alignment?.since ?? Date.now(),
        by: profile?.alignment?.by ?? row.invitedBy,
      }
    : profile?.alignment;
  if (profile) {
    await ctx.db.patch(profile._id, {
      isInstructor: profile.isInstructor || teaches,
      alignment,
      updatedAt: now,
      lastLogin: now,
    });
    return;
  }
  await ctx.db.insert("profiles", {
    userId,
    isInstructor: teaches,
    alignment,
    updatedAt: now,
    lastLogin: now,
    notifiedAt: now,
  });
}

/**
 * Cancels every pending invitation for an email. Called when an admin
 * removes access, so an old invitation can never restore it.
 */
export async function revokeInvitationsFor(ctx: MutationCtx, email: string) {
  const normalized = email.trim().toLowerCase();
  const rows = await ctx.db
    .query("instructorInvitations")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .collect();
  await Promise.all(
    rows
      .filter((row) => !(row.acceptedAt || row.revokedAt))
      .map((row) => ctx.db.patch(row._id, { revokedAt: Date.now() }))
  );
}

/**
 * Admin sends (or re-sends) an instructor invitation. One pending invitation
 * exists per email; inviting again updates and re-sends the same one.
 * Accepting can make them teach for us, mark them aligned with our Training
 * Site for the chosen courses, or both.
 */
export const invite = mutation({
  args: {
    email: v.string(),
    teaches: v.optional(v.boolean()),
    courseIds: v.optional(v.array(v.id("registrationCourses"))),
  },
  returns: v.id("instructorInvitations"),
  handler: async (ctx, args) => {
    const invitedBy = await admin(ctx);
    const email = normalize(args.email);
    const teaches = args.teaches ?? true;
    const courseIds = args.courseIds?.length
      ? await alignmentCourseIds(ctx, args.courseIds)
      : undefined;
    if (!(teaches || courseIds)) {
      throw new ConvexError(
        "Choose whether they teach for us, are aligned with our Training Site, or both"
      );
    }
    if (await hasInstructorRecord(ctx, email)) {
      throw new ConvexError(
        "That person is already an approved instructor or aligned with our Training Site. Change their access in the instructor list."
      );
    }
    const pending = await pendingFor(ctx, email);
    if (pending) {
      await ctx.db.patch(pending._id, { teaches, courseIds, kind: undefined });
    }
    const id =
      pending?._id ??
      (await ctx.db.insert("instructorInvitations", {
        email,
        invitedBy,
        createdAt: Date.now(),
        teaches,
        courseIds,
      }));
    const row = await ctx.db.get(id);
    if (row) {
      await send(ctx, row);
    }
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
    // Every pending invitation stays actionable; settled history is capped.
    const pending = await ctx.db
      .query("instructorInvitations")
      .filter((q) =>
        q.and(
          q.eq(q.field("acceptedAt"), undefined),
          q.eq(q.field("revokedAt"), undefined)
        )
      )
      .order("desc")
      .collect();
    const settled = await ctx.db
      .query("instructorInvitations")
      .filter((q) =>
        q.or(
          q.neq(q.field("acceptedAt"), undefined),
          q.neq(q.field("revokedAt"), undefined)
        )
      )
      .order("desc")
      .take(100);
    const rows = [...pending, ...settled];
    const inviterIds = [...new Set(rows.map((row) => row.invitedBy))];
    const inviters = new Map(
      await Promise.all(
        inviterIds.map(
          async (id) => [id, (await ctx.db.get(id))?.email ?? null] as const
        )
      )
    );
    return rows.map((row) => ({
      id: row._id,
      email: row.email,
      invitedBy: inviters.get(row.invitedBy) ?? null,
      createdAt: row.createdAt,
      acceptedAt: row.acceptedAt,
      revokedAt: row.revokedAt,
      sentAt: row.sentAt,
      sendError: row.sendError,
      teaches: teachesFor(row),
      courseIds: row.courseIds,
    }));
  },
});

/** The signed-in person's own pending invitation, if their verified email has one. */
export const mine = query({
  args: {},
  returns: v.union(
    v.object({
      id: v.id("instructorInvitations"),
      createdAt: v.number(),
      teaches: v.boolean(),
      courses: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const me = await verifiedEmail(ctx);
    if (!me) {
      return null;
    }
    const pending = await pendingFor(ctx, me.email);
    return pending
      ? {
          id: pending._id,
          createdAt: pending.createdAt,
          teaches: teachesFor(pending),
          courses: await courseTitles(ctx, pending.courseIds),
        }
      : null;
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
    await grantAccess(ctx, me.userId, pending);
    return null;
  },
});

export const recordSend = internalMutation({
  args: {
    id: v.id("instructorInvitations"),
    attempt: v.number(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    // Only the latest attempt may report; older ones are stale.
    if (row && row.attempt === args.attempt) {
      await ctx.db.patch(
        args.id,
        args.error
          ? { sendError: args.error, sentAt: undefined }
          : { sentAt: Date.now(), sendError: undefined }
      );
    }
    return null;
  },
});

/** Sends the invitation and records whether the provider accepted it. */
export const sendInvitationEmail = internalAction({
  args: {
    id: v.id("instructorInvitations"),
    email: v.string(),
    attempt: v.number(),
    teaches: v.optional(v.boolean()),
    /** Legacy: queued before teaches existed. */
    kind: v.optional(v.literal("aligned")),
    courses: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await deliver(
        args.email,
        args.teaches ?? args.kind !== "aligned",
        args.courses ?? []
      );
      await ctx.runMutation(internal.instructorInvitations.recordSend, {
        id: args.id,
        attempt: args.attempt,
      });
    } catch (error) {
      await ctx.runMutation(internal.instructorInvitations.recordSend, {
        id: args.id,
        attempt: args.attempt,
        error: error instanceof Error ? error.message : "Email failed",
      });
      throw error;
    }
    return null;
  },
});

const TEACHING = "instructor tools and your assigned sessions";
const INDEPENDENT =
  "the independent instructor portal, where you schedule your own classes, keep rosters, and export them for card issuing";

async function deliver(email: string, teaches: boolean, courses: string[]) {
  const aligned = courses.length > 0;
  const subject =
    aligned && !teaches
      ? "Your Taylored Instruction alignment is approved"
      : "You’re invited to teach with Taylored Instruction";
  const intro =
    aligned && !teaches
      ? "Your alignment with the Taylored Instruction Training Site is approved."
      : "You’re invited to teach with Taylored Instruction.";
  const unlocks = [
    ...(teaches ? [TEACHING] : []),
    ...(aligned ? [INDEPENDENT] : []),
    "eCard purchasing",
  ].join(", plus ");
  const { AUTH_EMAIL_FROM: from, SITE_URL: site } = process.env;
  if (!(from && site && process.env.RESEND_API_KEY)) {
    throw new Error("Configure AUTH_EMAIL_FROM, SITE_URL, and RESEND_API_KEY");
  }
  const { origin } = new URL(site);
  const signInUrl = `${origin}/my-account`;
  const response = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from,
    to: [registrationRecipient(email)],
    replyTo: SUPPORT_EMAIL,
    subject,
    html: renderEmailHtml(
      createElement(InstructorInvitationEmail, {
        signInUrl,
        email,
        teaches,
        courses,
      })
    ),
    text: [
      intro,
      ...(aligned ? [`Aligned courses: ${courses.join(", ")}.`] : []),
      `Sign in at ${signInUrl} using ${email}, then choose “Accept invitation” on your account page. That unlocks ${unlocks}.`,
      "No password is needed: we email you a one-time code when you sign in.",
      `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
    ].join("\n\n"),
  });
  if (response.error) {
    throw new Error(response.error.message);
  }
}
