import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"), // Reference to auth users table
    isInstructor: v.boolean(),
    updatedAt: v.optional(v.string()),
    lastLogin: v.optional(v.string()),
    notifiedAt: v.optional(v.string()),
    deactivatedAt: v.optional(v.string()),
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

  email_otps: defineTable({
    email: v.string(),
    codeHash: v.string(), // Hashed 6-digit code
    salt: v.string(), // Random salt for hashing
    callbackUrl: v.string(), // Provider callback URL to complete auth
    expiresAt: v.number(), // Timestamp when code expires
    createdAt: v.number(), // Timestamp when code was created
    consumed: v.boolean(), // Whether code has been used
    attempts: v.number(), // Number of verification attempts
    lastSentAt: v.number(), // Timestamp of last send (for rate limiting)
    ipAddress: v.optional(v.string()), // IP for rate limiting
    userAgent: v.optional(v.string()), // User agent for tracking
  })
    .index("by_email", ["email"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_email_and_consumed", ["email", "consumed"]),
});

export default schema;
