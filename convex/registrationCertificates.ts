import { getAuthUserId } from "@convex-dev/auth/server";
import type { FunctionReference } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { MAX_CERTIFICATE_BYTES } from "../shared/registration/certificate";
import {
  CERTIFICATE_MAX_AGE_DAYS,
  certificateCourseName,
  checkVerdict,
  decide,
  VERIFICATION_CHECKS,
} from "../shared/registration/certificate-verification";
import { certificateVerification } from "../shared/registration/validators";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { audit, enqueue, portalEmail, staff } from "./registrationHelpers";

/** A verification still running after this long is handed to staff. */
const VERIFICATION_DEADLINE_MS = 15 * 60_000;
const DAY_MS = 86_400_000;

function certificateRequirement(seat: Doc<"registrationSeats">) {
  if (seat.state === "active" && seat.settledAt && seat.sessionId) {
    return seat.outcomeDefinitions.find((rule) => rule.certificateRequired);
  }
}

async function certificateOutcome(
  ctx: QueryCtx,
  seatId: Id<"registrationSeats">,
  rule: Doc<"registrationSeats">["outcomeDefinitions"][number]
) {
  return await ctx.db
    .query("registrationOutcomes")
    .withIndex("by_seatId_and_fieldId_and_version", (q) =>
      q.eq("seatId", seatId).eq("fieldId", rule.id).eq("version", rule.version)
    )
    .order("desc")
    .first();
}

const reviewState = v.union(v.literal("verifying"), v.literal("needs_review"));

export const certificateStatusValidator = v.object({
  title: v.string(),
  uploaded: v.boolean(),
  /** The upload is still being checked, automatically or by staff. */
  review: v.optional(reviewState),
  materialId: v.optional(v.id("registrationMaterials")),
});

function pendingReview(file: Doc<"registrationSessionFiles"> | null) {
  const state = file?.verification?.state;
  return state === "verifying" || state === "needs_review" ? state : undefined;
}

async function currentCertificate(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">
) {
  const rule = certificateRequirement(seat);
  if (!rule) {
    return;
  }
  const outcome = await certificateOutcome(ctx, seat._id, rule);
  const file = outcome?.certificateFileId
    ? await ctx.db.get(outcome.certificateFileId)
    : null;
  return { rule, outcome, file };
}

export async function certificateStatus(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">,
  displayRules = seat.outcomeDefinitions
) {
  const current = await currentCertificate(ctx, seat);
  if (!current) {
    return;
  }
  const { rule, outcome, file } = current;
  const review = pendingReview(file);
  return {
    title: rule.title,
    uploaded: Boolean(outcome?.certificateFileId),
    ...(review ? { review } : {}),
    // Display settings can change after an attendee's grading rules are frozen.
    materialId: displayRules.find(
      (displayRule) =>
        displayRule.id === rule.id && displayRule.certificateRequired
    )?.certificateMaterialId,
  };
}

export const staffCertificateStatusValidator = v.object({
  ...certificateStatusValidator.fields,
  file: v.optional(
    v.object({
      _id: v.id("registrationSessionFiles"),
      name: v.string(),
      url: v.union(v.string(), v.null()),
      uploadedAt: v.number(),
      staffUpload: v.boolean(),
      verification: v.optional(
        v.object({
          state: certificateVerification.fields.state,
          error: certificateVerification.fields.error,
          checks: v.array(
            v.object({
              id: v.string(),
              label: v.string(),
              probability: v.number(),
              verdict: v.union(
                v.literal("passed"),
                v.literal("uncertain"),
                v.literal("failed")
              ),
            })
          ),
        })
      ),
    })
  ),
});

/** Each check's answer, for staff deciding on an upload Jev did not pass. */
function staffVerification(
  verification: Doc<"registrationSessionFiles">["verification"]
) {
  if (!verification) {
    return;
  }
  const threshold = verification.threshold ?? 1;
  return {
    state: verification.state,
    ...(verification.error ? { error: verification.error } : {}),
    checks: VERIFICATION_CHECKS.flatMap((check) => {
      const answer = verification.answers?.find(
        (entry) => entry.check === check.id
      );
      return answer
        ? [
            {
              id: check.id,
              label: check.label,
              probability: answer.probability,
              verdict: checkVerdict(answer.probability, threshold),
            },
          ]
        : [];
    }),
  };
}

