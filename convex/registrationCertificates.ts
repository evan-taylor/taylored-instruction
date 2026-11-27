import { getAuthUserId } from "@convex-dev/auth/server";
import type { FunctionReference } from "convex/server";
import { ConvexError, type Infer, v } from "convex/values";
import { MAX_CERTIFICATE_BYTES } from "../shared/registration/certificate";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { audit, portalEmail, staff } from "./registrationHelpers";

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

export const certificateStatusValidator = v.object({
  title: v.string(),
  uploaded: v.boolean(),
  materialId: v.optional(v.id("registrationMaterials")),
});

export async function certificateStatus(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">,
  displayRules = seat.outcomeDefinitions
) {
  const rule = certificateRequirement(seat);
  if (rule) {
    const outcome = await certificateOutcome(ctx, seat._id, rule);
    return {
      title: rule.title,
      uploaded: Boolean(outcome?.certificateFileId),
      // Display settings can change after an attendee's grading rules are frozen.
      materialId: displayRules.find(
        (displayRule) =>
          displayRule.id === rule.id && displayRule.certificateRequired
      )?.certificateMaterialId,
    };
  }
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
    })
  ),
});

/** The roster's view: the attendee's status plus the file behind it. */
export async function staffCertificateStatus(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">
): Promise<Infer<typeof staffCertificateStatusValidator> | undefined> {
  const status = await certificateStatus(ctx, seat);
  const rule = certificateRequirement(seat);
  if (!(status && rule)) {
    return;
  }
  const fileId = (await certificateOutcome(ctx, seat._id, rule))
    ?.certificateFileId;
  const file = fileId ? await ctx.db.get(fileId) : null;
  if (!file) {
    return status;
  }
  return {
    ...status,
    file: {
      _id: file._id,
      name: file.name,
      url: await ctx.storage.getUrl(file.storageId),
      uploadedAt: file.uploadedAt,
      staffUpload: file.staffUpload === true,
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
  const certificateFileId = await ctx.db.insert("registrationSessionFiles", {
    ...file,
    sessionId: session._id,
    certificateSeatId: seat._id,
    uploadedAt: at,
    uploadedBy: actor,
    ...(staffUpload ? { staffUpload: true } : {}),
  });
  const outcome = {
    seatId: seat._id,
    fieldId: rule.id,
    version: rule.version,
    value: passingValue,
    actor,
    at,
    certificateFileId,
  };
  if (previous) {
    await ctx.db.patch(previous._id, outcome);
  } else {
    await ctx.db.insert("registrationOutcomes", outcome);
  }
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
    await record(ctx, { ...eligible, previous, file, staffUpload: false });
    await audit(
      ctx,
      eligible.actor,
      "completion-certificate-uploaded",
      seatId,
      eligible.seat.name
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
