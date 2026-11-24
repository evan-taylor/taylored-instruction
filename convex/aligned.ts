import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import { completion } from "../shared/registration/domain";
import type { outcome } from "../shared/registration/validators";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { attendanceStatus } from "./alignedSchema";

const MAX_STUDENTS = 200;
const MAX_INSTRUCTOR_NAMES = 10;
const LIST_LIMIT = 200;
const MAX_TEXT = 200;
const MAX_EMAIL = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

type Outcome = Infer<typeof outcome>;

export function displayName(user: Doc<"users"> | null) {
  return (
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Unknown"
  );
}

async function verified(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (!(userId && user?.email) || user.emailVerificationTime === undefined) {
    throw new ConvexError("Verified sign-in required");
  }
  return { userId, user, admin: isAdminEmail(user.email) };
}

async function requireAdmin(ctx: QueryCtx) {
  const me = await verified(ctx);
  if (!me.admin) {
    throw new ConvexError("Forbidden: Admin access required");
  }
  return me.userId;
}

/** The caller's active alignment grant, or null. */
export async function activeAlignment(ctx: QueryCtx, userId: Id<"users">) {
  const row = await ctx.db
    .query("alignedInstructors")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!row || row.revokedAt !== undefined) {
    return null;
  }
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return profile?.deactivatedAt ? null : row;
}

async function requireAligned(ctx: QueryCtx) {
  const me = await verified(ctx);
  const alignment = await activeAlignment(ctx, me.userId);
  if (!alignment) {
    throw new ConvexError("Active aligned instructor access required");
  }
  return { userId: me.userId, alignment };
}

/**
 * Admins oversee every independent session. Aligned instructors reach only the
 * sessions they own, and an unknown or foreign id looks the same to them.
 */
async function sessionAccess(
  ctx: QueryCtx,
  sessionId: Id<"independentSessions">
) {
  const me = await verified(ctx);
  const session = await ctx.db.get(sessionId);
  if (me.admin && session) {
    return { actor: me.userId, session, admin: true };
  }
  const alignment = me.admin ? null : await activeAlignment(ctx, me.userId);
  if (!(alignment && session) || session.instructorId !== me.userId) {
    throw new ConvexError("Session not found");
  }
  return { actor: me.userId, session, admin: false };
}

async function studentAccess(
  ctx: QueryCtx,
  studentId: Id<"independentStudents">
) {
  const student = await ctx.db.get(studentId);
  if (!student) {
    throw new ConvexError("Student not found");
  }
  const access = await sessionAccess(ctx, student.sessionId);
  return { ...access, student };
}

function editable(session: Doc<"independentSessions">) {
  if (session.state === "canceled") {
    throw new ConvexError("Restore the session before changing its roster");
  }
}

async function log(
  ctx: MutationCtx,
  session: Doc<"independentSessions">,
  actor: Id<"users">,
  action: string,
  detail: string
) {
  await ctx.db.insert("independentActivity", {
    sessionId: session._id,
    instructorId: session.instructorId,
    actor,
    action,
    detail,
    at: Date.now(),
  });
}

function text(value: string, label: string, required = true) {
  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new ConvexError(`${label} is required`);
  }
  if (trimmed.length > MAX_TEXT) {
    throw new ConvexError(`${label} is too long`);
  }
  return trimmed;
}

function validEmail(value: string) {
  const address = value.trim().toLowerCase();
  if (address.length > MAX_EMAIL || !EMAIL.test(address)) {
    throw new ConvexError(
      `Enter a valid email address for ${value || "each student"}`
    );
  }
  return address;
}

function knownTimeZone(timeZone: string) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions()
        .timeZone === timeZone
    );
  } catch {
    return false;
  }
}

function validTimeZone(timeZone: string) {
  if (!knownTimeZone(timeZone)) {
    throw new ConvexError("Unknown time zone");
  }
  return timeZone;
}

/** Scheduled, non-archived courses: the ones our Training Site teaches. */
async function teachableCourse(
  ctx: QueryCtx,
  courseId: Id<"registrationCourses">
) {
  const course = await ctx.db.get(courseId);
  if (course?.delivery !== "scheduled" || course.publication === "archived") {
    throw new ConvexError("Course not available for independent sessions");
  }
  return course;
}

/** Certificate-upload outcomes need registration materials, so they are left out. */
function recordableOutcomes(course: Doc<"registrationCourses">): Outcome[] {
  return course.settings.outcomes.filter((o) => !o.certificateRequired);
}