/** The roster's view: the attendee's status plus the file behind it. */
export async function staffCertificateStatus(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">
): Promise<Infer<typeof staffCertificateStatusValidator> | undefined> {
  const status = await certificateStatus(ctx, seat);
  const file = (await currentCertificate(ctx, seat))?.file;
  if (!(status && file)) {
    return status;
  }
  const verification = staffVerification(file.verification);
  return {
    ...status,
    file: {
      _id: file._id,
      name: file.name,
      url: await ctx.storage.getUrl(file.storageId),
      uploadedAt: file.uploadedAt,
      staffUpload: file.staffUpload === true,
      ...(verification ? { verification } : {}),
    },
  };
}

async function eligibleSeat(ctx: QueryCtx, seatId: Id<"registrationSeats">) {
  const [email, actor, seat] = await Promise.all([
    portalEmail(ctx),
    getAuthUserId(ctx),
    ctx.db.get(seatId),
  ]);
  if (!(actor && seat?.sessionId) || seat.email !== email) {
    throw new ConvexError("Registration unavailable");
  }
  return { actor, ...(await requirement(ctx, seat)) };
}

async function staffSeat(ctx: QueryCtx, seatId: Id<"registrationSeats">) {
  const seat = await ctx.db.get(seatId);
  if (!seat?.sessionId) {
    throw new ConvexError("Registration not found");
  }
  const { userId } = await staff(ctx, seat.sessionId);
  return { actor: userId, ...(await requirement(ctx, seat)) };
}

async function requirement(ctx: QueryCtx, seat: Doc<"registrationSeats">) {
  const rule = certificateRequirement(seat);
  const session = seat.sessionId ? await ctx.db.get(seat.sessionId) : null;
  if (!(rule?.passingValue && session) || session.state === "canceled") {
    throw new ConvexError(
      "Certificate upload is unavailable for this registration"
    );
  }
  return { seat, rule, session, passingValue: rule.passingValue };
}

const fileArgs = {
  seatId: v.id("registrationSeats"),
  storageId: v.id("_storage"),
  name: v.string(),
  type: v.string(),
  size: v.number(),
};

const fileValidator = v.object(fileArgs);
type AttachArgs = Infer<typeof fileValidator>;

async function record(
  ctx: MutationCtx,
  {
    actor,
    seat,
    rule,
    session,
    passingValue,
    previous,
    file,
    staffUpload,
  }: Awaited<ReturnType<typeof requirement>> & {
    actor: Id<"users">;
    previous: Doc<"registrationOutcomes"> | null;
    file: Omit<AttachArgs, "seatId">;
    staffUpload: boolean;
  }
) {
  const at = Date.now();
  // Staff vouch for their own uploads; an attendee's upload passes only once verified.
  const certificateFileId = await ctx.db.insert("registrationSessionFiles", {
    ...file,
    sessionId: session._id,
    certificateSeatId: seat._id,
    uploadedAt: at,
    uploadedBy: actor,
    ...(staffUpload
      ? { staffUpload: true }
      : { verification: { state: "verifying", requestedAt: at } }),
  });
  const outcome = {
    seatId: seat._id,
    fieldId: rule.id,
    version: rule.version,
    value: staffUpload ? passingValue : "",
    actor,
    at,
    certificateFileId,
  };
  if (previous) {
    await ctx.db.patch(previous._id, outcome);
  } else {
    await ctx.db.insert("registrationOutcomes", outcome);
  }
  return certificateFileId;
}

export const canUpload = internalQuery({
  args: { seatId: v.id("registrationSeats") },
  returns: v.boolean(),
  handler: async (ctx, { seatId }) => {
    const { rule } = await eligibleSeat(ctx, seatId);
    return !(await certificateOutcome(ctx, seatId, rule))?.certificateFileId;
  },
});

