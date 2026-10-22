import type { CourseMatch } from "@/shared/registration/catalog";

/**
 * Marketing page → native registration course templates. Exact slugs match
 * the live catalog; keywords cover later title and slug edits.
 */
const catalog = {
  "water-safety-instructor": {
    slugs: ["water-safety-instructor"],
    keywords: ["water safety instructor"],
    exclude: ["trainer"],
  },
  bls: {
    slugs: ["bls-provider", "heartcode-bls-online-provider"],
    keywords: ["bls provider", "heartcode", "aha bls", "basic life support"],
    exclude: ["instructor", "red cross"],
  },
  "basic-life-support": {
    slugs: [],
    keywords: ["red cross basic life support", "red cross bls"],
    exclude: ["instructor"],
  },
  heartsaver: {
    slugs: [],
    keywords: ["heartsaver"],
    exclude: ["instructor"],
  },
  "first-aid-cpr-aed": {
    slugs: ["adult-pediatric-first-aid-cpr-aed-blended"],
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
      "lifeguarding-blended",
      "shallow-water-lifeguarding-to-lifeguarding",
    ],
    keywords: ["lifeguarding", "lifeguard"],
    exclude: ["instructor", "trainer"],
  },
  "lifeguarding-instructor": {
    slugs: [
      "lifeguarding-instructor",
      "lifeguarding-instructor-instructor-trainer-recertification",
    ],
    keywords: ["lifeguarding instructor", "lifeguard instructor"],
  },
  "aha-instructor-training": {
    slugs: ["bls-instructor-essentials-online-core"],
    keywords: ["bls instructor", "heartsaver instructor", "aha instructor"],
  },
  "fa-cpr-aed-instructor": {
    slugs: ["first-aid-cpr-aed-instructor"],
    keywords: [
      "first aid/cpr/aed instructor",
      "first aid cpr aed instructor",
      "fa/cpr/aed instructor",
    ],
  },
} as const;

export type CourseKey = keyof typeof catalog;
export const COURSE_CATALOG: Record<CourseKey, CourseMatch> = catalog;
