import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, type Infer, v } from "convex/values";
import { createElement } from "react";
import { Resend } from "resend";
import CertificationDigestEmail, {
  type CertificationDigestRow,
  certificationDigestSubject,
} from "../emails/CertificationDigestEmail";
import CertificationReminderEmail, {
  certificationReminderSubject,
} from "../emails/CertificationReminderEmail";
import { renderEmailHtml } from "../emails/components/render";
import { ADMIN_EMAILS, isAdminEmail } from "../shared/adminEmails";
import { SUPPORT_EMAIL } from "../shared/email";
import {
  addDays,
  agencyLabel,
  agencyShortLabel,
  CERTIFICATION_TYPES,
  certificationToday,
  daysUntil,
  dueReminderThreshold,
  expiringCounts,
  formatCertificationDate,
  isCalendarDate,
  reminderLabel,
  supersededIds,
  typeLabel,
} from "../shared/instructor-certifications";
import { MAX_CERTIFICATE_BYTES } from "../shared/registration/certificate";
import { registrationRecipient } from "../shared/registration/environment";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { activeAlignment } from "./aligned";
import { CERTIFICATE_SIGNATURES } from "./registrationCertificates";

const MAX_ATTEMPTS = 3;
/** A send still claimed after this long was interrupted and may be retried. */
const CLAIM_TIMEOUT_MS = 15 * 60 * 1000;
const DIGEST_RETRY_MS = 60 * 60 * 1000;

const todayArg = { today: v.optional(v.string()) };

/**
 * The calendar date a query reports against. Clients pass their own Pacific
 * date so open pages re-query when it rolls over at midnight.
 */
function reportDate(today: string | undefined) {
  if (today === undefined) {
    return certificationToday();
  }
  if (!isCalendarDate(today)) {
    throw new ConvexError("Invalid date");
  }
  return today;
}
const TEXT_LIMIT = 80;

const agencyValidator = v.union(
  v.literal("arc"),
  v.literal("aha"),
  v.literal("other")
);

const fields = {
  agency: agencyValidator,
  agencyOther: v.optional(v.string()),
  type: v.string(),
  typeOther: v.optional(v.string()),
  number: v.optional(v.string()),
  issuedOn: v.string(),
  expiresOn: v.string(),
};
const fieldsValidator = v.object(fields);

async function signedIn(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (!(userId && user?.email) || user.emailVerificationTime === undefined) {
    throw new ConvexError("Verified sign-in required");
  }
  return { userId, user, admin: isAdminEmail(user.email) };
}

async function requireAdmin(ctx: QueryCtx) {
  const me = await signedIn(ctx);
  if (!me.admin) {
    throw new ConvexError("Forbidden: Admin access required");
  }
  return me;
}

/**
 * Who can hold instructor certifications: employed instructors and aligned
 * independent instructors. Certifications are keyed to the user, never the role.
 */
async function isActiveInstructor(ctx: QueryCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (profile?.isInstructor && !profile.deactivatedAt) {
    return true;
  }
  return (await activeAlignment(ctx, userId)) !== null;
}

function displayName(user: Doc<"users"> | null) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return full || user?.name || user?.email || "Unknown instructor";
}

