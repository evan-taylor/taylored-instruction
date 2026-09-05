interface FallbackSection {
  bullets?: string[];
  heading: string;
  paragraphs: string[];
}

interface FallbackFaqItem {
  answer: string;
  question: string;
}

export interface FallbackSeoPage {
  audience: string;
  createdAt: string;
  ctaHref: string;
  ctaLabel: string;
  ctaText: string;
  excerpt: string;
  faqItems: FallbackFaqItem[];
  locationCity: string;
  locationLabel: string;
  locationRegion: string;
  locationState: string;
  metaDescription: string;
  metaTitle: string;
  primaryKeyword: string;
  publishedAt: string;
  readingTimeMinutes: number;
  researchNotes: string[];
  secondaryKeywords: string[];
  sections: FallbackSection[];
  serviceLine: string;
  slug: string;
  title: string;
  updatedAt: string;
}

interface FallbackLocation {
  city: string;
  label: string;
  nearbyAreas: string[];
  priorities: string[];
  region: string;
  seoWeight: "primary" | "secondary";
  slug: string;
  state: string;
}

interface FallbackService {
  audience: string;
  credential: string;
  ctaHref: string;
  serviceLine: string;
  shortName: string;
  slugPrefix: string;
  titleLabel: string;
}

const GENERATED_TIMESTAMP = "2026-03-15T00:00:00.000Z";

