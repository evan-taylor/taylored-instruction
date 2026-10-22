import type { CourseMatch } from "@/shared/registration/catalog";

/**
 * Marketing page → registration course templates. Slugs follow the Hovn
 * catalog the templates were imported from; keywords cover renamed templates.
 */
const catalog = {
  bls: {
    slugs: ["aha-bls-provider-2025", "aha-basic-life-support", "aha-bls"],
    keywords: ["bls provider", "aha bls", "basic life support"],
    exclude: ["instructor", "red cross"],
  },
  "basic-life-support": {
    slugs: ["arc-basic-life-support", "arc-bls"],
    keywords: ["red cross basic life support", "red cross bls"],
    exclude: ["instructor"],
  },
  heartsaver: {
    slugs: [
      "aha-heartsaver-first-aid-cpr-aed-2025",
      "aha-heartsaver-first-aid-cpr-aed",
    ],
    keywords: ["heartsaver"],
    exclude: ["instructor"],
  },
  "first-aid-cpr-aed": {
    slugs: [
      "arc-adult-and-pediatric-first-aid-cpr-aed-bl-r25",
      "arc-adult-and-pediatric-first-aid-cpr-aed",
    ],
    keywords: [
      "first aid/cpr/aed",
      "first aid cpr aed",
      "first aid, cpr",
      "adult and pediatric",
    ],
    exclude: ["instructor", "heartsaver", "lifeguard"],
  },
  lifeguarding: {
    slugs: [
      "arc-lifeguarding-blended",
      "arc-lifeguarding",
      "arc-lifeguarding-recertification-blended",
      "arc-lifeguarding-recertification",
    ],
    keywords: ["lifeguarding", "lifeguard"],
    exclude: ["instructor", "trainer"],
  },
  "lifeguarding-instructor": {
    slugs: [
      "arc-lifeguarding-instructor-blended",
      "arc-lifeguarding-instructor",
    ],
    keywords: ["lifeguarding instructor", "lifeguard instructor"],
    exclude: ["trainer"],
  },
  "aha-instructor-training": {
    slugs: [
      "aha-bls-instructor-2025",
      "aha-bls-instructor",
      "aha-heartsaver-instructor",
    ],
    keywords: ["bls instructor", "heartsaver instructor", "aha instructor"],
  },
  "fa-cpr-aed-instructor": {
    slugs: [
      "arc-first-aid-cpr-aed-instructor-r25",
      "arc-first-aid-cpr-aed-instructor",
    ],
    keywords: [
      "first aid/cpr/aed instructor",
      "first aid cpr aed instructor",
      "fa/cpr/aed instructor",
    ],
  },
} as const;

export type CourseKey = keyof typeof catalog;
export const COURSE_CATALOG: Record<CourseKey, CourseMatch> = catalog;
