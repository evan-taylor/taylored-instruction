import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { doc } from "convex-helpers/validators";
import {
  addDays,
  businessDate,
  certificateCourseTitle,
  certificateTypeKey,
  REMINDER_STAGES,
  type RosterAttendee,
  reminderStage,
} from "../shared/registration/student-certificates";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { independentRoster, independentStudentIdFrom } from "./aligned";
import { preferenceToken, unsubscribed } from "./emailPreferences";
import { audit, enqueue, portalEmail, staff } from "./registrationHelpers";
import schema from "./schema";
import {
  certificateAgency,
  certificateTarget,
} from "./studentCertificateSchema";

const ROSTER_LIMIT = 500;
const REMINDER_PAGE = 100;
/** Classes that ended longer ago than this are usually a backfill, not news. */
const POST_CLASS_EMAIL_DAYS = 30;

type Target = Infer<typeof certificateTarget>;

const certificateRow = v.object({
  ...doc(schema, "studentCertificates").fields,
  sessionTitle: v.optional(v.string()),
});

async function targetContext(ctx: QueryCtx, target: Target) {
  if (target.kind === "independent") {
    const { actor, session, roster, admin } = await independentRoster(
      ctx,
      target.id
    );
    return {
      actor,
      admin,
      roster,
      title: session.title,
      endedAt: session.end,
      emails: false,
    };
  }
  const { userId, admin } = await staff(ctx, target.id);
  const session = await ctx.db.get(target.id);
  if (!session) {
    throw new ConvexError("Session not found");
  }
  const seats = await ctx.db
    .query("registrationSeats")
    .withIndex("by_sessionId_and_state", (q) =>
      q.eq("sessionId", target.id).eq("state", "active")
    )
    .take(ROSTER_LIMIT);
  const roster: RosterAttendee[] = seats.map((seat) => ({
    id: seat._id,
    name: seat.name,
    firstName: seat.snapshot.attendee.firstName,
    lastName: seat.snapshot.attendee.lastName,
    email: seat.email,
  }));
  return {
    actor: userId,
    admin,
    roster,
    title: session.title,
    endedAt: session.lastEnd,
    emails: session.state !== "canceled",
  };
}

/** What the upload preview needs beyond the file: the roster and prior saves. */
export const importContext = internalQuery({
  args: {
    target: certificateTarget,
    agency: certificateAgency,
    certificateIds: v.array(v.string()),
  },
  returns: v.object({
    roster: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
      })
    ),
    saved: v.array(v.string()),
    title: v.string(),
    emails: v.boolean(),
    recentClass: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const context = await targetContext(ctx, args.target);
    const existing = await Promise.all(
      args.certificateIds.map((certificateId) =>
        ctx.db
          .query("studentCertificates")
          .withIndex("by_agency_and_certificateId", (q) =>
            q.eq("agency", args.agency).eq("certificateId", certificateId)
          )
          .unique()
      )
    );
    return {
      roster: context.roster,
      saved: existing.flatMap((row) => (row ? [row.certificateId] : [])),
      title: context.title,
      emails: context.emails,
      recentClass:
        context.endedAt > Date.now() - POST_CLASS_EMAIL_DAYS * 86_400_000,
    };
  },
});

/** The caller's own pending upload for this target, or null. */
async function pendingUpload(
  ctx: QueryCtx,
  target: Target,
  actor: Id<"users">,
  storageId: Id<"_storage">
) {
  const upload = await ctx.db
    .query("certificateUploads")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();
  const sameTarget =
    target.kind === "session"
      ? upload?.sessionId === target.id
      : upload?.independentSessionId === target.id;
  return upload?.uploadedBy === actor && sameTarget ? upload : null;
}

/** Checks the caller can import into the target, and owns the upload if named. */
export const checkAccess = internalQuery({
  args: {
    target: certificateTarget,
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const { actor } = await targetContext(ctx, args.target);
    if (
      args.storageId &&
      !(await pendingUpload(ctx, args.target, actor, args.storageId))
    ) {
      throw new ConvexError("The upload expired. Choose the file again.");
    }
    return actor;
  },
});