export const attach = internalMutation({
  args: fileArgs,
  returns: v.null(),
  handler: async (ctx, { seatId, ...file }) => {
    const eligible = await eligibleSeat(ctx, seatId);
    const previous = await certificateOutcome(ctx, seatId, eligible.rule);
    if (previous?.certificateFileId) {
      await ctx.storage.delete(file.storageId);
      return null;
    }
    const fileId = await record(ctx, {
      ...eligible,
      previous,
      file,
      staffUpload: false,
    });
    await audit(
      ctx,
      eligible.actor,
      "completion-certificate-uploaded",
      seatId,
      eligible.seat.name
    );
    await ctx.scheduler.runAfter(0, internal.certificateVerification.verify, {
      fileId,
      attempt: 1,
    });
    await ctx.scheduler.runAfter(
      VERIFICATION_DEADLINE_MS,
      internal.registrationCertificates.expireVerification,
      { fileId }
    );
    return null;
  },
});

export const canStaffUpload = internalQuery({
  args: { seatId: v.id("registrationSeats") },
  returns: v.null(),
  handler: async (ctx, { seatId }) => {
    await staffSeat(ctx, seatId);
    return null;
  },
});

/** Staff upload on an attendee's behalf, replacing any earlier certificate. */
export const staffAttach = internalMutation({
  args: fileArgs,
  returns: v.null(),
  handler: async (ctx, { seatId, ...file }) => {
    const eligible = await staffSeat(ctx, seatId);
    const previous = await certificateOutcome(ctx, seatId, eligible.rule);
    const replaced = previous?.certificateFileId
      ? await ctx.db.get(previous.certificateFileId)
      : null;
    if (replaced) {
      await ctx.storage.delete(replaced.storageId);
      await ctx.db.delete(replaced._id);
    }
    await record(ctx, { ...eligible, previous, file, staffUpload: true });
    await audit(
      ctx,
      eligible.actor,
      replaced
        ? "completion-certificate-replaced-by-staff"
        : "completion-certificate-uploaded-by-staff",
      seatId,
      eligible.seat.name
    );
    await ctx.scheduler.runAfter(
      0,
      internal.registrationExternal.captureAnalytics,
      {
        event: "preclass_certificate_uploaded_by_staff",
        analytics: { distinctId: eligible.actor },
        properties: {
          course_id: eligible.session.courseId,
          class_session_id: eligible.session._id,
          status: replaced ? "replaced" : "uploaded",
        },
      }
    );
    return null;
  },
});

function isoDate(at: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** What Jev checks an attendee's upload against, while it still awaits a decision. */
export const verificationInput = internalQuery({
  args: { fileId: v.id("registrationSessionFiles") },
  returns: v.union(
    v.null(),
    v.object({
      storageId: v.id("_storage"),
      type: v.string(),
      expectedCourse: v.string(),
      course: v.optional(v.string()),
      attendeeName: v.string(),
      today: v.string(),
      earliestCompletionDate: v.string(),
    })
  ),
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (
      !(file?.verification?.state === "verifying" && file.certificateSeatId)
    ) {
      return null;
    }
    const [seat, session] = await Promise.all([
      ctx.db.get(file.certificateSeatId),
      ctx.db.get(file.sessionId),
    ]);
    const rule = seat ? certificateRequirement(seat) : undefined;
    if (!(seat && session && rule)) {
      return null;
    }
    const [material, course] = await Promise.all([
      rule.certificateMaterialId
        ? ctx.db.get(rule.certificateMaterialId)
        : null,
      ctx.db.get(session.courseId),
    ]);
    return {
      storageId: file.storageId,
      type: file.type,
      expectedCourse: certificateCourseName(material?.title ?? rule.title),
      ...(course ? { course: course.title } : {}),
      attendeeName: seat.name,
      today: isoDate(Date.now(), session.timeZone),
      earliestCompletionDate: earliestCompletionDate(session),
    };
  },
});

function earliestCompletionDate(session: Doc<"registrationSessions">) {
  return isoDate(
    session.firstStart - CERTIFICATE_MAX_AGE_DAYS * DAY_MS,
    session.timeZone
  );
}

/** The outcome an attendee's certificate upload backs, and the rule it satisfies. */
async function certificateRecord(
  ctx: QueryCtx,
  file: Doc<"registrationSessionFiles">
) {
  const [outcome, seat] = await Promise.all([
    ctx.db
      .query("registrationOutcomes")
      .withIndex("by_certificateFileId", (q) =>
        q.eq("certificateFileId", file._id)
      )
      .unique(),
    file.certificateSeatId ? ctx.db.get(file.certificateSeatId) : null,
  ]);
  const rule = seat?.outcomeDefinitions.find(
    (definition) =>
      definition.id === outcome?.fieldId &&
      definition.version === outcome?.version
  );
  return { outcome, seat, passingValue: rule?.passingValue };
}