async function instructorDirectory(ctx: QueryCtx) {
  const profiles = await ctx.db
    .query("profiles")
    .withIndex("by_instructor_status", (q) => q.eq("isInstructor", true))
    .collect();
  const grants = await ctx.db.query("alignedInstructors").collect();
  const aligned = await Promise.all(
    grants.map(async (grant) =>
      (await activeAlignment(ctx, grant.userId)) ? grant.userId : null
    )
  );
  const ids = new Set([
    ...profiles
      .filter((profile) => !profile.deactivatedAt)
      .map((profile) => profile.userId),
    ...aligned.filter((id) => id !== null),
  ]);
  const users = await Promise.all([...ids].map((id) => ctx.db.get(id)));
  return users
    .filter((user): user is Doc<"users"> => user !== null)
    .map((user) => ({
      userId: user._id,
      name: displayName(user),
      email: user.email ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Staff may manage anyone's certifications; an instructor only their own. */
async function authorize(ctx: QueryCtx, owner: Id<"users">) {
  const me = await signedIn(ctx);
  if (me.admin) {
    return me;
  }
  if (owner !== me.userId || !(await isActiveInstructor(ctx, me.userId))) {
    throw new ConvexError("Forbidden");
  }
  return me;
}

async function editable(ctx: QueryCtx, id: Id<"instructorCertifications">) {
  const certification = await ctx.db.get(id);
  if (!certification) {
    throw new ConvexError("Certification not found");
  }
  const me = await authorize(ctx, certification.userId);
  return { me, certification };
}

function label(
  certification: Pick<
    Doc<"instructorCertifications">,
    "agency" | "agencyOther" | "type" | "typeOther"
  >
) {
  return `${agencyShortLabel(certification.agency, certification.agencyOther)} ${typeLabel(certification.type, certification.typeOther)}`;
}

async function log(
  ctx: MutationCtx,
  entry: Omit<
    Doc<"instructorCertificationActivity">,
    "_id" | "_creationTime" | "at"
  >
) {
  await ctx.db.insert("instructorCertificationActivity", {
    ...entry,
    at: Date.now(),
  });
}

function optionalText(value: string | undefined, name: string) {
  const trimmed = value?.trim();
  if (trimmed && trimmed.length > TEXT_LIMIT) {
    throw new ConvexError(`Keep the ${name} under ${TEXT_LIMIT} characters`);
  }
  return trimmed || undefined;
}

function clean(input: Infer<typeof fieldsValidator>) {
  if (!CERTIFICATION_TYPES.some((option) => option.value === input.type)) {
    throw new ConvexError("Choose a certification type");
  }
  const agencyOther =
    input.agency === "other"
      ? optionalText(input.agencyOther, "agency")
      : undefined;
  const typeOther =
    input.type === "other"
      ? optionalText(input.typeOther, "certification name")
      : undefined;
  if (input.agency === "other" && !agencyOther) {
    throw new ConvexError("Name the certifying agency");
  }
  if (input.type === "other" && !typeOther) {
    throw new ConvexError("Name the certification");
  }
  if (!(isCalendarDate(input.issuedOn) && isCalendarDate(input.expiresOn))) {
    throw new ConvexError("Enter valid issue and expiration dates");
  }
  if (input.expiresOn <= input.issuedOn) {
    throw new ConvexError("The expiration date must be after the issue date");
  }
  return {
    agency: input.agency,
    agencyOther,
    type: input.type,
    typeOther,
    number: optionalText(input.number, "certificate ID"),
    issuedOn: input.issuedOn,
    expiresOn: input.expiresOn,
  };
}

async function rows(
  ctx: QueryCtx,
  certifications: Doc<"instructorCertifications">[],
  today: string
) {
  const superseded = supersededIds(
    certifications.map((row) => ({ ...row, id: row._id }))
  );
  return await Promise.all(
    certifications.map(async (row) => {
      const verifier = row.verifiedBy ? await ctx.db.get(row.verifiedBy) : null;
      return {
        id: row._id,
        userId: row.userId,
        agency: row.agency,
        agencyOther: row.agencyOther,
        type: row.type,
        typeOther: row.typeOther,
        number: row.number,
        issuedOn: row.issuedOn,
        expiresOn: row.expiresOn,
        daysLeft: daysUntil(row.expiresOn, today),
        superseded: superseded.has(row._id),
        card: row.card
          ? {
              name: row.card.name,
              type: row.card.type,
              size: row.card.size,
              url: await ctx.storage.getUrl(row.card.storageId),
            }
          : null,
        verified: row.verifiedAt
          ? { at: row.verifiedAt, by: displayName(verifier) }
          : null,
        updatedAt: row.updatedAt,
      };
    })
  );
}

async function certificationsOf(ctx: QueryCtx, userId: Id<"users">) {
  const list = await ctx.db
    .query("instructorCertifications")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  return list.sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
}

/** The signed-in instructor's own certifications; null for anyone who can't hold them. */
export const mine = query({
  args: todayArg,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const me = await signedIn(ctx);
    if (!(me.admin || (await isActiveInstructor(ctx, me.userId)))) {
      return null;
    }
    const today = reportDate(args.today);
    return {
      today,
      certifications: await rows(
        ctx,
        await certificationsOf(ctx, me.userId),
        today
      ),
    };
  },
});

type Values = ReturnType<typeof clean>;

async function update(
  ctx: MutationCtx,
  id: Id<"instructorCertifications">,
  values: Values
) {
  const { me, certification } = await editable(ctx, id);
  const changes = (Object.keys(values) as (keyof Values)[]).filter(
    (key) => values[key] !== certification[key]
  );
  if (changes.length === 0) {
    return certification;
  }
  // An instructor's own edit needs staff to look at the card again.
  const unverify = !me.admin && certification.verifiedAt !== undefined;
  await ctx.db.patch(id, {
    ...values,
    updatedAt: Date.now(),
    updatedBy: me.userId,
    ...(unverify ? { verifiedAt: undefined, verifiedBy: undefined } : {}),
  });
  const renewed = values.expiresOn !== certification.expiresOn;
  const what = renewed
    ? `expiration ${certification.expiresOn} → ${values.expiresOn}`
    : `changed ${changes.join(", ")}`;
  await log(ctx, {
    userId: certification.userId,
    certificationId: id,
    actor: me.userId,
    action: renewed ? "renewed" : "updated",
    detail: `${label(values)}: ${what}${unverify ? "; staff verification cleared" : ""}`,
  });
  return certification;
}

async function create(
  ctx: MutationCtx,
  userId: Id<"users"> | undefined,
  values: Values
) {
  const me = await signedIn(ctx);
  const owner = userId ?? me.userId;
  if (!(me.admin || owner === me.userId)) {
    throw new ConvexError("Forbidden");
  }
  const adminSelf = me.admin && owner === me.userId;
  if (!(adminSelf || (await isActiveInstructor(ctx, owner)))) {
    throw new ConvexError(
      me.admin ? "That account is not an active instructor" : "Forbidden"
    );
  }
  const now = Date.now();
  const id = await ctx.db.insert("instructorCertifications", {
    ...values,
    userId: owner,
    createdAt: now,
    createdBy: me.userId,
    updatedAt: now,
    updatedBy: me.userId,
  });
  await log(ctx, {
    userId: owner,
    certificationId: id,
    actor: me.userId,
    action: "added",
    detail: `${label(values)}, expires ${values.expiresOn}${owner === me.userId ? "" : " (entered by staff)"}`,
  });
  return id;
}

/** Adds a certification, or edits one when `id` is given. Staff pass `userId` to act for an instructor. */
export const save = mutation({
  args: {
    id: v.optional(v.id("instructorCertifications")),
    userId: v.optional(v.id("users")),
    ...fields,
  },
  returns: v.id("instructorCertifications"),
  handler: async (ctx, { id, userId, ...input }) => {
    const values = clean(input);
    if (!id) {
      return await create(ctx, userId, values);
    }
    const certification = await update(ctx, id, values);
    if (userId && userId !== certification.userId) {
      throw new ConvexError("Certification belongs to another instructor");
    }
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("instructorCertifications") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { me, certification } = await editable(ctx, id);
    if (certification.card) {
      await ctx.storage.delete(certification.card.storageId);
    }
    await ctx.db.delete(id);
    await log(ctx, {
      userId: certification.userId,
      certificationId: id,
      actor: me.userId,
      action: "removed",
      detail: `${label(certification)}, ${daysUntil(certification.expiresOn, certificationToday()) < 0 ? "expired" : "expires"} ${certification.expiresOn}`,
    });
    return null;
  },
});

export const setVerified = mutation({
  args: { id: v.id("instructorCertifications"), verified: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, verified }) => {
    const me = await requireAdmin(ctx);
    const certification = await ctx.db.get(id);
    if (!certification) {
      throw new ConvexError("Certification not found");
    }
    if (verified === (certification.verifiedAt !== undefined)) {
      return null;
    }
    await ctx.db.patch(
      id,
      verified
        ? { verifiedAt: Date.now(), verifiedBy: me.userId }
        : { verifiedAt: undefined, verifiedBy: undefined }
    );
    await log(ctx, {
      userId: certification.userId,
      certificationId: id,
      actor: me.userId,
      action: verified ? "verified" : "unverified",
      detail: label(certification),
    });
    return null;
  },
});

export const canEdit = internalQuery({
  args: { id: v.id("instructorCertifications") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await editable(ctx, id);
    return null;
  },
});

export const attachCard = internalMutation({
  args: {
    id: v.id("instructorCertifications"),
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...file }) => {
    const { me, certification } = await editable(ctx, id);
    if (certification.card) {
      await ctx.storage.delete(certification.card.storageId);
    }
    const unverify = !me.admin && certification.verifiedAt !== undefined;
    await ctx.db.patch(id, {
      card: { ...file, uploadedAt: Date.now(), uploadedBy: me.userId },
      updatedAt: Date.now(),
      updatedBy: me.userId,
      ...(unverify ? { verifiedAt: undefined, verifiedBy: undefined } : {}),
    });
    await log(ctx, {
      userId: certification.userId,
      certificationId: id,
      actor: me.userId,
      action: "card-uploaded",
      detail: `${label(certification)}: ${file.name}`,
    });
    return null;
  },
});

/** Stores a PDF, JPEG or PNG copy of the card, replacing any earlier upload. */
export const uploadCard = action({
  args: {
    id: v.id("instructorCertifications"),
    name: v.string(),
    bytes: v.bytes(),
  },
  returns: v.null(),
  handler: async (ctx, { id, name, bytes }): Promise<null> => {
    if (!name.trim() || name.trim().length > 200) {
      throw new ConvexError("Give the file a name under 200 characters");
    }
    if (bytes.byteLength > MAX_CERTIFICATE_BYTES) {
      throw new ConvexError("The card must be 3 MB or smaller");
    }
    const header = new DataView(bytes);
    const format = CERTIFICATE_SIGNATURES.find(
      (signature) =>
        signature.bytes.length <= header.byteLength &&
        signature.bytes.every((byte, index) => header.getUint8(index) === byte)
    );
    if (!format) {
      throw new ConvexError("Choose a PDF, JPEG, or PNG file");
    }
    await ctx.runQuery(internal.instructorCertifications.canEdit, { id });
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: format.type })
    );
    try {
      await ctx.runMutation(internal.instructorCertifications.attachCard, {
        id,
        storageId,
        name: name.trim(),
        type: format.type,
        size: bytes.byteLength,
      });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
    return null;
  },
});