export const recordUpload = internalMutation({
  args: {
    target: certificateTarget,
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("certificateUploads", {
      storageId: args.storageId,
      uploadedBy: args.uploadedBy,
      ...(args.target.kind === "session"
        ? { sessionId: args.target.id }
        : { independentSessionId: args.target.id }),
      uploadedAt: Date.now(),
    });
    return null;
  },
});

/** Deletes the caller's own upload when they cancel it or it cannot be read. */
export const discardUpload = mutation({
  args: { target: certificateTarget, storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await targetContext(ctx, args.target);
    const upload = await pendingUpload(ctx, args.target, actor, args.storageId);
    if (upload) {
      await ctx.storage.delete(upload.storageId);
      await ctx.db.delete(upload._id);
    }
    return null;
  },
});

/** Deletes uploads nobody saved or canceled within a day. */
export const sweepUploads = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("certificateUploads")
      .withIndex("by_uploadedAt", (q) =>
        q.lt("uploadedAt", Date.now() - 86_400_000)
      )
      .take(REMINDER_PAGE);
    await Promise.all(
      stale.map(async (upload) => {
        await ctx.storage.delete(upload.storageId);
        await ctx.db.delete(upload._id);
      })
    );
    return null;
  },
});

const savedRow = v.object({
  row: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  certificateId: v.string(),
  status: v.string(),
  course: v.string(),
  issuedOn: v.string(),
  expiresOn: v.string(),
  instructor: v.optional(v.string()),
  instructorId: v.optional(v.string()),
  /** Roster attendee id, or absent to keep the certificate on the email alone. */
  attendeeId: v.optional(v.string()),
});

type SavedRow = Infer<typeof savedRow>;

async function newerCertificate(
  ctx: QueryCtx,
  certificate: Doc<"studentCertificates">
) {
  if (!certificate.email) {
    return null;
  }
  return await ctx.db
    .query("studentCertificates")
    .withIndex("by_email_and_typeKey_and_issuedOn", (q) =>
      q
        .eq("email", certificate.email)
        .eq("typeKey", certificate.typeKey)
        .gt("issuedOn", certificate.issuedOn)
    )
    .first();
}

/**
 * A renewal stops reminders for every earlier certificate of its type. The
 * whole email and type group is recomputed, so corrected dates or addresses
 * repair links instead of piling up.
 */
async function relinkRenewals(
  ctx: MutationCtx,
  email: string,
  typeKey: string
) {
  if (!email) {
    return;
  }
  const group = await ctx.db
    .query("studentCertificates")
    .withIndex("by_email_and_typeKey_and_issuedOn", (q) =>
      q.eq("email", email).eq("typeKey", typeKey)
    )
    .order("desc")
    .take(50);
  const [newest] = group;
  await Promise.all(
    group.map((row) => {
      const supersededBy =
        newest && row.issuedOn < newest.issuedOn ? newest._id : undefined;
      return row.supersededBy === supersededBy
        ? null
        : ctx.db.patch(row._id, { supersededBy });
    })
  );
}

/** Every link field is set, so a re-upload clears links that no longer apply. */
function links(ctx: QueryCtx, target: Target, attendeeId: string | undefined) {
  if (target.kind === "session") {
    const seatId = attendeeId
      ? (ctx.db.normalizeId("registrationSeats", attendeeId) ?? undefined)
      : undefined;
    return {
      sessionId: target.id,
      seatId,
      independentSessionId: undefined,
      independentStudentId: undefined,
    };
  }
  return {
    sessionId: undefined,
    seatId: undefined,
    independentSessionId: target.id,
    independentStudentId: attendeeId
      ? (independentStudentIdFrom(ctx, attendeeId) ?? undefined)
      : undefined,
  };
}

