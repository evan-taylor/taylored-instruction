"use node";
import { ConvexError, type Infer, v } from "convex/values";
import { BUSINESS } from "../lib/business";
import { certificateEmail } from "../shared/registration/certificate-email";
import { readCertificateFile } from "../shared/registration/certificate-file";
import {
  CertificateFileError,
  certificateCourseTitle,
  matchCertificateRows,
  type ParsedCertificateFile,
  type RosterAttendee,
} from "../shared/registration/student-certificates";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, action } from "./_generated/server";
import {
  certificateAgency,
  certificateTarget,
} from "./studentCertificateSchema";

type ImportContext = {
  roster: RosterAttendee[];
  saved: string[];
  title: string;
  emails: boolean;
  recentClass: boolean;
};
type SaveResult = { created: number; updated: number; emails: number };

/** Checks the caller can import into the target before any file work. */
async function readUpload(
  ctx: ActionCtx,
  target: Infer<typeof certificateTarget>,
  storageId: Id<"_storage">
) {
  await ctx.runQuery(internal.studentCertificates.checkAccess, { target });
  const blob = await ctx.storage.get(storageId);
  if (!blob) {
    throw new ConvexError("The upload expired. Choose the file again.");
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let parsed: ParsedCertificateFile;
  try {
    parsed = await readCertificateFile(bytes);
  } catch (error) {
    throw error instanceof CertificateFileError
      ? new ConvexError(error.message)
      : error;
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Buffer.from(digest).toString("hex");
  return { parsed, sha256, size: bytes.byteLength, type: blob.type };
}

const matchStatus = v.union(
  v.literal("email"),
  v.literal("name"),
  v.literal("ambiguous"),
  v.literal("unmatched")
);

const previewRow = v.object({
  row: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  certificateId: v.optional(v.string()),
  status: v.string(),
  issuedOn: v.string(),
  expiresOn: v.string(),
  instructor: v.optional(v.string()),
  match: v.optional(
    v.object({
      status: matchStatus,
      attendeeId: v.optional(v.string()),
      candidates: v.array(v.string()),
    })
  ),
  saved: v.boolean(),
});

/**
 * Parses an uploaded agency file and pairs its rows with the session roster.
 * Nothing is saved; staff confirm the matches with `confirm`.
 */
export const preview = action({
  args: { target: certificateTarget, storageId: v.id("_storage") },
  returns: v.object({
    agency: certificateAgency,
    course: v.string(),
    courseTitle: v.string(),
    trainingSite: v.optional(v.string()),
    location: v.optional(v.string()),
    sessionTitle: v.string(),
    rows: v.array(previewRow),
    roster: v.array(
      v.object({ id: v.string(), name: v.string(), email: v.string() })
    ),
    withoutCertificate: v.array(v.string()),
    emails: v.boolean(),
    recentClass: v.boolean(),
    email: v.optional(
      v.object({
        to: v.string(),
        subject: v.string(),
        html: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const { parsed } = await readUpload(ctx, args.target, args.storageId);
    const issued = parsed.rows.filter((row) => row.certificateId);
    const context: ImportContext = await ctx.runQuery(
      internal.studentCertificates.importContext,
      {
        target: args.target,
        agency: parsed.agency,
        certificateIds: issued.flatMap((row) =>
          row.certificateId ? [row.certificateId] : []
        ),
      }
    );
    const { matches, withoutCertificate } = matchCertificateRows(
      issued,
      context.roster
    );
    const byRow = new Map(matches.map((match) => [match.row, match]));
    const saved = new Set(context.saved);
    const [sample] = issued;
    const rendered =
      sample?.certificateId && context.emails
        ? certificateEmail(
            {
              kind: "issued",
              firstName: sample.firstName,
              course: certificateCourseTitle(sample.course),
              agency: parsed.agency,
              certificateId: sample.certificateId,
              issuedOn: sample.issuedOn,
              expiresOn: sample.expiresOn,
              instructor: sample.instructor,
              review: true,
              renewPath: "/classes",
            },
            new URL(process.env.SITE_URL ?? BUSINESS.url).origin
          )
        : null;
    return {
      email: rendered
        ? {
            to: `${sample?.firstName} ${sample?.lastName}`.trim(),
            subject: rendered.subject,
            html: rendered.html,
          }
        : undefined,
      agency: parsed.agency,
      course: parsed.course,
      courseTitle: certificateCourseTitle(parsed.course),
      trainingSite: parsed.trainingSite,
      location: parsed.location,
      sessionTitle: context.title,
      rows: parsed.rows.map((row) => {
        const match = byRow.get(row.row);
        return {
          row: row.row,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          certificateId: row.certificateId,
          status: row.status,
          issuedOn: row.issuedOn,
          expiresOn: row.expiresOn,
          instructor: row.instructor,
          match: match && {
            status: match.status,
            attendeeId: match.attendeeId,
            candidates: match.candidates,
          },
          saved: Boolean(row.certificateId && saved.has(row.certificateId)),
        };
      }),
      roster: context.roster.map(({ id, name, email }) => ({
        id,
        name,
        email,
      })),
      withoutCertificate,
      emails: context.emails,
      recentClass: context.recentClass,
    };
  },
});

const decision = v.object({
  row: v.number(),
  /** A roster attendee id; omit to keep the certificate on the email alone. */
  attendeeId: v.optional(v.string()),
  skip: v.optional(v.boolean()),
});

/**
 * Saves the certificates in an uploaded file. The file is parsed again here,
 * so only the staff decisions on flagged rows travel from the browser.
 */
export const confirm = action({
  args: {
    target: certificateTarget,
    storageId: v.id("_storage"),
    fileName: v.string(),
    decisions: v.array(decision),
    postClassEmail: v.boolean(),
  },
  returns: v.object({
    created: v.number(),
    updated: v.number(),
    emails: v.number(),
  }),
  handler: async (ctx, args): Promise<SaveResult> => {
    const { parsed, sha256, size, type } = await readUpload(
      ctx,
      args.target,
      args.storageId
    );
    const issued = parsed.rows.filter((row) => row.certificateId);
    const context: ImportContext = await ctx.runQuery(
      internal.studentCertificates.importContext,
      { target: args.target, agency: parsed.agency, certificateIds: [] }
    );
    const { matches } = matchCertificateRows(issued, context.roster);
    const decisions = new Map(args.decisions.map((d) => [d.row, d]));
    const rows = issued.flatMap((row) => {
      const choice = decisions.get(row.row);
      const match = matches.find((m) => m.row === row.row);
      if (choice?.skip) {
        return [];
      }
      if (!(choice || match?.attendeeId)) {
        throw new ConvexError(
          `Match ${row.firstName} ${row.lastName} to an attendee, or choose not to link or save them.`
        );
      }
      return [
        {
          row: row.row,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          certificateId: row.certificateId ?? "",
          status: row.status,
          course: row.course,
          issuedOn: row.issuedOn,
          expiresOn: row.expiresOn,
          instructor: row.instructor,
          instructorId: row.instructorId,
          attendeeId: choice ? choice.attendeeId : match?.attendeeId,
        },
      ];
    });
    return await ctx.runMutation(internal.studentCertificates.saveImport, {
      target: args.target,
      agency: parsed.agency,
      course: parsed.course,
      trainingSite: parsed.trainingSite,
      location: parsed.location,
      file: {
        storageId: args.storageId,
        fileName: args.fileName.trim().slice(0, 200) || "certificates",
        contentType: type || "application/octet-stream",
        size,
        sha256,
      },
      rows,
      postClassEmail: args.postClassEmail,
    });
  },
});
