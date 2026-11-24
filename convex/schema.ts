import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { alignedTables } from "./alignedSchema";
import { registrationTables } from "./registrationSchema";

const onboardingSteps = defineTable({
  title: v.string(),
  content: v.string(),
  order: v.number(),
  createdAt: v.string(),
  updatedAt: v.string(),
  createdBy: v.string(),
})
  .index("by_order", ["order"])
  .index("by_created_at", ["createdAt"]);

const seoPages = defineTable({
  slug: v.string(),
  title: v.string(),
  metaTitle: v.string(),
  metaDescription: v.string(),
  excerpt: v.string(),
  primaryKeyword: v.string(),
  secondaryKeywords: v.array(v.string()),
  locationLabel: v.string(),
  locationCity: v.string(),
  locationRegion: v.string(),
  locationState: v.string(),
  serviceLine: v.string(),
  audience: v.string(),
  readingTimeMinutes: v.number(),
  sections: v.array(
    v.object({
      heading: v.string(),
      paragraphs: v.array(v.string()),
      bullets: v.optional(v.array(v.string())),
    })
  ),
  faqItems: v.array(
    v.object({
      question: v.string(),
      answer: v.string(),
    })
  ),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  ctaText: v.string(),
  researchNotes: v.array(v.string()),
  published: v.boolean(),
  generatedBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  publishedAt: v.optional(v.string()),
})
  .index("by_slug", ["slug"])
  .index("by_published", ["published"])
  .index("by_published_slug", ["published", "slug"])
  .index("by_published_location_city", ["published", "locationCity"])
  .index("by_published_service_line", ["published", "serviceLine"])
  .index("by_published_location_city_service_line", [
    "published",
    "locationCity",
    "serviceLine",
  ])
  .index("by_location_city", ["locationCity"])
  .index("by_service_line", ["serviceLine"]);

/** Long-lived bearer tokens that let an MCP client act as a signed-in administrator. */
const mcpTokens = defineTable({
  hash: v.string(),
  prefix: v.string(),
  label: v.string(),
  userId: v.id("users"),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  sessionId: v.optional(v.id("authSessions")),
})
  .index("by_hash", ["hash"])
  .index("by_userId", ["userId"]);

const certificationFile = v.object({
  storageId: v.id("_storage"),
  name: v.string(),
  type: v.string(),
  size: v.number(),
  uploadedAt: v.number(),
  uploadedBy: v.id("users"),
});

/**
 * An instructor's own teaching credential (not a student completion
 * certificate). Keyed to the user, so every kind of instructor can hold one.
 */
const instructorCertifications = defineTable({
  userId: v.id("users"),
  agency: v.union(v.literal("arc"), v.literal("aha"), v.literal("other")),
  agencyOther: v.optional(v.string()),
  type: v.string(),
  typeOther: v.optional(v.string()),
  number: v.optional(v.string()),
  /** Calendar dates as YYYY-MM-DD; a card is valid through its expiration date. */
  issuedOn: v.string(),
  expiresOn: v.string(),
  card: v.optional(certificationFile),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.id("users")),
  createdAt: v.number(),
  createdBy: v.id("users"),
  updatedAt: v.number(),
  updatedBy: v.id("users"),
})
  .index("by_userId", ["userId"])
  .index("by_expiresOn", ["expiresOn"]);

/**
 * One row per reminder threshold for one expiration date. The row is the
 * idempotency key: reruns find it and never send twice, and a renewal (new
 * expiresOn) starts a fresh set.
 */