function ownedBy(certificate: Doc<"studentCertificates">, target: Target) {
  return target.kind === "session"
    ? certificate.sessionId === target.id
    : certificate.independentSessionId === target.id;
}

async function upsertCertificate(
  ctx: MutationCtx,
  target: Target,
  row: SavedRow,
  shared: {
    agency: "aha" | "arc";
    importId: Id<"certificateImports">;
    trainingSite?: string;
    location?: string;
    roster: Map<string, RosterAttendee>;
    admin: boolean;
  }
) {
  const attendee = row.attendeeId ? shared.roster.get(row.attendeeId) : null;
  if (attendee === undefined) {
    throw new ConvexError("A matched attendee is not on this session’s roster");
  }
  const existing = await ctx.db
    .query("studentCertificates")
    .withIndex("by_agency_and_certificateId", (q) =>
      q.eq("agency", shared.agency).eq("certificateId", row.certificateId)
    )
    .unique();
  if (existing && !ownedBy(existing, target) && !shared.admin) {
    throw new ConvexError(
      `Certificate ${row.certificateId} is already saved on another class. Ask an admin to move it.`
    );
  }
  const now = Date.now();
  const fields = {
    agency: shared.agency,
    course: row.course,
    typeKey: certificateTypeKey(shared.agency, row.course),
    certificateId: row.certificateId,
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    email: (row.email.trim() || attendee?.email || "").toLowerCase(),
    instructor: row.instructor,
    instructorId: row.instructorId,
    trainingSite: shared.trainingSite,
    location: shared.location,
    ...links(ctx, target, row.attendeeId),
    importId: shared.importId,
    sourceRow: row.row,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return {
      id: existing._id,
      created: false,
      previous: { email: existing.email, typeKey: existing.typeKey },
    };
  }
  const id = await ctx.db.insert("studentCertificates", {
    ...fields,
    createdAt: now,
  });
  return { id, created: true, previous: null };
}

async function rememberType(
  ctx: MutationCtx,
  agency: "aha" | "arc",
  course: string
) {
  const typeKey = certificateTypeKey(agency, course);
  const known = await ctx.db
    .query("certificateTypes")
    .withIndex("by_typeKey", (q) => q.eq("typeKey", typeKey))
    .unique();
  if (!known) {
    await ctx.db.insert("certificateTypes", {
      typeKey,
      agency,
      course: certificateCourseTitle(course),
    });
  }
}

async function findOrCreateImport(
  ctx: MutationCtx,
  target: Target,
  actor: Id<"users">,
  args: Infer<typeof saveArgs>
) {
  const sameFile = await ctx.db
    .query("certificateImports")
    .withIndex("by_sha256", (q) => q.eq("sha256", args.file.sha256))
    .take(20);
  const previous = sameFile.find((row) =>
    target.kind === "session"
      ? row.sessionId === target.id
      : row.independentSessionId === target.id
  );
  if (previous) {
    if (previous.storageId !== args.file.storageId) {
      await ctx.storage.delete(args.file.storageId);
    }
    return previous._id;
  }
  return await ctx.db.insert("certificateImports", {
    ...args.file,
    agency: args.agency,
    course: args.course,
    ...(target.kind === "session"
      ? { sessionId: target.id }
      : { independentSessionId: target.id }),
    uploadedBy: actor,
    uploadedAt: Date.now(),
    certificates: args.rows.length,
    postClassEmail: postClassEmailChoice(target, args.postClassEmail),
  });
}

function postClassEmailChoice(target: Target, send: boolean) {
  if (target.kind !== "session") {
    return "not-applicable" as const;
  }
  return send ? ("send" as const) : ("skip" as const);
}

const saveArgs = v.object({
  target: certificateTarget,
  agency: certificateAgency,
  course: v.string(),
  trainingSite: v.optional(v.string()),
  location: v.optional(v.string()),
  file: v.object({
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    sha256: v.string(),
  }),
  rows: v.array(savedRow),
  postClassEmail: v.boolean(),
});