export const removeCard = mutation({
  args: { id: v.id("instructorCertifications") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { me, certification } = await editable(ctx, id);
    if (!certification.card) {
      return null;
    }
    await ctx.storage.delete(certification.card.storageId);
    const unverify = !me.admin && certification.verifiedAt !== undefined;
    await ctx.db.patch(id, {
      card: undefined,
      updatedAt: Date.now(),
      updatedBy: me.userId,
      ...(unverify ? { verifiedAt: undefined, verifiedBy: undefined } : {}),
    });
    await log(ctx, {
      userId: certification.userId,
      certificationId: id,
      actor: me.userId,
      action: "card-removed",
      detail: `${label(certification)}: ${certification.card.name}`,
    });
    return null;
  },
});

/** Every active instructor and their certifications, for the staff report. */
export const report = query({
  args: todayArg,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const today = reportDate(args.today);
    const instructors = await instructorDirectory(ctx);
    const perInstructor = await Promise.all(
      instructors.map(async (instructor) => {
        const list = await rows(
          ctx,
          await certificationsOf(ctx, instructor.userId),
          today
        );
        return Promise.all(
          list.map(async (row) => {
            const reminders = await ctx.db
              .query("instructorCertificationReminders")
              .withIndex(
                "by_certificationId_and_expiresOn_and_threshold",
                (q) =>
                  q.eq("certificationId", row.id).eq("expiresOn", row.expiresOn)
              )
              .collect();
            const [last] = reminders
              .filter((reminder) => reminder.state === "sent")
              .sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
            return {
              ...row,
              instructor: instructor.name,
              email: instructor.email,
              lastReminder: last
                ? {
                    threshold: last.threshold,
                    sentAt: last.sentAt ?? last.createdAt,
                  }
                : null,
            };
          })
        );
      })
    );
    return { today, instructors, certifications: perInstructor.flat() };
  },
});