const instructorCertificationReminders = defineTable({
  certificationId: v.id("instructorCertifications"),
  userId: v.id("users"),
  expiresOn: v.string(),
  threshold: v.number(),
  state: v.union(
    v.literal("pending"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("failed"),
    v.literal("canceled")
  ),
  attempts: v.number(),
  recipient: v.string(),
  /** The date the reminder was queued; its email text is fixed to that day. */
  queuedOn: v.string(),
  createdAt: v.number(),
  claimedAt: v.optional(v.number()),
  sentAt: v.optional(v.number()),
  deliveredTo: v.optional(v.string()),
  providerId: v.optional(v.string()),
  error: v.optional(v.string()),
})
  .index("by_certificationId_and_expiresOn_and_threshold", [
    "certificationId",
    "expiresOn",
    "threshold",
  ])
  .index("by_userId", ["userId"]);

const instructorCertificationActivity = defineTable({
  userId: v.id("users"),
  certificationId: v.optional(v.id("instructorCertifications")),
  actor: v.id("users"),
  action: v.string(),
  detail: v.string(),
  at: v.number(),
})
  .index("by_userId_and_at", ["userId", "at"])
  .index("by_at", ["at"]);

/** One weekly staff digest per week start date, so a rerun never resends. */
const instructorCertificationDigests = defineTable({
  week: v.string(),
  recipient: v.string(),
  count: v.number(),
  attempts: v.number(),
  state: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
  error: v.optional(v.string()),
}).index("by_week", ["week"]);

const schema = defineSchema({
  ...authTables,
  ...registrationTables,

  // Production accounts retain the names captured during instructor onboarding.
  users: defineTable({
    ...authTables.users.validator.fields,
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  mcpTokens,

  instructorCertifications,
  instructorCertificationReminders,
  instructorCertificationActivity,
  instructorCertificationDigests,

  onboarding_steps: onboardingSteps,
  seo_pages: seoPages,

  /** Admin-issued instructor invitations; accepting one is how an account becomes an instructor. */
  instructorInvitations: defineTable({
    email: v.string(),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedBy: v.optional(v.id("users")),
    revokedAt: v.optional(v.number()),
    /** Delivery outcome of the latest send attempt; absent while queued. */
    attempt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    sendError: v.optional(v.string()),
    /** Accepting makes them teach for us (`profiles.isInstructor`). Absent means true. */
    teaches: v.optional(v.boolean()),
    /** Accepting marks them aligned with our Training Site for these courses. */
    courseIds: v.optional(v.array(v.id("registrationCourses"))),
    /** Legacy aligned-only invitations; alignmentMigration rewrites them to teaches: false. */
    kind: v.optional(v.literal("aligned")),
  }).index("by_email", ["email"]),

  ...alignedTables,

  profiles: defineTable({
    userId: v.id("users"), // Reference to auth users table
    isInstructor: v.boolean(),
    updatedAt: v.optional(v.string()),
    lastLogin: v.optional(v.string()),
    notifiedAt: v.optional(v.string()),
    deactivatedAt: v.optional(v.string()),
    /**
     * Aligned with our Training Site: may run independent sessions for these
     * courses. Independent of isInstructor, which means they teach for us.
     */
    alignment: v.optional(
      v.object({
        courseIds: v.array(v.id("registrationCourses")),
        since: v.number(),
        by: v.id("users"),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_instructor_status", ["isInstructor"])
    .index("by_deactivated", ["deactivatedAt"]),

  products: defineTable({
    originalCsvId: v.optional(v.number()),
    sku: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrls: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    type: v.string(), // 'digital' | 'aed' | 'ecard'
    requiresInstructor: v.boolean(),
    stripePriceId: v.optional(v.string()),
  })
    .index("by_type", ["type"])
    .index("by_requires_instructor", ["requiresInstructor"]),

  analytics: defineTable({
    url: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    ipAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_url", ["url"]),

  staging_profiles: defineTable({
    email: v.string(),
    supabaseUserId: v.string(), // Original Supabase auth.users.id
    isInstructor: v.boolean(),
    updatedAt: v.optional(v.string()),
    lastLogin: v.optional(v.string()),
    processedAt: v.optional(v.number()), // Timestamp when attached to Convex user
    convexUserId: v.optional(v.id("users")), // Set when attached
  })
    .index("by_email", ["email"])
    .index("by_supabase_id", ["supabaseUserId"])
    .index("by_processed", ["processedAt"]),
});

export default schema;