async function finishVerification(
  ctx: MutationCtx,
  file: Doc<"registrationSessionFiles">,
  update: Partial<Infer<typeof certificateVerification>> & {
    state: "auto_passed" | "needs_review";
  }
) {
  const { verification } = file;
  if (verification?.state !== "verifying") {
    return;
  }
  const [{ outcome, passingValue }, session] = await Promise.all([
    certificateRecord(ctx, file),
    ctx.db.get(file.sessionId),
  ]);
  if (update.state === "auto_passed" && outcome && passingValue) {
    await ctx.db.patch(outcome._id, { value: passingValue, at: Date.now() });
  }
  await ctx.db.patch(file._id, {
    verification: { ...verification, ...update, decidedAt: Date.now() },
  });
  await ctx.scheduler.runAfter(
    0,
    internal.registrationExternal.captureAnalytics,
    {
      event: "preclass_certificate_verified",
      analytics: { distinctId: `certificate_verification:${file._id}` },
      properties: {
        ...(session ? { course_id: session.courseId } : {}),
        class_session_id: file.sessionId,
        result: update.error ? "error" : update.state,
      },
    }
  );
}

/** Records Jev's answers, or the reason it could not answer. */
export const recordVerification = internalMutation({
  args: {
    fileId: v.id("registrationSessionFiles"),
    threshold: v.number(),
    model: v.optional(v.string()),
    answers: v.optional(certificateVerification.fields.answers),
    error: certificateVerification.fields.error,
    checkedFrom: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { fileId, threshold, model, answers, error, checkedFrom }
  ) => {
    const file = await ctx.db.get(fileId);
    if (!file) {
      return null;
    }
    const session = await ctx.db.get(file.sessionId);
    const sameWindow =
      session !== null && checkedFrom === earliestCompletionDate(session);
    const passed =
      !error &&
      sameWindow &&
      answers !== undefined &&
      decide(answers, threshold);
    await finishVerification(ctx, file, {
      state: passed ? "auto_passed" : "needs_review",
      threshold,
      ...(model ? { model } : {}),
      ...(answers ? { answers } : {}),
      ...(error ? { error } : {}),
    });
    return null;
  },
});

/** A verification that never finished goes to staff instead of staying stuck. */
export const expireVerification = internalMutation({
  args: { fileId: v.id("registrationSessionFiles") },
  returns: v.null(),
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (file) {
      await finishVerification(ctx, file, {
        state: "needs_review",
        error: "timeout",
      });
    }
    return null;
  },
});

async function reviewableUpload(
  ctx: MutationCtx,
  fileId: Id<"registrationSessionFiles">
) {
  const file = await ctx.db.get(fileId);
  if (!file) {
    throw new ConvexError("Certificate not found");
  }
  const { userId } = await staff(ctx, file.sessionId);
  const { verification } = file;
  if (!(verification && pendingReview(file))) {
    throw new ConvexError("This certificate is not awaiting review");
  }
  const { outcome, seat, passingValue } = await certificateRecord(ctx, file);
  if (!(outcome && seat && passingValue)) {
    throw new ConvexError(
      "Certificate upload is unavailable for this registration"
    );
  }
  return {
    actor: userId,
    file,
    verification,
    outcome,
    seat,
    passingValue,
  };
}

/** Staff accept an attendee's certificate that automatic checks did not pass. */
export const approve = mutation({
  args: { fileId: v.id("registrationSessionFiles") },
  returns: v.null(),
  handler: async (ctx, { fileId }) => {
    const { actor, file, verification, outcome, seat, passingValue } =
      await reviewableUpload(ctx, fileId);
    const at = Date.now();
    await ctx.db.patch(outcome._id, { value: passingValue, actor, at });
    await ctx.db.patch(file._id, {
      verification: {
        ...verification,
        state: "approved",
        reviewedBy: actor,
        reviewedAt: at,
      },
    });
    await audit(
      ctx,
      actor,
      "completion-certificate-approved",
      seat._id,
      seat.name
    );
    return null;
  },
});

