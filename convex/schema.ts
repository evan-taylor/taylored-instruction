import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

const schema = defineSchema({
  ...authTables,

  onboarding_steps: onboardingSteps,
  seo_pages: seoPages,

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
});

export default schema;