const fallbackLocations: FallbackLocation[] = [
  {
    city: "Vancouver",
    label: "Vancouver, WA",
    nearbyAreas: ["Salmon Creek", "Hazel Dell", "Camas", "Washougal"],
    priorities: [
      "healthcare staffing",
      "workplace preparedness",
      "family safety",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "vancouver-wa",
    state: "WA",
  },
  {
    city: "Vancouver",
    label: "Clark County, WA",
    nearbyAreas: ["Battle Ground", "Ridgefield", "La Center", "Camas"],
    priorities: ["distributed teams", "school safety", "community readiness"],
    region: "Clark County",
    seoWeight: "primary",
    slug: "clark-county-wa",
    state: "WA",
  },
  {
    city: "Camas",
    label: "Camas, WA",
    nearbyAreas: ["Prune Hill", "Washougal", "East Vancouver"],
    priorities: [
      "parent and caregiver training",
      "education staffing",
      "team renewals",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "camas-wa",
    state: "WA",
  },
  {
    city: "Washougal",
    label: "Washougal, WA",
    nearbyAreas: ["Camas", "East County", "Columbia corridor"],
    priorities: [
      "outdoor recreation safety",
      "workplace training",
      "youth program readiness",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "washougal-wa",
    state: "WA",
  },
  {
    city: "Battle Ground",
    label: "Battle Ground, WA",
    nearbyAreas: ["Hockinson", "Ridgefield", "North County"],
    priorities: [
      "growing residential demand",
      "small business safety",
      "school district staffing",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "battle-ground-wa",
    state: "WA",
  },
  {
    city: "Ridgefield",
    label: "Ridgefield, WA",
    nearbyAreas: ["Salmon Creek", "Battle Ground", "I-5 corridor"],
    priorities: [
      "new employer onboarding",
      "staff renewal cycles",
      "community event safety",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "ridgefield-wa",
    state: "WA",
  },
  {
    city: "Vancouver",
    label: "Hazel Dell, WA",
    nearbyAreas: ["North Vancouver", "Salmon Creek", "Downtown Vancouver"],
    priorities: [
      "retail and service teams",
      "community centers",
      "caregiver readiness",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "hazel-dell-wa",
    state: "WA",
  },
  {
    city: "Vancouver",
    label: "Salmon Creek, WA",
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
    region: "Clark County",
    seoWeight: "primary",
    slug: "salmon-creek-wa",
    state: "WA",
  },
  {
    city: "Vancouver",
    label: "Orchards, WA",
    nearbyAreas: ["Sifton", "Brush Prairie", "East Vancouver"],
    priorities: [
      "family neighborhoods",
      "childcare demand",
      "flexible scheduling",
    ],
    region: "Clark County",
    seoWeight: "primary",
    slug: "orchards-wa",
    state: "WA",
  },
  {
    city: "Vancouver",
    label: "Portland Metro (served from Vancouver)",
    nearbyAreas: ["North Portland", "Delta Park", "Jantzen Beach"],
    priorities: [
      "cross-river employers",
      "multi-site team training",
      "healthcare renewals",
    ],
    region: "Portland Metro",
    seoWeight: "primary",
    slug: "portland-metro-or",
    state: "OR/WA",
  },
  {
    city: "San Luis Obispo",
    label: "San Luis Obispo, CA",
    nearbyAreas: ["Cal Poly area", "Morro Bay", "Pismo Beach"],
    priorities: ["seasonal staffing", "campus readiness", "hospitality safety"],
    region: "San Luis Obispo County",
    seoWeight: "secondary",
    slug: "san-luis-obispo-ca",
    state: "CA",
  },
  {
    city: "Pismo Beach",
    label: "Pismo Beach, CA",
    nearbyAreas: ["Shell Beach", "Arroyo Grande", "Grover Beach"],
    priorities: [
      "tourism operations",
      "seasonal workforce onboarding",
      "waterfront safety",
    ],
    region: "San Luis Obispo County",
    seoWeight: "secondary",
    slug: "pismo-beach-ca",
    state: "CA",
  },
];

const fallbackServices: FallbackService[] = [
  {
    audience: "healthcare professionals and clinical support teams",
    credential: "AHA BLS Provider eCard",
    ctaHref: "/bls",
    serviceLine: "BLS Certification",
    shortName: "BLS",
    slugPrefix: "bls-certification",
    titleLabel: "AHA BLS Certification",
  },
  {
    audience: "employers, educators, coaches, and community responders",
    credential: "Red Cross First Aid/CPR/AED certification",
    ctaHref: "/first-aid-cpr-aed",
    serviceLine: "First Aid CPR AED",
    shortName: "First Aid CPR AED",
    slugPrefix: "first-aid-cpr-aed-classes",
    titleLabel: "First Aid / CPR / AED Certification",
  },
  {
    audience: "non-clinical professionals and organizational teams",
    credential: "AHA Heartsaver certification",
    ctaHref: "/heartsaver",
    serviceLine: "Heartsaver CPR AED",
    shortName: "Heartsaver",
    slugPrefix: "heartsaver-cpr-aed",
    titleLabel: "AHA Heartsaver CPR AED",
  },
  {
    audience: "operations leaders, HR teams, and safety coordinators",
    credential: "role-aligned group certification pathways",
    ctaHref: "/corporate-training",
    serviceLine: "Corporate Group Training",
    shortName: "Corporate CPR",
    slugPrefix: "corporate-cpr-training",
    titleLabel: "Corporate CPR & First Aid Group Training",
  },
  {
    audience: "facility and risk management leaders",
    credential: "AED readiness planning and response training",
    ctaHref: "/aeds",
    serviceLine: "AED Program Services",
    shortName: "AED Program",
    slugPrefix: "aed-program-services",
    titleLabel: "AED Program Planning & CPR Integration",
  },
  {
    audience: "aquatic staff and recreation teams",
    credential: "Red Cross Lifeguarding with CPR/AED",
    ctaHref: "/lifeguarding",
    serviceLine: "Lifeguarding Certification",
    shortName: "Lifeguarding",
    slugPrefix: "lifeguarding-certification",
    titleLabel: "Lifeguarding Certification",
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
      bullets: [
        `Audience focus: ${service.audience}`,
        `Credential pathway: ${service.credential}`,
        `Nearby service coverage: ${location.nearbyAreas.join(", ")}`,
      ],
      heading: `${service.shortName} training in ${location.label}`,
      paragraphs: [
        `${service.titleLabel} in ${location.label} should be practical, scenario-based, and aligned to the way local teams actually operate. Taylored Instruction focuses on hands-on competency and repeatable response behaviors rather than checkbox-only completion.`,
        `Learners in ${location.region} often ask for options that balance quality with flexible schedules. This resource is designed to help organizations and individuals choose a training pathway that improves both compliance and real-world readiness.`,
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
      bullets: [
        "Map credential requirements by role",
        "Schedule classes before expiration bottlenecks",
        "Practice realistic emergency scenarios",
        "Review AED and first aid readiness quarterly",
      ],
      heading: "Implementation checklist",
      paragraphs: [
        "Use this framework to turn certification into ongoing operational readiness:",
      ],
    },
  ];

  const faqItems: FallbackFaqItem[] = [
    {
      answer: `This training is best for ${service.audience} and any team members expected to respond during medical emergencies.`,
      question: `Who should take ${service.shortName} classes in ${location.label}?`,
    },
    {
      answer:
        "Yes. Group and private options can be arranged to match staffing patterns, shift schedules, and role-specific requirements.",
      question: "Can group training be scheduled for our organization?",
    },
    {
      answer:
        "Track expiration windows proactively, schedule renewal cohorts, and include periodic practice drills between formal certification cycles.",
      question: "How can we keep certifications current across teams?",
    },
  ];

  return {
    audience: service.audience,
    createdAt: GENERATED_TIMESTAMP,
    ctaHref: service.ctaHref,
    ctaLabel: "Explore training options",
    ctaText: `Need ${service.shortName} support in ${location.label}? Taylored Instruction can help you build a practical, repeatable training plan.`,
    excerpt: `Local ${service.shortName} guidance for ${location.label}, with practical recommendations for individuals and teams.`,
    faqItems,
    locationCity: location.city,
    locationLabel: location.label,
    locationRegion: location.region,
    locationState: location.state,
    metaDescription: `Professional ${service.shortName} training in ${location.label}. Build confident responders with practical certification pathways and local readiness focus.`,
    metaTitle: `${title} | Taylored Instruction`,
    primaryKeyword,
    publishedAt: GENERATED_TIMESTAMP,
    readingTimeMinutes: 6,
    researchNotes: [
      "AHA CPR resources: https://cpr.heart.org/",
      "Red Cross classes: https://www.redcross.org/take-a-class",
      "OSHA first aid standards: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.151",
    ],
    secondaryKeywords,
    sections,
    serviceLine: service.serviceLine,
    slug,
    title,
    updatedAt: GENERATED_TIMESTAMP,
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
    excerpt: page.excerpt,
    locationCity: page.locationCity,
    locationLabel: page.locationLabel,
    metaDescription: page.metaDescription,
    primaryKeyword: page.primaryKeyword,
    publishedAt: page.publishedAt,
    readingTimeMinutes: page.readingTimeMinutes,
    serviceLine: page.serviceLine,
    slug: page.slug,
    title: page.title,
    updatedAt: page.updatedAt,
  }));
