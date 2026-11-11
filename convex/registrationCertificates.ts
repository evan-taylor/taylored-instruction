import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { MAX_CERTIFICATE_BYTES } from "../shared/registration/certificate";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { audit, portalEmail } from "./registrationHelpers";

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

async function eligibleSeat(ctx: QueryCtx, seatId: Id<"registrationSeats">) {
  const [email, actor, seat] = await Promise.all([
    portalEmail(ctx),
    getAuthUserId(ctx),
    ctx.db.get(seatId),
  ]);
  if (!(actor && seat?.sessionId) || seat.email !== email) {
    throw new ConvexError("Registration unavailable");
  }
  const rule = certificateRequirement(seat);
  const session = await ctx.db.get(seat.sessionId);
  if (!(rule?.passingValue && session) || session.state === "canceled") {
    throw new ConvexError(
      "Certificate upload is unavailable for this registration"
    );
  }
  return { actor, seat, rule, session, passingValue: rule.passingValue };
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
  args: {
    seatId: v.id("registrationSeats"),
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { seatId, ...file }) => {
    const { actor, seat, rule, session, passingValue } = await eligibleSeat(
      ctx,
      seatId
    );
    const previous = await certificateOutcome(ctx, seatId, rule);
    if (previous?.certificateFileId) {
      await ctx.storage.delete(file.storageId);
      return null;
    }

    const at = Date.now();
    const certificateFileId = await ctx.db.insert("registrationSessionFiles", {
      ...file,
      sessionId: session._id,
      certificateSeatId: seatId,
      uploadedAt: at,
      uploadedBy: actor,
    });
    const outcome = {
      seatId,
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
    await audit(
      ctx,
      actor,
      "completion-certificate-uploaded",
      seatId,
      seat.name
    );
    return null;
  },
});

const SIGNATURES = [
  { bytes: [37, 80, 68, 70, 45], type: "application/pdf" },
  { bytes: [255, 216, 255], type: "image/jpeg" },
  { bytes: [137, 80, 78, 71, 13, 10, 26, 10], type: "image/png" },
];

export const upload = action({
  args: {
    seatId: v.id("registrationSeats"),
    name: v.string(),
    bytes: v.bytes(),
  },
  returns: v.null(),
  handler: async (ctx, { seatId, name, bytes }): Promise<null> => {
    if (!name.trim() || name.trim().length > 200) {
      throw new ConvexError("Give the file a name under 200 characters");
    }
    if (bytes.byteLength > MAX_CERTIFICATE_BYTES) {
      throw new ConvexError("The certificate must be 3 MB or smaller");
    }
    const header = new DataView(bytes);
    const format = SIGNATURES.find(
      (signature) =>
        signature.bytes.length <= header.byteLength &&
        signature.bytes.every((byte, index) => header.getUint8(index) === byte)
    );
    if (!format) {
      throw new ConvexError("Choose a PDF, JPEG, or PNG certificate");
    }
    const available = await ctx.runQuery(
      internal.registrationCertificates.canUpload,
      { seatId }
    );
    if (!available) {
      return null;
    }
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: format.type })
    );
    try {
      await ctx.runMutation(internal.registrationCertificates.attach, {
        seatId,
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
