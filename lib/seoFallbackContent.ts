type FallbackSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

type FallbackFaqItem = {
  question: string;
  answer: string;
};

export type FallbackSeoPage = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  locationLabel: string;
  locationCity: string;
  locationRegion: string;
  locationState: string;
  serviceLine: string;
  audience: string;
  readingTimeMinutes: number;
  sections: FallbackSection[];
  faqItems: FallbackFaqItem[];
  ctaLabel: string;
  ctaHref: string;
  ctaText: string;
  researchNotes: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

type FallbackLocation = {
  slug: string;
  label: string;
  city: string;
  region: string;
  state: string;
  nearbyAreas: string[];
  priorities: string[];
  seoWeight: "primary" | "secondary";
};

type FallbackService = {
  slugPrefix: string;
  serviceLine: string;
  shortName: string;
  titleLabel: string;
  audience: string;
  credential: string;
  ctaHref: string;
};

const GENERATED_TIMESTAMP = "2026-03-15T00:00:00.000Z";

const fallbackLocations: FallbackLocation[] = [
  {
    slug: "vancouver-wa",
    label: "Vancouver, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Salmon Creek", "Hazel Dell", "Camas", "Washougal"],
    priorities: [
      "healthcare staffing",
      "workplace preparedness",
      "family safety",
    ],
    seoWeight: "primary",
  },
  {
    slug: "clark-county-wa",
    label: "Clark County, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Battle Ground", "Ridgefield", "La Center", "Camas"],
    priorities: ["distributed teams", "school safety", "community readiness"],
    seoWeight: "primary",
  },
  {
    slug: "camas-wa",
    label: "Camas, WA",
    city: "Camas",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Prune Hill", "Washougal", "East Vancouver"],
    priorities: [
      "parent and caregiver training",
      "education staffing",
      "team renewals",
    ],
    seoWeight: "primary",
  },
  {
    slug: "washougal-wa",
    label: "Washougal, WA",
    city: "Washougal",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Camas", "East County", "Columbia corridor"],
    priorities: [
      "outdoor recreation safety",
      "workplace training",
      "youth program readiness",
    ],
    seoWeight: "primary",
  },
  {
    slug: "battle-ground-wa",
    label: "Battle Ground, WA",
    city: "Battle Ground",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Hockinson", "Ridgefield", "North County"],
    priorities: [
      "growing residential demand",
      "small business safety",
      "school district staffing",
    ],
    seoWeight: "primary",
  },
  {
    slug: "ridgefield-wa",
    label: "Ridgefield, WA",
    city: "Ridgefield",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Salmon Creek", "Battle Ground", "I-5 corridor"],
    priorities: [
      "new employer onboarding",
      "staff renewal cycles",
      "community event safety",
    ],
    seoWeight: "primary",
  },
  {
    slug: "hazel-dell-wa",
    label: "Hazel Dell, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["North Vancouver", "Salmon Creek", "Downtown Vancouver"],
    priorities: [
      "retail and service teams",
      "community centers",
      "caregiver readiness",
    ],
    seoWeight: "primary",
  },
  {
    slug: "salmon-creek-wa",
    label: "Salmon Creek, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Legacy Salmon Creek area",
      "Felida",
      "Hazel Dell",
      "Ridgefield",
    ],
    priorities: [
      "healthcare-adjacent workforce",
      "caregiver readiness",
      "AED readiness",
    ],
    seoWeight: "primary",
  },
  {
    slug: "orchards-wa",
    label: "Orchards, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: ["Sifton", "Brush Prairie", "East Vancouver"],
    priorities: [
      "family neighborhoods",
      "childcare demand",
      "flexible scheduling",
    ],
    seoWeight: "primary",
  },
  {
    slug: "portland-metro-or",
    label: "Portland Metro (served from Vancouver)",
    city: "Vancouver",
    region: "Portland Metro",
    state: "OR/WA",
    nearbyAreas: ["North Portland", "Delta Park", "Jantzen Beach"],
    priorities: [
      "cross-river employers",
      "multi-site team training",
      "healthcare renewals",
    ],
    seoWeight: "primary",
  },
  {
    slug: "san-luis-obispo-ca",
    label: "San Luis Obispo, CA",
    city: "San Luis Obispo",
    region: "San Luis Obispo County",
    state: "CA",
    nearbyAreas: ["Cal Poly area", "Morro Bay", "Pismo Beach"],
    priorities: ["seasonal staffing", "campus readiness", "hospitality safety"],
    seoWeight: "secondary",
  },
  {
    slug: "pismo-beach-ca",
    label: "Pismo Beach, CA",
    city: "Pismo Beach",
    region: "San Luis Obispo County",
    state: "CA",
    nearbyAreas: ["Shell Beach", "Arroyo Grande", "Grover Beach"],
    priorities: [
      "tourism operations",
      "seasonal workforce onboarding",
      "waterfront safety",
    ],
    seoWeight: "secondary",
  },
];

