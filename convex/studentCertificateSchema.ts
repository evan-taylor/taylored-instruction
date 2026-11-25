import { defineTable } from "convex/server";
import { v } from "convex/values";
import { independentSessionId, independentStudentId } from "./alignedSchema";

export const certificateAgency = v.union(v.literal("aha"), v.literal("arc"));

/** A registration session, or an aligned instructor's independent session. */
export const certificateTarget = v.union(
  v.object({ kind: v.literal("session"), id: v.id("registrationSessions") }),
  v.object({ kind: v.literal("independent"), id: independentSessionId })
);

/**
 * Certificates we issued to students, imported from the agency file staff
 * upload to a session. One row per agency certificate: (agency,
 * certificateId) is unique, so re-uploading a file updates rather than
 * duplicates. The student is the email; seat links tie a row to a roster.
 */
export const studentCertificateTables = {
  studentCertificates: defineTable({
    agency: certificateAgency,
    /** Course or card type as the agency file names it. */
    course: v.string(),
    /** Agency and course family; a newer certificate with the same key renews this one. */
    typeKey: v.string(),
    /** The AHA eCard code or the Red Cross certificate ID. */
    certificateId: v.string(),
    issuedOn: v.string(),
    expiresOn: v.string(),
    status: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    /** Lowercased; empty when the file has no address for the student. */
    email: v.string(),
    instructor: v.optional(v.string()),
    instructorId: v.optional(v.string()),
    trainingSite: v.optional(v.string()),
    location: v.optional(v.string()),
    sessionId: v.optional(v.id("registrationSessions")),
    seatId: v.optional(v.id("registrationSeats")),
    independentSessionId: v.optional(independentSessionId),
    independentStudentId: v.optional(independentStudentId),
    importId: v.id("certificateImports"),
    sourceRow: v.number(),
    /** A later certificate of the same type for the same student. */
    supersededBy: v.optional(v.id("studentCertificates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agency_and_certificateId", ["agency", "certificateId"])
    .index("by_email_and_issuedOn", ["email", "issuedOn"])
    .index("by_email_and_typeKey_and_issuedOn", [
      "email",
      "typeKey",
      "issuedOn",
    ])
    .index("by_sessionId", ["sessionId"])
    .index("by_independentSessionId", ["independentSessionId"])
    .index("by_seatId", ["seatId"])
    .index("by_expiresOn", ["expiresOn"])
    .index("by_agency_and_expiresOn", ["agency", "expiresOn"])
    .index("by_typeKey_and_expiresOn", ["typeKey", "expiresOn"]),
  /** Each uploaded agency file, kept in storage as the source of its certificates. */
  certificateImports: defineTable({
    agency: certificateAgency,
    course: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    sha256: v.string(),
    storageId: v.id("_storage"),
    sessionId: v.optional(v.id("registrationSessions")),
    independentSessionId: v.optional(independentSessionId),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    certificates: v.number(),
    postClassEmail: v.union(
      v.literal("send"),
      v.literal("skip"),
      v.literal("not-applicable")
    ),
  })
    .index("by_sha256", ["sha256"])
    .index("by_sessionId", ["sessionId"])
    .index("by_independentSessionId", ["independentSessionId"]),
  /** Certificate types seen in imports, for the staff filter. */
  certificateTypes: defineTable({
    typeKey: v.string(),
    agency: certificateAgency,
    course: v.string(),
  }).index("by_typeKey", ["typeKey"]),
  /**
   * Opt-out from reminder and marketing email, per address. The token is the
   * unguessable unsubscribe link; transactional mail ignores this table.
   */
  emailPreferences: defineTable({
    email: v.string(),
    token: v.string(),
    unsubscribedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),
};
