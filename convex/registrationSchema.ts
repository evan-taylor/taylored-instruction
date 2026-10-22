import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  couponFields,
  courseFields,
  orderStatus,
  outcome,
  postalAddress,
  quotedSeat,
  sessionFields,
} from "../shared/registration/validators";

export const registrationTables = {
  registrationInstructorAssignments: defineTable({
    sessionId: v.id("registrationSessions"),
    userId: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"]),
  registrationTransfers: defineTable({
    from: v.id("registrationSeats"),
    to: v.id("registrationSeats"),
    actor: v.id("users"),
    reason: v.string(),
    adjustment: v.number(),
    choice: v.string(),
    at: v.number(),
  }).index("by_from", ["from"]),
  registrationCourses: defineTable(courseFields)
    .index("by_slug", ["slug"])
    .index("by_publication", ["publication"])
    .index("by_publication_and_delivery", ["publication", "delivery"]),
  registrationSessions: defineTable(sessionFields)
    .index("by_code", ["code"])
    .index("by_firstStart", ["firstStart"])
    .index("by_courseId", ["courseId"])
    .index("by_courseId_and_firstStart", ["courseId", "firstStart"])
    .index("by_courseId_and_visibility_and_publication", [
      "courseId",
      "visibility",
      "publication",
    ])
    .index("by_publication_and_visibility_and_firstStart", [
      "publication",
      "visibility",
      "firstStart",
    ]),
  /** Staff uploads attached to a session: rosters, sign-in sheets, handouts. */
  registrationSessionFiles: defineTable({
    sessionId: v.id("registrationSessions"),
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
  }).index("by_sessionId", ["sessionId"]),
  registrationLocations: defineTable({
    name: v.string(),
    address: v.string(),
    instructions: v.string(),
    archived: v.boolean(),
  }),
  registrationMaterials: defineTable({
    title: v.string(),
    availableCount: v.optional(v.number()),
    assignedCount: v.optional(v.number()),
    retiredCount: v.optional(v.number()),
    kind: v.union(v.literal("pdf"), v.literal("link"), v.literal("keycode")),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    version: v.number(),
    archived: v.boolean(),
    taxCode: v.optional(v.string()),
  }),
  registrationCodes: defineTable({
    materialId: v.id("registrationMaterials"),
    url: v.string(),
    fingerprint: v.string(),
    state: v.union(
      v.literal("available"),
      v.literal("assigned"),
      v.literal("retired")
    ),
    entitlementId: v.optional(v.id("registrationEntitlements")),
  })
    .index("by_fingerprint", ["fingerprint"])
    .index("by_materialId_and_state", ["materialId", "state"]),
  registrationCoupons: defineTable(couponFields).index("by_code", ["code"]),
  registrationOrders: defineTable({
    requestKey: v.string(),
    purchaser: v.string(),
    purchaserName: v.string(),
    purchaserPhone: v.optional(v.string()),
    courseId: v.id("registrationCourses"),
    sessionId: v.optional(v.id("registrationSessions")),
    title: v.string(),
    status: orderStatus,
    seats: v.array(quotedSeat),
    total: v.number(),
    currency: v.literal("usd"),
    expires: v.number(),
    couponId: v.optional(v.id("registrationCoupons")),
    couponUses: v.number(),
    restoredUses: v.number(),
    stripeSession: v.optional(v.string()),
    paymentIntent: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    source: v.optional(v.string()),
    refunded: v.number(),
    refundReserved: v.number(),
    /** Hosted Checkout URL from before the on-page payment flow; no longer set. */
    checkoutUrl: v.optional(v.string()),
    checkoutSecret: v.optional(v.string()),
    error: v.optional(v.string()),
    organizationId: v.optional(v.id("registrationOrganizations")),
    pricingNote: v.optional(v.string()),
    /** Sales tax collected by Stripe on top of `total`, recorded at settlement. */
    tax: v.optional(v.number()),
  })
    .index("by_requestKey", ["requestKey"])
    .index("by_purchaser", ["purchaser"])
    .index("by_status_and_expires", ["status", "expires"])
    .index("by_sessionId", ["sessionId"])
    .index("by_stripeSession", ["stripeSession"])
    .index("by_organizationId", ["organizationId"]),
  registrationOrganizations: defineTable({
    name: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    phone: v.string(),
    address: v.string(),
    ...postalAddress,
    notes: v.string(),
    archived: v.boolean(),
  }).index("by_contactEmail", ["contactEmail"]),
  registrationGroupRequests: defineTable({
    organization: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    courseInterest: v.string(),
    headcount: v.number(),
    preferredDates: v.string(),
    location: v.string(),
    notes: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("quoted"),
      v.literal("scheduled"),
      v.literal("closed")
    ),
    internalNotes: v.string(),
    organizationId: v.optional(v.id("registrationOrganizations")),
    orderId: v.optional(v.id("registrationOrders")),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),
  registrationInvoices: defineTable({
    orderId: v.id("registrationOrders"),
    number: v.string(),
    organizationId: v.optional(v.id("registrationOrganizations")),
    billToName: v.string(),
    billToEmail: v.string(),
    billToAddress: v.string(),
    ...postalAddress,
    poNumber: v.string(),
    notes: v.string(),
    dueAt: v.number(),
    /** Pre-tax amount from the order snapshot. */
    amount: v.number(),
    /** Sales tax computed by Stripe Tax when the invoice is finalized. */
    tax: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("paid"),
      v.literal("void")
    ),
    method: v.optional(v.union(v.literal("stripe"), v.literal("offline"))),
    stripeInvoiceId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    hostedUrl: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    remindedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    voidedAt: v.optional(v.number()),
    actor: v.string(),
    error: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"]),
  registrationCounters: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),
  registrationSeats: defineTable({
    orderId: v.id("registrationOrders"),
    courseId: v.id("registrationCourses"),
    sessionId: v.optional(v.id("registrationSessions")),
    email: v.string(),
    name: v.string(),
    state: v.union(
      v.literal("held"),
      v.literal("active"),
      v.literal("canceled"),
      v.literal("transferred")
    ),
    settledAt: v.optional(v.number()),
    snapshot: quotedSeat,
    outcomeDefinitions: v.array(outcome),
    transferredFrom: v.optional(v.id("registrationSeats")),
  })
    .index("by_sessionId_and_email", ["sessionId", "email"])
    .index("by_sessionId_and_state", ["sessionId", "state"])
    .index("by_orderId", ["orderId"])
    .index("by_email", ["email"])
    .index("by_courseId", ["courseId"]),
  registrationEntitlements: defineTable({
    seatId: v.id("registrationSeats"),
    materialId: v.id("registrationMaterials"),
    attachmentId: v.string(),
    title: v.string(),
    version: v.number(),
    kind: v.union(v.literal("pdf"), v.literal("link"), v.literal("keycode")),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    state: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("canceled")
    ),
    paidAt: v.number(),
    codeId: v.optional(v.id("registrationCodes")),
  })
    .index("by_seatId", ["seatId"])
    .index("by_seatId_and_materialId", ["seatId", "materialId"])
    .index("by_seatId_and_attachmentId", ["seatId", "attachmentId"])
    .index("by_materialId_and_state_and_paidAt", [
      "materialId",
      "state",
      "paidAt",
    ]),
  registrationAssignments: defineTable({
    entitlementId: v.id("registrationEntitlements"),
    codeId: v.id("registrationCodes"),
    actor: v.string(),
    reason: v.string(),
    at: v.number(),
  })
    .index("by_entitlementId", ["entitlementId"])
    .index("by_codeId", ["codeId"]),
  registrationJobs: defineTable({
    key: v.string(),
    kind: v.union(
      v.literal("email"),
      v.literal("shortage"),
      v.literal("admin-shortage")
    ),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
    due: v.number(),
    state: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    attempts: v.number(),
    seatId: v.optional(v.id("registrationSeats")),
    sessionId: v.optional(v.id("registrationSessions")),
    entitlementId: v.optional(v.id("registrationEntitlements")),
    stepId: v.optional(v.string()),
    scheduleRevision: v.optional(v.number()),
    error: v.optional(v.string()),
    providerId: v.optional(v.string()),
    link: v.optional(v.object({ label: v.string(), url: v.string() })),
  })
    .index("by_key", ["key"])
    .index("by_state_and_due", ["state", "due"])
    .index("by_sessionId", ["sessionId"])
    .index("by_seatId_and_state", ["seatId", "state"])
    .index("by_seatId_and_stepId_and_state", ["seatId", "stepId", "state"])
    .index("by_seatId", ["seatId"]),
  registrationEvents: defineTable({
    eventId: v.string(),
    orderId: v.id("registrationOrders"),
    type: v.string(),
    at: v.number(),
  }).index("by_eventId", ["eventId"]),
  registrationActivity: defineTable({
    actor: v.string(),
    action: v.string(),
    entity: v.string(),
    detail: v.string(),
    at: v.number(),
  }).index("by_entity", ["entity"]),
  registrationOutcomes: defineTable({
    seatId: v.id("registrationSeats"),
    fieldId: v.string(),
    version: v.number(),
    value: v.union(v.string(), v.number()),
    actor: v.id("users"),
    at: v.number(),
  })
    .index("by_seatId", ["seatId"])
    .index("by_seatId_and_fieldId_and_version", [
      "seatId",
      "fieldId",
      "version",
    ]),
  registrationAttendance: defineTable({
    seatId: v.id("registrationSeats"),
    meetingId: v.string(),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("not-recorded")
    ),
    actor: v.id("users"),
  }).index("by_seatId", ["seatId"]),
  registrationOverrides: defineTable({
    seatId: v.id("registrationSeats"),
    complete: v.boolean(),
    reason: v.string(),
    actor: v.id("users"),
    at: v.number(),
  }).index("by_seatId", ["seatId"]),
  registrationWaitlist: defineTable({
    sessionId: v.id("registrationSessions"),
    name: v.string(),
    email: v.string(),
    state: v.union(
      v.literal("waiting"),
      v.literal("offered"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("declined")
    ),
    tokenHash: v.optional(v.string()),
    expires: v.optional(v.number()),
  })
    .index("by_sessionId_and_state_and_expires", [
      "sessionId",
      "state",
      "expires",
    ])
    .index("by_sessionId_and_state", ["sessionId", "state"])
    .index("by_sessionId_and_email", ["sessionId", "email"])
    .index("by_sessionId_and_email_and_state", ["sessionId", "email", "state"])
    .index("by_tokenHash", ["tokenHash"]),
  registrationGrants: defineTable({
    hash: v.string(),
    email: v.string(),
    purpose: v.union(v.literal("challenge"), v.literal("portal")),
    expires: v.number(),
    consumed: v.boolean(),
  })
    .index("by_hash", ["hash"])
    .index("by_email", ["email"]),
  registrationRates: defineTable({
    key: v.string(),
    count: v.number(),
    until: v.number(),
  }).index("by_key", ["key"]),
  registrationRefunds: defineTable({
    allocations: v.optional(
      v.array(
        v.object({ email: v.string(), lineId: v.string(), cents: v.number() })
      )
    ),
    orderId: v.id("registrationOrders"),
    key: v.string(),
    cents: v.number(),
    reason: v.string(),
    actor: v.id("users"),
    state: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
    stripeId: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_orderId", ["orderId"])
    .index("by_state", ["state"]),
};
