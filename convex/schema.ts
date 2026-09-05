import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const onboardingSteps = defineTable({
  content: v.string(),
  createdAt: v.string(),
  createdBy: v.string(),
  order: v.number(),
  title: v.string(),
  updatedAt: v.string(),
})
  .index("by_order", ["order"])
  .index("by_created_at", ["createdAt"]);

const seoPages = defineTable({
  audience: v.string(),
  createdAt: v.string(),
  ctaHref: v.string(),
  ctaLabel: v.string(),
  ctaText: v.string(),
  excerpt: v.string(),
  faqItems: v.array(
    v.object({
      answer: v.string(),
      question: v.string(),
    })
  ),
  generatedBy: v.string(),
  locationCity: v.string(),
  locationLabel: v.string(),
  locationRegion: v.string(),
  locationState: v.string(),
  metaDescription: v.string(),
  metaTitle: v.string(),
  primaryKeyword: v.string(),
  published: v.boolean(),
  publishedAt: v.optional(v.string()),
  readingTimeMinutes: v.number(),
  researchNotes: v.array(v.string()),
  secondaryKeywords: v.array(v.string()),
  sections: v.array(
    v.object({
      bullets: v.optional(v.array(v.string())),
      heading: v.string(),
      paragraphs: v.array(v.string()),
    })
  ),
  serviceLine: v.string(),
  slug: v.string(),
  title: v.string(),
  updatedAt: v.string(),
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

const schema = defineSchema({
  ...authTables,

  analytics: defineTable({
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    referrer: v.optional(v.string()),
    region: v.optional(v.string()),
    url: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_url", ["url"]),

  onboarding_steps: onboardingSteps,

  products: defineTable({
    categories: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    imageUrls: v.optional(v.string()),
    name: v.string(),
    originalCsvId: v.optional(v.number()),
    requiresInstructor: v.boolean(),
    sku: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    type: v.string(), // 'digital' | 'aed' | 'ecard'
  })
    .index("by_type", ["type"])
    .index("by_requires_instructor", ["requiresInstructor"]),

  profiles: defineTable({
    deactivatedAt: v.optional(v.string()),
    isInstructor: v.boolean(),
    lastLogin: v.optional(v.string()),
    notifiedAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    userId: v.id("users"), // Reference to auth users table
  })
    .index("by_user", ["userId"])
    .index("by_instructor_status", ["isInstructor"])
    .index("by_deactivated", ["deactivatedAt"]),
  seo_pages: seoPages,

  staging_profiles: defineTable({
    convexUserId: v.optional(v.id("users")), // Set when attached
    email: v.string(),
    isInstructor: v.boolean(),
    lastLogin: v.optional(v.string()),
    processedAt: v.optional(v.number()), // Timestamp when attached to Convex user
    supabaseUserId: v.string(), // Original Supabase auth.users.id
    updatedAt: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_supabase_id", ["supabaseUserId"])
    .index("by_processed", ["processedAt"]),
});

export default schema;