/**
 * Staff turn down an attendee's certificate: the file is deleted, the
 * requirement reopens so upload reminders resume, and the attendee is asked
 * to upload again.
 */
export const reject = mutation({
  args: { fileId: v.id("registrationSessionFiles") },
  returns: v.null(),
  handler: async (ctx, { fileId }) => {
    const { actor, file, outcome, seat } = await reviewableUpload(ctx, fileId);
    const session = await ctx.db.get(file.sessionId);
    const title =
      seat.outcomeDefinitions.find((rule) => rule.id === outcome.fieldId)
        ?.title ?? "pre-class";
    await ctx.db.delete(outcome._id);
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(file._id);
    await enqueue(ctx, {
      key: `certificate-rejected:${file._id}`,
      kind: "email",
      recipient: seat.email,
      subject: `Please upload your ${title} certificate again`,
      body: `We couldn’t verify the completion certificate you uploaded${session ? ` for ${session.title}` : ""}. Please sign in to your registration portal and upload a clear copy of your ${title} completion certificate that shows your name, the course, and the completion date.`,
      due: Date.now(),
      seatId: seat._id,
      sessionId: file.sessionId,
    });
    await audit(
      ctx,
      actor,
      "completion-certificate-rejected",
      seat._id,
      seat.name
    );
    return null;
  },
});

export const CERTIFICATE_SIGNATURES = [
  { bytes: [37, 80, 68, 70, 45], type: "application/pdf" },
  { bytes: [255, 216, 255], type: "image/jpeg" },
  { bytes: [137, 80, 78, 71, 13, 10, 26, 10], type: "image/png" },
];

function certificateFile(name: string, bytes: ArrayBuffer) {
  if (!name.trim() || name.trim().length > 200) {
    throw new ConvexError("Give the file a name under 200 characters");
  }
  if (bytes.byteLength > MAX_CERTIFICATE_BYTES) {
    throw new ConvexError("The certificate must be 3 MB or smaller");
  }
  const header = new DataView(bytes);
  const format = CERTIFICATE_SIGNATURES.find(
    (signature) =>
      signature.bytes.length <= header.byteLength &&
      signature.bytes.every((byte, index) => header.getUint8(index) === byte)
  );
  if (!format) {
    throw new ConvexError("Choose a PDF, JPEG, or PNG certificate");
  }
  return { name: name.trim(), type: format.type, size: bytes.byteLength };
}

async function storeAndAttach(
  ctx: ActionCtx,
  attachMutation: FunctionReference<"mutation", "internal", AttachArgs, null>,
  seatId: Id<"registrationSeats">,
  file: ReturnType<typeof certificateFile>,
  bytes: ArrayBuffer
) {
  const storageId = await ctx.storage.store(
    new Blob([bytes], { type: file.type })
  );
  try {
    await ctx.runMutation(attachMutation, { seatId, storageId, ...file });
  } catch (error) {
    await ctx.storage.delete(storageId);
    throw error;
  }
}

export const upload = action({
  args: {
    seatId: v.id("registrationSeats"),
    name: v.string(),
    bytes: v.bytes(),
  },
  returns: v.null(),
  handler: async (ctx, { seatId, name, bytes }): Promise<null> => {
    const file = certificateFile(name, bytes);
    const available = await ctx.runQuery(
      internal.registrationCertificates.canUpload,
      { seatId }
    );
    if (available) {
      await storeAndAttach(
        ctx,
        internal.registrationCertificates.attach,
        seatId,
        file,
        bytes
      );
    }
    return null;
  },
});

/** Admins and the session's staff upload a certificate for an attendee. */
export const uploadForAttendee = action({
  args: {
    seatId: v.id("registrationSeats"),
    name: v.string(),
    bytes: v.bytes(),
  },
  returns: v.null(),
  handler: async (ctx, { seatId, name, bytes }): Promise<null> => {
    const file = certificateFile(name, bytes);
    await ctx.runQuery(internal.registrationCertificates.canStaffUpload, {
      seatId,
    });
    await storeAndAttach(
      ctx,
      internal.registrationCertificates.staffAttach,
      seatId,
      file,
      bytes
    );
    return null;
  },
});