/** One instructor's certifications, reminder history and audit log. */
export const forInstructor = query({
  args: { userId: v.id("users"), ...todayArg },
  handler: async (ctx, { userId, today: day }) => {
    await requireAdmin(ctx);
    const today = reportDate(day);
    const user = await ctx.db.get(userId);
    const [certifications, reminders, activity] = await Promise.all([
      certificationsOf(ctx, userId),
      ctx.db
        .query("instructorCertificationReminders")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(100),
      ctx.db
        .query("instructorCertificationActivity")
        .withIndex("by_userId_and_at", (q) => q.eq("userId", userId))
        .order("desc")
        .take(100),
    ]);
    const labels = new Map(certifications.map((row) => [row._id, label(row)]));
    const actors = new Map(
      await Promise.all(
        [...new Set(activity.map((row) => row.actor))].map(
          async (actor) =>
            [actor, displayName(await ctx.db.get(actor))] as const
        )
      )
    );
    return {
      today,
      instructor: { userId, name: displayName(user), email: user?.email ?? "" },
      certifications: await rows(ctx, certifications, today),
      reminders: reminders.map((row) => ({
        id: row._id,
        certification:
          labels.get(row.certificationId) ?? "Removed certification",
        expiresOn: row.expiresOn,
        threshold: row.threshold,
        label: reminderLabel(row.threshold),
        state: row.state,
        at: row.sentAt ?? row.createdAt,
        error: row.error,
      })),
      activity: activity.map((row) => ({
        id: row._id,
        action: row.action,
        detail: row.detail,
        actor: actors.get(row.actor) ?? "Unknown",
        at: row.at,
      })),
    };
  },
});