/**
 * Saves the confirmed rows of one uploaded file. Re-running with the same file
 * or the same certificates updates in place: the import is keyed by content
 * hash per session and each certificate by agency and certificate ID.
 */
export const saveImport = internalMutation({
  args: saveArgs.fields,
  returns: v.object({
    created: v.number(),
    updated: v.number(),
    emails: v.number(),
  }),
  handler: async (ctx, args) => {
    const context = await targetContext(ctx, args.target);
    const pending = await pendingUpload(
      ctx,
      args.target,
      context.actor,
      args.file.storageId
    );
    if (pending) {
      await ctx.db.delete(pending._id);
    }
    const importId = await findOrCreateImport(
      ctx,
      args.target,
      context.actor,
      args
    );
    const roster = new Map(
      context.roster.map((attendee) => [attendee.id, attendee])
    );
    const saved = await Promise.all(
      args.rows.map((row) =>
        upsertCertificate(ctx, args.target, row, {
          agency: args.agency,
          importId,
          trainingSite: args.trainingSite,
          location: args.location,
          roster,
          admin: context.admin,
        })
      )
    );
    const certificates = (
      await Promise.all(saved.map(({ id }) => ctx.db.get(id)))
    ).filter((row) => row !== null);
    const groups = new Map(
      [
        ...certificates.map(({ email, typeKey }) => ({ email, typeKey })),
        ...saved.flatMap(({ previous }) => (previous ? [previous] : [])),
      ].map((group) => [`${group.email}\n${group.typeKey}`, group])
    );
    await Promise.all(
      [...groups.values()].map(({ email, typeKey }) =>
        relinkRenewals(ctx, email, typeKey)
      )
    );
    await Promise.all(
      [...new Set(args.rows.map((row) => row.course))].map((course) =>
        rememberType(ctx, args.agency, course)
      )
    );
    const created = new Set(saved.filter((s) => s.created).map((s) => s.id));
    const mailable = certificates.filter(
      (certificate) =>
        created.has(certificate._id) && certificate.email && certificate.seatId
    );
    const send =
      args.postClassEmail && args.target.kind === "session" && context.emails;
    if (send) {
      await Promise.all(
        mailable.map((certificate) =>
          enqueue(ctx, {
            key: `certificate:${certificate._id}`,
            kind: "email",
            recipient: certificate.email,
            subject: `Your ${certificateCourseTitle(certificate.course)} certificate is ready`,
            body: "",
            due: Date.now(),
            seatId: certificate.seatId,
            sessionId: certificate.sessionId,
          })
        )
      );
    }
    await audit(
      ctx,
      context.actor,
      "certificates-imported",
      args.target.id,
      `${args.file.fileName}: ${created.size} new, ${saved.length - created.size} updated${send ? `, ${mailable.length} emails` : ""}`
    );
    return {
      created: created.size,
      updated: saved.length - created.size,
      emails: send ? mailable.length : 0,
    };
  },
});

async function withSessionTitles(
  ctx: QueryCtx,
  rows: Doc<"studentCertificates">[]
) {
  const ids = [
    ...new Set(
      rows.flatMap((row) => {
        const id = row.sessionId ?? row.independentSessionId;
        return id ? [id] : [];
      })
    ),
  ];
  const sessions = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const titles = new Map(
    ids.map((id, index) => [id as string, sessions[index]?.title])
  );
  return rows.map((row) => {
    const id = row.sessionId ?? row.independentSessionId;
    return { ...row, sessionTitle: id ? titles.get(id) : undefined };
  });
}

/** Certificates saved for one session, newest row first. */
export const forTarget = query({
  args: { target: certificateTarget, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(certificateRow),
  handler: async (ctx, args) => {
    await targetContext(ctx, args.target);
    const { target } = args;
    const result =
      target.kind === "session"
        ? await ctx.db
            .query("studentCertificates")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", target.id))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("studentCertificates")
            .withIndex("by_independentSessionId", (q) =>
              q.eq("independentSessionId", target.id)
            )
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: await withSessionTitles(ctx, result.page) };
  },
});