const fallbackServices: FallbackService[] = [
  {
    slugPrefix: "bls-certification",
    serviceLine: "BLS Certification",
    shortName: "BLS",
    titleLabel: "AHA BLS Certification",
    audience: "healthcare professionals and clinical support teams",
    credential: "AHA BLS Provider eCard",
    ctaHref: "/bls",
  },
  {
    slugPrefix: "first-aid-cpr-aed-classes",
    serviceLine: "First Aid CPR AED",
    shortName: "First Aid CPR AED",
    titleLabel: "First Aid / CPR / AED Certification",
    audience: "employers, educators, coaches, and community responders",
    credential: "Red Cross First Aid/CPR/AED certification",
    ctaHref: "/first-aid-cpr-aed",
  },
  {
    slugPrefix: "heartsaver-cpr-aed",
    serviceLine: "Heartsaver CPR AED",
    shortName: "Heartsaver",
    titleLabel: "AHA Heartsaver CPR AED",
    audience: "non-clinical professionals and organizational teams",
    credential: "AHA Heartsaver certification",
    ctaHref: "/heartsaver",
  },
  {
    slugPrefix: "corporate-cpr-training",
    serviceLine: "Corporate Group Training",
    shortName: "Corporate CPR",
    titleLabel: "Corporate CPR & First Aid Group Training",
    audience: "operations leaders, HR teams, and safety coordinators",
    credential: "role-aligned group certification pathways",
    ctaHref: "/corporate-training",
  },
  {
    slugPrefix: "aed-program-services",
    serviceLine: "AED Program Services",
    shortName: "AED Program",
    titleLabel: "AED Program Planning & CPR Integration",
    audience: "facility and risk management leaders",
    credential: "AED readiness planning and response training",
    ctaHref: "/aeds",
  },
  {
    slugPrefix: "lifeguarding-certification",
    serviceLine: "Lifeguarding Certification",
    shortName: "Lifeguarding",
    titleLabel: "Lifeguarding Certification",
    audience: "aquatic staff and recreation teams",
    credential: "Red Cross Lifeguarding with CPR/AED",
    ctaHref: "/lifeguarding",
  },
];