async function currentCertifications(
  ctx: QueryCtx,
  upTo: string,
  from?: string
) {
  const candidates = await ctx.db
    .query("instructorCertifications")
    .withIndex("by_expiresOn", (q) =>
      from
        ? q.gte("expiresOn", from).lte("expiresOn", upTo)
        : q.lte("expiresOn", upTo)
    )
    .collect();
  const owners = [...new Set(candidates.map((row) => row.userId))];
  const eligible = new Map(
    await Promise.all(
      owners.map(async (owner) => {
        const [active, all] = await Promise.all([
          isActiveInstructor(ctx, owner),
          certificationsOf(ctx, owner),
        ]);
        return [
          owner,
          active
            ? supersededIds(all.map((row) => ({ ...row, id: row._id })))
            : null,
        ] as const;
      })
    )
  );
  return candidates.filter((row) => {
    const superseded = eligible.get(row.userId);
    return superseded ? !superseded.has(row._id) : false;
  });
}

/** Counts for the admin dashboard card. */
export const expiringSummary = query({
  args: todayArg,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const today = reportDate(args.today);
    const current = await currentCertifications(ctx, addDays(today, 90));
    return expiringCounts(
      current.map((row) => row.expiresOn),
      today
    );
  },
});

/**
 * Daily: queue the reminder each certification is owed today. The reminder
 * row is written before the send, so a rerun on the same day, or any later
 * day, finds it and never sends that threshold again.
 */
export const runReminders = internalMutation({
  args: { today: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const today = args.today ?? certificationToday();
    const current = await currentCertifications(
      ctx,
      addDays(today, 90),
      addDays(today, -7)
    );
    const queued = await Promise.all(
      current.map(async (certification) => {
        const threshold = dueReminderThreshold(certification.expiresOn, today);
        if (threshold === null) {
          return 0;
        }
        const existing = await ctx.db
          .query("instructorCertificationReminders")
          .withIndex("by_certificationId_and_expiresOn_and_threshold", (q) =>
            q
              .eq("certificationId", certification._id)
              .eq("expiresOn", certification.expiresOn)
              .eq("threshold", threshold)
          )
          .unique();
        const interrupted =
          existing?.state === "sending" &&
          (existing.claimedAt ?? 0) < Date.now() - CLAIM_TIMEOUT_MS;
        const retry =
          (existing?.state === "failed" || interrupted) &&
          existing.attempts < MAX_ATTEMPTS;
        if (existing && !retry) {
          return 0;
        }
        const user = await ctx.db.get(certification.userId);
        if (!user?.email) {
          return 0;
        }
        const id = existing
          ? existing._id
          : await ctx.db.insert("instructorCertificationReminders", {
              certificationId: certification._id,
              userId: certification.userId,
              expiresOn: certification.expiresOn,
              threshold,
              state: "pending",
              attempts: 0,
              recipient: user.email,
              queuedOn: today,
              createdAt: Date.now(),
            });
        if (existing) {
          await ctx.db.patch(id, { state: "pending", error: undefined });
        }
        await ctx.scheduler.runAfter(
          0,
          internal.instructorCertifications.sendReminder,
          { id }
        );
        return 1;
      })
    );
    return queued.reduce((sum: number, count: number) => sum + count, 0);
  },
});