/** Uploaded agency files for one session, with download links. */
export const imports = query({
  args: { target: certificateTarget },
  returns: v.array(
    v.object({
      _id: v.id("certificateImports"),
      fileName: v.string(),
      agency: certificateAgency,
      uploadedAt: v.number(),
      certificates: v.number(),
      postClassEmail: v.string(),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    await targetContext(ctx, args.target);
    const { target } = args;
    const rows =
      target.kind === "session"
        ? await ctx.db
            .query("certificateImports")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", target.id))
            .order("desc")
            .take(20)
        : await ctx.db
            .query("certificateImports")
            .withIndex("by_independentSessionId", (q) =>
              q.eq("independentSessionId", target.id)
            )
            .order("desc")
            .take(20);
    return await Promise.all(
      rows.map(async (row) => ({
        _id: row._id,
        fileName: row.fileName,
        agency: row.agency,
        uploadedAt: row.uploadedAt,
        certificates: row.certificates,
        postClassEmail: row.postClassEmail,
        url: await ctx.storage.getUrl(row.storageId),
      }))
    );
  },
});

/** The signed-in student's own certificates, newest first. */
export const mine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(certificateRow),
  handler: async (ctx, args) => {
    const email = await portalEmail(ctx);
    const result = await ctx.db
      .query("studentCertificates")
      .withIndex("by_email_and_issuedOn", (q) => q.eq("email", email))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await withSessionTitles(ctx, result.page) };
  },
});

/** Staff: one student's certificates by email, newest first. */
export const forStudent = query({
  args: { email: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(certificateRow),
  handler: async (ctx, args) => {
    await staff(ctx);
    const email = args.email.trim().toLowerCase();
    const result = await ctx.db
      .query("studentCertificates")
      .withIndex("by_email_and_issuedOn", (q) => q.eq("email", email))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await withSessionTitles(ctx, result.page) };
  },
});

export const types = query({
  args: {},
  returns: v.array(
    v.object({
      typeKey: v.string(),
      agency: certificateAgency,
      course: v.string(),
    })
  ),
  handler: async (ctx) => {
    await staff(ctx);
    const rows = await ctx.db.query("certificateTypes").take(500);
    return rows
      .map(({ typeKey, agency, course }) => ({ typeKey, agency, course }))
      .sort((a, b) => a.course.localeCompare(b.course));
  },
});

const listFilters = v.object({
  agency: v.optional(certificateAgency),
  typeKey: v.optional(v.string()),
  sessionId: v.optional(v.id("registrationSessions")),
  /** Expiring between today and this many days ahead; negative looks back. */
  expiringWithinDays: v.optional(v.number()),
  includeExpired: v.optional(v.boolean()),
});

function listQuery(
  ctx: QueryCtx,
  filters: Infer<typeof listFilters>,
  today: string
) {
  const table = ctx.db.query("studentCertificates");
  if (filters.sessionId) {
    const { sessionId } = filters;
    return table.withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId));
  }
  const from = filters.includeExpired ? "" : today;
  const window = filters.expiringWithinDays;
  const to = window === undefined ? "9999-12-31" : addDays(today, window);
  if (filters.typeKey) {
    const { typeKey } = filters;
    return table.withIndex("by_typeKey_and_expiresOn", (q) =>
      q.eq("typeKey", typeKey).gte("expiresOn", from).lte("expiresOn", to)
    );
  }
  if (filters.agency) {
    const { agency } = filters;
    return table.withIndex("by_agency_and_expiresOn", (q) =>
      q.eq("agency", agency).gte("expiresOn", from).lte("expiresOn", to)
    );
  }
  return table.withIndex("by_expiresOn", (q) =>
    q.gte("expiresOn", from).lte("expiresOn", to)
  );
}