function studentCompletion(
  session: Doc<"independentSessions">,
  student: Doc<"independentStudents">
) {
  return completion(session.outcomeDefinitions, student.outcomes);
}

/** Whether independent sessions or alignment grants still use this course. */
export async function courseInUse(
  ctx: QueryCtx,
  courseId: Id<"registrationCourses">
) {
  const session = await ctx.db
    .query("independentSessions")
    .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
    .first();
  if (session) {
    return true;
  }
  const grants = await ctx.db.query("alignedInstructors").collect();
  return grants.some((grant) => grant.courseIds.includes(courseId));
}

/* ---------------------------- Staff: grants ---------------------------- */

export const courseOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const courses = await ctx.db.query("registrationCourses").collect();
    return courses
      .filter((c) => c.delivery === "scheduled" && c.publication !== "archived")
      .map((c) => ({ id: c._id, title: c.title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const instructors = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("alignedInstructors").collect();
    return await Promise.all(
      rows.map(async (row) => {
        const [user, courses, sessions] = await Promise.all([
          ctx.db.get(row.userId),
          Promise.all(row.courseIds.map((id) => ctx.db.get(id))),
          ctx.db
            .query("independentSessions")
            .withIndex("by_instructorId_and_start", (q) =>
              q.eq("instructorId", row.userId)
            )
            .take(LIST_LIMIT),
        ]);
        return {
          userId: row.userId,
          email: row.email,
          name: displayName(user),
          courses: courses
            .filter((c) => c !== null)
            .map((c) => ({ id: c._id, title: c.title })),
          grantedAt: row.grantedAt,
          revokedAt: row.revokedAt,
          sessionCount: sessions.length,
        };
      })
    );
  },
});

export async function validCourseIds(
  ctx: QueryCtx,
  courseIds: Id<"registrationCourses">[]
) {
  const unique = [...new Set(courseIds)];
  if (!unique.length) {
    throw new ConvexError("Choose at least one course");
  }
  await Promise.all(unique.map((id) => teachableCourse(ctx, id)));
  return unique;
}

export const updateCourses = mutation({
  args: {
    userId: v.id("users"),
    courseIds: v.array(v.id("registrationCourses")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("alignedInstructors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!row) {
      throw new ConvexError("Aligned instructor not found");
    }
    await ctx.db.patch(row._id, {
      courseIds: await validCourseIds(ctx, args.courseIds),
    });
    return null;
  },
});

export const setAccess = mutation({
  args: { userId: v.id("users"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    const row = await ctx.db
      .query("alignedInstructors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!row) {
      throw new ConvexError("Aligned instructor not found");
    }
    await ctx.db.patch(
      row._id,
      args.active
        ? { revokedAt: undefined, revokedBy: undefined }
        : { revokedAt: Date.now(), revokedBy: adminId }
    );
    if (!args.active) {
      const pending = await ctx.db
        .query("instructorInvitations")
        .withIndex("by_email", (q) => q.eq("email", row.email))
        .collect();
      await Promise.all(
        pending
          .filter((i) => i.kind === "aligned" && !(i.acceptedAt || i.revokedAt))
          .map((i) => ctx.db.patch(i._id, { revokedAt: Date.now() }))
      );
    }
    return null;
  },
});

/** Called when an aligned invitation is accepted. */
export async function grantAlignment(
  ctx: MutationCtx,
  invitation: Doc<"instructorInvitations">,
  userId: Id<"users">
) {
  const existing = await ctx.db
    .query("alignedInstructors")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  const courseIds = await validCourseIds(ctx, invitation.courseIds ?? []).catch(
    () => {
      throw new ConvexError(
        "The courses on this invitation are no longer available. Ask us to send an updated invitation."
      );
    }
  );
  const grant = {
    email: invitation.email,
    courseIds,
    grantedBy: invitation.invitedBy,
    grantedAt: Date.now(),
    revokedAt: undefined,
    revokedBy: undefined,
  };
  if (existing) {
    await ctx.db.patch(existing._id, grant);
  } else {
    await ctx.db.insert("alignedInstructors", { userId, ...grant });
  }
}

/* ------------------------- Sessions: listing -------------------------- */

export const portal = query({
  args: {},
  handler: async (ctx) => {
    const { alignment } = await requireAligned(ctx);
    const courses = await Promise.all(
      alignment.courseIds.map((id) => ctx.db.get(id))
    );
    return {
      courses: courses
        .filter(
          (c): c is Doc<"registrationCourses"> =>
            c !== null && c.publication !== "archived"
        )
        .map((c) => ({ id: c._id, title: c.title })),
    };
  },
});

export const mySessions = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const { userId } = await requireAligned(ctx);
    return await ctx.db
      .query("independentSessions")
      .withIndex("by_instructorId_and_start", (q) =>
        q.eq("instructorId", userId)
      )
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const allSessions = query({
  args: {
    instructorId: v.optional(v.id("users")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { instructorId, paginationOpts }) => {
    await requireAdmin(ctx);
    const result = instructorId
      ? await ctx.db
          .query("independentSessions")
          .withIndex("by_instructorId_and_start", (q) =>
            q.eq("instructorId", instructorId)
          )
          .order("desc")
          .paginate(paginationOpts)
      : await ctx.db
          .query("independentSessions")
          .withIndex("by_start")
          .order("desc")
          .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (session) => {
          const owner = await ctx.db.get(session.instructorId);
          return {
            ...session,
            owner: { name: displayName(owner), email: owner?.email ?? "" },
          };
        })
      ),
    };
  },
});