export const claimReminder = internalMutation({
  args: { id: v.id("instructorCertificationReminders") },
  handler: async (ctx, { id }) => {
    const reminder = await ctx.db.get(id);
    if (reminder?.state !== "pending") {
      return null;
    }
    const certification = await ctx.db.get(reminder.certificationId);
    // Renewed, replaced by a newer card, or the instructor left since queueing.
    const stillOwed =
      certification?.expiresOn === reminder.expiresOn &&
      (await isActiveInstructor(ctx, certification.userId)) &&
      !supersededIds(
        (await certificationsOf(ctx, certification.userId)).map((row) => ({
          ...row,
          id: row._id,
        }))
      ).has(certification._id);
    if (!(certification && stillOwed)) {
      await ctx.db.patch(id, { state: "canceled" });
      return null;
    }
    const user = await ctx.db.get(certification.userId);
    await ctx.db.patch(id, {
      state: "sending",
      attempts: reminder.attempts + 1,
      claimedAt: Date.now(),
    });
    return {
      recipient: reminder.recipient,
      name: user?.firstName || displayName(user),
      certification: typeLabel(certification.type, certification.typeOther),
      agency: agencyLabel(certification.agency, certification.agencyOther),
      number: certification.number,
      expiresOn: formatCertificationDate(certification.expiresOn),
      // Fixed at queue time so a retry sends identical content under the same key.
      daysLeft: daysUntil(certification.expiresOn, reminder.queuedOn),
    };
  },
});

export const recordReminder = internalMutation({
  args: {
    id: v.id("instructorCertificationReminders"),
    providerId: v.optional(v.string()),
    deliveredTo: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, error, ...delivery }) => {
    await ctx.db.patch(
      id,
      error
        ? { state: "failed", error }
        : { ...delivery, state: "sent", sentAt: Date.now(), error: undefined }
    );
    return null;
  },
});

function siteOrigin() {
  const site = process.env.SITE_URL;
  if (!site) {
    throw new Error("Configure SITE_URL");
  }
  return new URL(site).origin;
}

/** Test mode redirects every message to REGISTRATION_TEST_RECIPIENT. */
async function deliver(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const from = process.env.AUTH_EMAIL_FROM;
  if (!(from && process.env.RESEND_API_KEY)) {
    throw new Error("Configure AUTH_EMAIL_FROM and RESEND_API_KEY");
  }
  const to = registrationRecipient(message.to);
  const response = await new Resend(process.env.RESEND_API_KEY).emails.send(
    {
      from,
      to: [to],
      replyTo: SUPPORT_EMAIL,
      subject: message.subject,
      html: message.html,
      text: message.text,
    },
    { idempotencyKey: message.idempotencyKey }
  );
  if (response.error) {
    throw new Error(response.error.message);
  }
  return { providerId: response.data?.id, deliveredTo: to };
}