const buildFallbackPage = (
  location: FallbackLocation,
  service: FallbackService
): FallbackSeoPage => {
  const slug = `${service.slugPrefix}-${location.slug}`;
  const title = `${service.titleLabel} in ${location.label}`;
  const primaryKeyword = `${service.shortName} classes ${location.label}`;
  const secondaryKeywords = [
    `${service.shortName} training ${location.city}`,
    `${service.shortName} renewal ${location.region}`,
    `${service.serviceLine.toLowerCase()} ${location.label}`,
    `${service.shortName} certification near ${location.city}`,
    `same-day certification ${location.label}`,
  ];

  const sections: FallbackSection[] = [
    {
      heading: `${service.shortName} training in ${location.label}`,
      paragraphs: [
        `${service.titleLabel} in ${location.label} should be practical, scenario-based, and aligned to the way local teams actually operate. Taylored Instruction focuses on hands-on competency and repeatable response behaviors rather than checkbox-only completion.`,
        `Learners in ${location.region} often ask for options that balance quality with flexible schedules. This resource is designed to help organizations and individuals choose a training pathway that improves both compliance and real-world readiness.`,
      ],
      bullets: [
        `Audience focus: ${service.audience}`,
        `Credential pathway: ${service.credential}`,
        `Nearby service coverage: ${location.nearbyAreas.join(", ")}`,
      ],
    },
    {
      heading: "Why this matters for local employers and teams",
      paragraphs: [
        `In ${location.label}, preparedness priorities often include ${location.priorities.join(", ")}. Building a reliable response culture starts with role-specific training and clear emergency action expectations.`,
        "High-quality programs pair certification tracking with practical drills, refreshers, and response communication planning so teams stay confident between renewal cycles.",
      ],
    },
    {
      heading: "Implementation checklist",
      paragraphs: [
        "Use this framework to turn certification into ongoing operational readiness:",
      ],
      bullets: [
        "Map credential requirements by role",
        "Schedule classes before expiration bottlenecks",
        "Practice realistic emergency scenarios",
        "Review AED and first aid readiness quarterly",
      ],
    },
  ];

  const faqItems: FallbackFaqItem[] = [
    {
      question: `Who should take ${service.shortName} classes in ${location.label}?`,
      answer: `This training is best for ${service.audience} and any team members expected to respond during medical emergencies.`,
    },
    {
      question: "Can group training be scheduled for our organization?",
      answer:
        "Yes. Group and private options can be arranged to match staffing patterns, shift schedules, and role-specific requirements.",
    },
    {
      question: "How can we keep certifications current across teams?",
      answer:
        "Track expiration windows proactively, schedule renewal cohorts, and include periodic practice drills between formal certification cycles.",
    },
  ];

  return {
    slug,
    title,
    metaTitle: `${title} | Taylored Instruction`,
    metaDescription: `Professional ${service.shortName} training in ${location.label}. Build confident responders with practical certification pathways and local readiness focus.`,
    excerpt: `Local ${service.shortName} guidance for ${location.label}, with practical recommendations for individuals and teams.`,
    primaryKeyword,
    secondaryKeywords,
    locationLabel: location.label,
    locationCity: location.city,
    locationRegion: location.region,
    locationState: location.state,
    serviceLine: service.serviceLine,
    audience: service.audience,
    readingTimeMinutes: 6,
    sections,
    faqItems,
    ctaLabel: "Explore training options",
    ctaHref: service.ctaHref,
    ctaText: `Need ${service.shortName} support in ${location.label}? Taylored Instruction can help you build a practical, repeatable training plan.`,
    researchNotes: [
      "AHA CPR resources: https://cpr.heart.org/",
      "Red Cross classes: https://www.redcross.org/take-a-class",
      "OSHA first aid standards: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.151",
    ],
    createdAt: GENERATED_TIMESTAMP,
    updatedAt: GENERATED_TIMESTAMP,
    publishedAt: GENERATED_TIMESTAMP,
  };
};

const fallbackPages: FallbackSeoPage[] = fallbackLocations.flatMap((location) =>
  fallbackServices
    .filter((service) =>
      location.seoWeight === "secondary"
        ? service.serviceLine !== "Lifeguarding Certification" ||
          location.city === "San Luis Obispo"
        : true
    )
    .map((service) => buildFallbackPage(location, service))
);

export const getFallbackSeoPages = () => fallbackPages;

export const getFallbackSeoPageBySlug = (slug: string) =>
  fallbackPages.find((page) => page.slug === slug) ?? null;

export const getFallbackSeoPageSummaries = () =>
  fallbackPages.map((page) => ({
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt,
    metaDescription: page.metaDescription,
    primaryKeyword: page.primaryKeyword,
    locationLabel: page.locationLabel,
    locationCity: page.locationCity,
    serviceLine: page.serviceLine,
    readingTimeMinutes: page.readingTimeMinutes,
    updatedAt: page.updatedAt,
    publishedAt: page.publishedAt,
  }));