/**
 * Staff report of certificates, soonest expiry first. Filters narrow through
 * an index where one fits and a server-side filter otherwise, so pages stay full.
 */
export const list = query({
  args: { filters: listFilters, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(certificateRow),
  handler: async (ctx, { filters, paginationOpts }) => {
    await staff(ctx);
    const today = businessDate(Date.now());
    const from = filters.includeExpired ? "" : today;
    const window = filters.expiringWithinDays;
    const to = window === undefined ? "9999-12-31" : addDays(today, window);
    const result = await listQuery(ctx, filters, today)
      .filter((q) =>
        q.and(
          filters.agency ? q.eq(q.field("agency"), filters.agency) : true,
          filters.typeKey ? q.eq(q.field("typeKey"), filters.typeKey) : true,
          q.gte(q.field("expiresOn"), from),
          q.lte(q.field("expiresOn"), to)
        )
      )
      .paginate(paginationOpts);
    return { ...result, page: await withSessionTitles(ctx, result.page) };
  },
});

function reminderKey(id: Id<"studentCertificates">, stage: number) {
  return `certificate-reminder:${id}:${stage}`;
}

/** Why a certificate should not get reminders now, or null when it should. */
export async function reminderBlocked(
  ctx: QueryCtx,
  certificate: Doc<"studentCertificates">
) {
  if (!(certificate.email && certificate.sessionId)) {
    return "not ours";
  }
  if (certificate.supersededBy || (await newerCertificate(ctx, certificate))) {
    return "renewed";
  }
  if (await unsubscribed(ctx, certificate.email)) {
    return "unsubscribed";
  }
  return null;
}

async function queueReminder(
  ctx: MutationCtx,
  certificate: Doc<"studentCertificates">,
  today: string
) {
  const stage = reminderStage(certificate.expiresOn, today);
  if (stage === null || (await reminderBlocked(ctx, certificate))) {
    return false;
  }
  const later = REMINDER_STAGES.filter((s) => s < stage);
  const keys = [stage, ...later].map((s) => reminderKey(certificate._id, s));
  const existing = await Promise.all(
    keys.map((key) =>
      ctx.db
        .query("registrationJobs")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    )
  );
  if (existing.some((row) => row && row.state !== "canceled")) {
    return false;
  }
  await preferenceToken(ctx, certificate.email);
  const title = certificateCourseTitle(certificate.course);
  const reminder = {
    key: reminderKey(certificate._id, stage),
    kind: "email" as const,
    recipient: certificate.email,
    subject:
      stage === 0
        ? `Your ${title} certificate expires today`
        : `Time to renew your ${title} certificate`,
    body: "",
    due: Date.now(),
    seatId: certificate.seatId,
    sessionId: certificate.sessionId,
  };
  const [canceled] = existing;
  if (canceled) {
    await ctx.db.patch(canceled._id, {
      ...reminder,
      state: "pending",
      attempts: 0,
    });
  } else {
    await enqueue(ctx, reminder);
  }
  return true;
}

/**
 * Daily: queues the 60-day, 30-day and expiry-day reminder each certificate is
 * due. Each stage has one job key, so a reminder sends once; the job row is
 * the record. Pages through the window and reschedules itself until done.
 */
export const runReminders = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    today: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const today = args.today ?? businessDate(Date.now());
    const page = await ctx.db
      .query("studentCertificates")
      .withIndex("by_expiresOn", (q) =>
        q
          .gte("expiresOn", addDays(today, -3))
          .lte("expiresOn", addDays(today, 60))
      )
      .paginate({ numItems: REMINDER_PAGE, cursor: args.cursor ?? null });
    let queued = 0;
    for (const certificate of page.page) {
      // biome-ignore lint/performance/noAwaitInLoops: one certificate at a time keeps preference tokens unique
      if (await queueReminder(ctx, certificate, today)) {
        queued += 1;
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.studentCertificates.runReminders,
        {
          cursor: page.continueCursor,
          today,
        }
      );
    }
    return queued;
  },
});