export const sendReminder = internalAction({
  args: { id: v.id("instructorCertificationReminders") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const reminder = await ctx.runMutation(
      internal.instructorCertifications.claimReminder,
      { id }
    );
    if (!reminder) {
      return null;
    }
    try {
      const { recipient, ...props } = reminder;
      const profileUrl = `${siteOrigin()}/my-account#certifications`;
      const subject = certificationReminderSubject(props);
      const delivery = await deliver({
        to: recipient,
        subject,
        html: renderEmailHtml(
          createElement(CertificationReminderEmail, { ...props, profileUrl })
        ),
        text: [
          `Hi ${props.name},`,
          `${subject} (${props.agency}${props.number ? `, ID ${props.number}` : ""}). Expiration date: ${props.expiresOn}.`,
          `Once you renew, enter the new expiration date and upload the new card at ${profileUrl}.`,
          `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
        ].join("\n\n"),
        idempotencyKey: `certification-reminder:${id}`,
      });
      await ctx.runMutation(internal.instructorCertifications.recordReminder, {
        id,
        ...delivery,
      });
    } catch (error) {
      await ctx.runMutation(internal.instructorCertifications.recordReminder, {
        id,
        error: error instanceof Error ? error.message : "Email failed",
      });
    }
    return null;
  },
});

const digestRow = v.object({
  instructor: v.string(),
  certification: v.string(),
  expiresOn: v.string(),
  daysLeft: v.number(),
});

/**
 * Weekly: email staff the certifications that are expired or expire within
 * 90 days. Nothing is sent when nothing needs renewing, and one row per week
 * keeps a rerun from sending twice.
 */
export const runDigest = internalMutation({
  args: { today: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const today = args.today ?? certificationToday();
    const sent = await ctx.db
      .query("instructorCertificationDigests")
      .withIndex("by_week", (q) => q.eq("week", today))
      .unique();
    if (sent) {
      return 0;
    }
    const current = await currentCertifications(ctx, addDays(today, 90));
    if (current.length === 0) {
      return 0;
    }
    const rowsForDigest: CertificationDigestRow[] = await Promise.all(
      current.map(async (row) => ({
        instructor: displayName(await ctx.db.get(row.userId)),
        certification: label(row),
        expiresOn: formatCertificationDate(row.expiresOn),
        daysLeft: daysUntil(row.expiresOn, today),
      }))
    );
    const id = await ctx.db.insert("instructorCertificationDigests", {
      week: today,
      recipient: process.env.REGISTRATION_ADMIN_EMAIL ?? ADMIN_EMAILS[0],
      count: rowsForDigest.length,
      attempts: 0,
      state: "pending",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.instructorCertifications.sendDigest,
      {
        id,
        rows: rowsForDigest.sort((a, b) => a.daysLeft - b.daysLeft),
      }
    );
    return rowsForDigest.length;
  },
});

export const digestRecipient = internalQuery({
  args: { id: v.id("instructorCertificationDigests") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id }) => {
    const digest = await ctx.db.get(id);
    return digest?.state === "pending" ? digest.recipient : null;
  },
});

/** A failed send is retried hourly with identical content, up to MAX_ATTEMPTS. */
export const recordDigest = internalMutation({
  args: {
    id: v.id("instructorCertificationDigests"),
    rows: v.array(digestRow),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, rows: digest, error }) => {
    const row = await ctx.db.get(id);
    if (!row) {
      return null;
    }
    const attempts = row.attempts + 1;
    if (!error) {
      await ctx.db.patch(id, { attempts, state: "sent", sentAt: Date.now() });
      return null;
    }
    if (attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(id, { attempts, state: "failed", error });
      return null;
    }
    await ctx.db.patch(id, { attempts, error });
    await ctx.scheduler.runAfter(
      DIGEST_RETRY_MS,
      internal.instructorCertifications.sendDigest,
      { id, rows: digest }
    );
    return null;
  },
});

export const sendDigest = internalAction({
  args: {
    id: v.id("instructorCertificationDigests"),
    rows: v.array(digestRow),
  },
  returns: v.null(),
  handler: async (ctx, { id, rows: digest }) => {
    const recipient = await ctx.runQuery(
      internal.instructorCertifications.digestRecipient,
      { id }
    );
    if (!recipient) {
      return null;
    }
    try {
      const reportUrl = `${siteOrigin()}/admin/certifications`;
      await deliver({
        to: recipient,
        subject: certificationDigestSubject(digest),
        html: renderEmailHtml(
          createElement(CertificationDigestEmail, { rows: digest, reportUrl })
        ),
        text: [
          "Instructor certifications to renew, soonest first:",
          ...digest.map(
            (row) =>
              `- ${row.instructor}: ${row.certification}, ${row.daysLeft < 0 ? "expired" : "expires"} ${row.expiresOn}`
          ),
          `Full report: ${reportUrl}`,
        ].join("\n"),
        idempotencyKey: `certification-digest:${id}`,
      });
      await ctx.runMutation(internal.instructorCertifications.recordDigest, {
        id,
        rows: digest,
      });
    } catch (error) {
      await ctx.runMutation(internal.instructorCertifications.recordDigest, {
        id,
        rows: digest,
        error: error instanceof Error ? error.message : "Email failed",
      });
    }
    return null;
  },
});