export const sessionDetail = query({
  args: { sessionId: v.id("independentSessions") },
  handler: async (ctx, { sessionId }) => {
    const { session: row, admin } = await sessionAccess(ctx, sessionId);
    const students = await ctx.db
      .query("independentStudents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .take(MAX_STUDENTS);
    const owner = admin ? await ctx.db.get(row.instructorId) : null;
    return {
      session: row,
      owner: owner
        ? { name: displayName(owner), email: owner.email ?? "" }
        : null,
      students: students
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          )
        )
        .map((student) => ({
          ...student,
          completion: studentCompletion(row, student),
        })),
    };
  },
});

export const sessionActivity = query({
  args: {
    sessionId: v.id("independentSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { sessionId, paginationOpts }) => {
    await sessionAccess(ctx, sessionId);
    const result = await ctx.db
      .query("independentActivity")
      .withIndex("by_sessionId_and_at", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .paginate(paginationOpts);
    const rows = result.page;
    const actors = new Map(
      await Promise.all(
        [...new Set(rows.map((r) => r.actor))].map(
          async (id) => [id, displayName(await ctx.db.get(id))] as const
        )
      )
    );
    return {
      ...result,
      page: rows.map((r) => ({
        _id: r._id,
        action: r.action,
        detail: r.detail,
        at: r.at,
        actor: actors.get(r.actor) ?? "Unknown",
      })),
    };
  },
});

/* ------------------------ Sessions: changes --------------------------- */

const sessionInput = {
  courseId: v.id("registrationCourses"),
  start: v.number(),
  end: v.number(),
  timeZone: v.string(),
  location: v.string(),
  instructorNames: v.array(v.string()),
};

async function sessionFields(
  ctx: QueryCtx,
  owner: Id<"users">,
  alignment: Doc<"alignedInstructors"> | null,
  current: Doc<"independentSessions"> | null,
  input: {
    courseId: Id<"registrationCourses">;
    start: number;
    end: number;
    timeZone: string;
    location: string;
    instructorNames: string[];
  }
) {
  const course =
    current?.courseId === input.courseId
      ? await ctx.db.get(input.courseId)
      : await newCourse(ctx, alignment, input.courseId);
  if (!course) {
    throw new ConvexError("Course not found");
  }
  if (
    !(Number.isFinite(input.start) && Number.isFinite(input.end)) ||
    input.end <= input.start
  ) {
    throw new ConvexError("End time must be after the start time");
  }
  const names = input.instructorNames
    .map((name) => text(name, "Instructor name", false))
    .filter(Boolean);
  if (names.length > MAX_INSTRUCTOR_NAMES) {
    throw new ConvexError(`List up to ${MAX_INSTRUCTOR_NAMES} instructors`);
  }
  return {
    course,
    fields: {
      courseId: course._id,
      title: course.title,
      start: input.start,
      end: input.end,
      timeZone: validTimeZone(input.timeZone),
      location: text(input.location, "Location"),
      instructorNames: names.length
        ? names
        : [displayName(await ctx.db.get(owner))],
      updatedAt: Date.now(),
    },
  };
}

/** Archived courses stay on existing sessions; only new choices must be teachable. */
async function newCourse(
  ctx: QueryCtx,
  alignment: Doc<"alignedInstructors"> | null,
  courseId: Id<"registrationCourses">
) {
  if (alignment && !alignment.courseIds.includes(courseId)) {
    throw new ConvexError("You are not aligned to teach this course");
  }
  return await teachableCourse(ctx, courseId);
}

export const createSession = mutation({
  args: sessionInput,
  returns: v.id("independentSessions"),
  handler: async (ctx, args) => {
    const { userId, alignment } = await requireAligned(ctx);
    const { course, fields } = await sessionFields(
      ctx,
      userId,
      alignment,
      null,
      args
    );
    const id = await ctx.db.insert("independentSessions", {
      ...fields,
      instructorId: userId,
      outcomeDefinitions: recordableOutcomes(course),
      state: "scheduled",
      studentCount: 0,
    });
    const created = await ctx.db.get(id);
    if (created) {
      await log(ctx, created, userId, "session-created", describe(created));
    }
    return id;
  },
});

function describe(session: Doc<"independentSessions">) {
  return JSON.stringify({
    course: session.title,
    start: session.start,
    end: session.end,
    timeZone: session.timeZone,
    location: session.location,
    instructors: session.instructorNames,
  });
}

export const updateSession = mutation({
  args: { sessionId: v.id("independentSessions"), ...sessionInput },
  returns: v.null(),
  handler: async (ctx, { sessionId, ...input }) => {
    const { actor, session: row, admin } = await sessionAccess(ctx, sessionId);
    editable(row);
    const alignment = admin
      ? null
      : await activeAlignment(ctx, row.instructorId);
    const { course, fields } = await sessionFields(
      ctx,
      row.instructorId,
      alignment,
      row,
      input
    );
    if (course._id === row.courseId) {
      await ctx.db.patch(sessionId, fields);
    } else {
      await ctx.db.patch(sessionId, {
        ...fields,
        outcomeDefinitions: recordableOutcomes(course),
      });
      await clearResults(ctx, row, actor);
    }
    const updated = await ctx.db.get(sessionId);
    if (updated) {
      await log(ctx, updated, actor, "session-edited", describe(updated));
    }
    return null;
  },
});

/** Results belong to the course they were recorded under, so a course change clears them. */
async function clearResults(
  ctx: MutationCtx,
  session: Doc<"independentSessions">,
  actor: Id<"users">
) {
  const students = await ctx.db
    .query("independentStudents")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
    .take(MAX_STUDENTS);
  const graded = students.filter((student) => student.outcomes.length);
  if (!graded.length) {
    return;
  }
  await Promise.all(
    graded.map((student) => ctx.db.patch(student._id, { outcomes: [] }))
  );
  await log(
    ctx,
    session,
    actor,
    "results-cleared",
    `Course changed from ${session.title}: ${graded.map((s) => s.email).join(", ")}`
  );
}

export const setCanceled = mutation({
  args: { sessionId: v.id("independentSessions"), canceled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { sessionId, canceled }) => {
    const { actor, session: row } = await sessionAccess(ctx, sessionId);
    const state = canceled ? "canceled" : "scheduled";
    if (row.state === state) {
      return null;
    }
    await ctx.db.patch(sessionId, { state, updatedAt: Date.now() });
    await log(
      ctx,
      row,
      actor,
      canceled ? "session-canceled" : "session-restored",
      ""
    );
    return null;
  },
});

/* ------------------------------ Roster -------------------------------- */

const studentInput = v.object({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
});

export const addStudents = mutation({
  args: {
    sessionId: v.id("independentSessions"),
    students: v.array(studentInput),
  },
  returns: v.number(),
  handler: async (ctx, { sessionId, students }) => {
    const { actor, session: row } = await sessionAccess(ctx, sessionId);
    editable(row);
    if (!students.length) {
      throw new ConvexError("Add at least one student");
    }
    const existing = await ctx.db
      .query("independentStudents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .take(MAX_STUDENTS);
    if (existing.length + students.length > MAX_STUDENTS) {
      throw new ConvexError(`A session holds up to ${MAX_STUDENTS} students`);
    }
    const taken = new Set(existing.map((s) => s.email));
    const rows = students.map((input) => {
      const address = validEmail(input.email);
      if (taken.has(address)) {
        throw new ConvexError(`${address} is already on this roster`);
      }
      taken.add(address);
      return {
        firstName: text(input.firstName, "First name"),
        lastName: text(input.lastName, "Last name"),
        email: address,
        phone: text(input.phone ?? "", "Phone", false),
      };
    });
    await Promise.all(
      rows.map((student) =>
        ctx.db.insert("independentStudents", {
          ...student,
          sessionId,
          instructorId: row.instructorId,
          attendance: "not-recorded",
          outcomes: [],
          evaluation: "",
          reason: "",
          additionalInformation: "",
        })
      )
    );
    await ctx.db.patch(sessionId, {
      studentCount: existing.length + rows.length,
    });
    await log(
      ctx,
      row,
      actor,
      "students-added",
      rows.map((s) => `${s.firstName} ${s.lastName} <${s.email}>`).join(", ")
    );
    return rows.length;
  },
});

export const updateStudent = mutation({
  args: {
    studentId: v.id("independentStudents"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    evaluation: v.string(),
    reason: v.string(),
    additionalInformation: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { studentId, ...input }) => {
    const {
      actor,
      session: row,
      student,
    } = await studentAccess(ctx, studentId);
    editable(row);
    const next = {
      firstName: text(input.firstName, "First name"),
      lastName: text(input.lastName, "Last name"),
      email: validEmail(input.email),
      phone: text(input.phone, "Phone", false),
      evaluation: text(input.evaluation, "Evaluation", false),
      reason: text(input.reason, "Reason", false),
      additionalInformation: text(
        input.additionalInformation,
        "Additional information",
        false
      ),
    };
    if (next.email !== student.email) {
      const clash = await ctx.db
        .query("independentStudents")
        .withIndex("by_sessionId_and_email", (q) =>
          q.eq("sessionId", row._id).eq("email", next.email)
        )
        .first();
      if (clash) {
        throw new ConvexError(`${next.email} is already on this roster`);
      }
    }
    const changed = Object.fromEntries(
      Object.entries(next).filter(
        ([key, value]) => student[key as keyof typeof next] !== value
      )
    );
    if (!Object.keys(changed).length) {
      return null;
    }
    await ctx.db.patch(studentId, next);
    await log(
      ctx,
      row,
      actor,
      "student-edited",
      JSON.stringify({ student: student.email, changed })
    );
    return null;
  },
});

export const removeStudent = mutation({
  args: { studentId: v.id("independentStudents") },
  returns: v.null(),
  handler: async (ctx, { studentId }) => {
    const {
      actor,
      session: row,
      student,
    } = await studentAccess(ctx, studentId);
    editable(row);
    await ctx.db.delete(studentId);
    await ctx.db.patch(row._id, {
      studentCount: Math.max(0, row.studentCount - 1),
    });
    await log(
      ctx,
      row,
      actor,
      "student-removed",
      `${student.firstName} ${student.lastName} <${student.email}>`
    );
    return null;
  },
});

export const setAttendance = mutation({
  args: {
    sessionId: v.id("independentSessions"),
    studentIds: v.array(v.id("independentStudents")),
    status: attendanceStatus,
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, studentIds, status }) => {
    const { actor, session: row } = await sessionAccess(ctx, sessionId);
    editable(row);
    const unique = [...new Set(studentIds)];
    if (!unique.length || unique.length > MAX_STUDENTS) {
      throw new ConvexError("Choose students to mark");
    }
    const students = await Promise.all(unique.map((id) => ctx.db.get(id)));
    const changed = students.filter((student) => {
      if (student?.sessionId !== sessionId) {
        throw new ConvexError("Student not found");
      }
      return student.attendance !== status;
    });
    await Promise.all(
      changed.map((student) =>
        student ? ctx.db.patch(student._id, { attendance: status }) : null
      )
    );
    if (changed.length) {
      await log(
        ctx,
        row,
        actor,
        "attendance",
        `${status}: ${changed.map((s) => s?.email).join(", ")}`
      );
    }
    return null;
  },
});

export const recordOutcome = mutation({
  args: {
    studentId: v.id("independentStudents"),
    fieldId: v.string(),
    value: v.union(v.string(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { studentId, fieldId, value }) => {
    const {
      actor,
      session: row,
      student,
    } = await studentAccess(ctx, studentId);
    editable(row);
    const definition = row.outcomeDefinitions.find((d) => d.id === fieldId);
    if (
      !definition ||
      (definition.type === "percentage"
        ? typeof value !== "number" || value < 0 || value > 100
        : typeof value !== "string" || !definition.options.includes(value))
    ) {
      throw new ConvexError("Invalid outcome value");
    }
    const previous = student.outcomes.find(
      (o) => o.fieldId === fieldId && o.version === definition.version
    );
    await ctx.db.patch(studentId, {
      outcomes: [
        ...student.outcomes.filter((o) => o.fieldId !== fieldId),
        { fieldId, version: definition.version, value },
      ],
    });
    await log(
      ctx,
      row,
      actor,
      "outcome-edited",
      JSON.stringify({
        student: student.email,
        field: definition.title,
        previous: previous?.value ?? null,
        value,
      })
    );
    return null;
  },
});
