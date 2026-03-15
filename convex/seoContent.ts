import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { isAdminEmail } from "../shared/adminEmails";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";

const READING_TIME_WORDS_PER_MINUTE = 200;
const MINIMUM_READING_TIME_MINUTES = 4;
const WORD_SEPARATOR_REGEX = /\s+/;
const DEFAULT_PUBLISHED_PAGES_LIMIT = 1000;
const MAX_PUBLISHED_PAGES_LIMIT = 1000;
const MAX_PUBLISHED_PAGES_SCAN_LIMIT = 1000;
const MAX_ADMIN_PAGES_SCAN_LIMIT = 2000;
const DEFAULT_GENERATION_BATCH_SIZE = 100;
const MAX_GENERATION_BATCH_SIZE = 250;
const ESTIMATED_DB_OPERATIONS_PER_TEMPLATE = 2;
const MAX_ESTIMATED_BATCH_DB_OPERATIONS = 700;

const BASE_RESEARCH_NOTES = [
  "American Heart Association CPR & ECC guidance: https://cpr.heart.org/",
  "American Red Cross training overview: https://www.redcross.org/take-a-class",
  "OSHA first aid standard (29 CFR 1910.151): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.151",
  "CDC emergency preparedness resources: https://www.cdc.gov/cpr/index.htm",
  "FEMA/Ready preparedness guidance: https://www.ready.gov/",
] as const;

type LocationProfile = {
  slug: string;
  label: string;
  city: string;
  region: string;
  state: string;
  nearbyAreas: string[];
  localDemandSignals: string[];
  seasonalRisks: string[];
  localReference: string;
  seoWeight: "primary" | "secondary";
};

type ServiceProfile = {
  slugPrefix: string;
  serviceLine: string;
  titleLabel: string;
  shortName: string;
  audience: string;
  credential: string;
  classFormats: string[];
  commonUseCases: string[];
  complianceNotes: string[];
  ctaHref: string;
  faqTemplates: Array<{
    question: string;
    answer: (location: LocationProfile) => string;
  }>;
};

type GeneratedPage = {
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
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  ctaLabel: string;
  ctaHref: string;
  ctaText: string;
  researchNotes: string[];
};

const LOCATION_PROFILES: LocationProfile[] = [
  {
    slug: "vancouver-wa",
    label: "Vancouver, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Downtown Vancouver",
      "East Vancouver",
      "Salmon Creek",
      "Hazel Dell",
      "Camas",
      "Washougal",
    ],
    localDemandSignals: [
      "cross-state commuter workforce tied to Portland healthcare and service jobs",
      "growing family population and youth programs across Clark County",
      "active construction, logistics, and warehouse operations along key corridors",
    ],
    seasonalRisks: [
      "summer outdoor recreation and riverfront activity",
      "heat and wildfire smoke periods affecting vulnerable populations",
      "winter storm and power-outage preparedness needs",
    ],
    localReference: "Clark County, WA: https://www.clark.wa.gov/",
    seoWeight: "primary",
  },
  {
    slug: "clark-county-wa",
    label: "Clark County, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Battle Ground",
      "Ridgefield",
      "La Center",
      "Camas",
      "Washougal",
      "Yacolt",
    ],
    localDemandSignals: [
      "county-wide schools, employers, and athletic facilities requiring certified responders",
      "distributed workforce that benefits from on-site and mobile training delivery",
      "mix of urban and rural communities with varied emergency response timelines",
    ],
    seasonalRisks: [
      "summer event season with large community gatherings",
      "air quality impacts from regional wildfire smoke",
      "winter driving and weather-related incident risk",
    ],
    localReference:
      "Clark County Public Health: https://www.clark.wa.gov/public-health",
    seoWeight: "primary",
  },
  {
    slug: "camas-wa",
    label: "Camas, WA",
    city: "Camas",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Downtown Camas",
      "Prune Hill",
      "Fisher Basin",
      "Washougal",
      "East Vancouver",
    ],
    localDemandSignals: [
      "active school, youth sports, and recreation community",
      "commuter professionals and healthcare workers needing renewal certifications",
      "small businesses prioritizing workplace safety and response readiness",
    ],
    seasonalRisks: [
      "summer camps and pool activity increasing lifeguard and CPR demand",
      "hiking and trail season with first aid relevance",
      "winter weather disruptions requiring prepared teams",
    ],
    localReference: "City of Camas: https://www.cityofcamas.us/",
    seoWeight: "primary",
  },
  {
    slug: "washougal-wa",
    label: "Washougal, WA",
    city: "Washougal",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Downtown Washougal",
      "Steigerwald area",
      "Camas",
      "East County communities",
    ],
    localDemandSignals: [
      "outdoor-oriented families and recreation programs",
      "local employers and community organizations needing practical first aid skills",
      "cross-city commuting patterns that favor predictable class scheduling",
    ],
    seasonalRisks: [
      "water recreation and river-adjacent activity",
      "summer outdoor events and heat risk",
      "winter travel and preparedness challenges",
    ],
    localReference: "City of Washougal: https://www.cityofwashougal.us/",
    seoWeight: "primary",
  },
  {
    slug: "battle-ground-wa",
    label: "Battle Ground, WA",
    city: "Battle Ground",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Downtown Battle Ground",
      "Hockinson",
      "North Clark County",
      "Ridgefield",
    ],
    localDemandSignals: [
      "rapid residential growth and family-focused community facilities",
      "expanding local employers needing CPR and AED readiness",
      "strong demand for blended and weekend certification options",
    ],
    seasonalRisks: [
      "summer camp and youth activity season",
      "rural/edge-of-urban travel distances affecting emergency timelines",
      "winter weather and outage preparedness",
    ],
    localReference: "City of Battle Ground: https://www.cityofbg.org/",
    seoWeight: "primary",
  },
  {
    slug: "ridgefield-wa",
    label: "Ridgefield, WA",
    city: "Ridgefield",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Downtown Ridgefield",
      "North Ridgefield developments",
      "Salmon Creek",
      "Battle Ground",
    ],
    localDemandSignals: [
      "new schools, childcare centers, and community facilities",
      "business growth along I-5 corridor requiring safety training",
      "mixed commuter and local workforce with recurring renewal needs",
    ],
    seasonalRisks: [
      "summer sports and community events",
      "air quality events from regional smoke",
      "winter travel and severe weather preparation",
    ],
    localReference: "City of Ridgefield: https://ridgefieldwa.us/",
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
    localDemandSignals: [
      "strong healthcare-adjacent workforce demand for BLS renewals",
      "growing senior and family populations needing caregiver preparedness",
      "high traffic corridor with organizations prioritizing AED readiness",
    ],
    seasonalRisks: [
      "community event season and outdoor activity",
      "summer heat and air quality concerns",
      "winter weather disruptions",
    ],
    localReference:
      "Clark County Public Health: https://www.clark.wa.gov/public-health",
    seoWeight: "primary",
  },
  {
    slug: "hazel-dell-wa",
    label: "Hazel Dell, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Hazel Dell North",
      "Hazel Dell South",
      "Downtown Vancouver",
      "Salmon Creek",
    ],
    localDemandSignals: [
      "retail and service-heavy workforce requiring first aid readiness",
      "community organizations serving diverse age groups",
      "small employers needing practical and affordable group training",
    ],
    seasonalRisks: [
      "summer event and youth programming",
      "heat and smoke exposure events",
      "winter weather and outage response needs",
    ],
    localReference: "Clark County, WA: https://www.clark.wa.gov/",
    seoWeight: "primary",
  },
  {
    slug: "orchards-wa",
    label: "Orchards, WA",
    city: "Vancouver",
    region: "Clark County",
    state: "WA",
    nearbyAreas: [
      "Orchards neighborhood",
      "Sifton",
      "Brush Prairie",
      "East Vancouver",
    ],
    localDemandSignals: [
      "family neighborhoods and childcare demand for CPR-ready staff",
      "local businesses that benefit from workplace emergency plans",
      "consistent need for flexible evening and weekend classes",
    ],
    seasonalRisks: [
      "summer camps and outdoor activities",
      "air quality events requiring respiratory awareness",
      "winter incident prevention and response planning",
    ],
    localReference: "Clark County, WA: https://www.clark.wa.gov/",
    seoWeight: "primary",
  },
  {
    slug: "portland-metro-or",
    label: "Portland Metro (serving from Vancouver, WA)",
    city: "Vancouver",
    region: "Portland Metro",
    state: "OR/WA",
    nearbyAreas: [
      "North Portland",
      "Jantzen Beach",
      "Delta Park",
      "Vancouver waterfront",
    ],
    localDemandSignals: [
      "cross-river teams needing training close to I-5 and I-205 access",
      "healthcare and hospitality employers with recurring certification cycles",
      "multi-site businesses seeking standardized group training",
    ],
    seasonalRisks: [
      "large summer events and tourism activity",
      "high heat days and vulnerable worker exposure",
      "winter commute risk and weather preparedness",
    ],
    localReference: "Metro Region (OR): https://www.oregonmetro.gov/",
    seoWeight: "primary",
  },
  {
    slug: "san-luis-obispo-ca",
    label: "San Luis Obispo, CA",
    city: "San Luis Obispo",
    region: "San Luis Obispo County",
    state: "CA",
    nearbyAreas: [
      "Cal Poly area",
      "Downtown SLO",
      "Morro Bay",
      "Pismo Beach",
      "Arroyo Grande",
    ],
    localDemandSignals: [
      "seasonal tourism and hospitality workforce changes",
      "campus and youth-serving organizations with CPR requirements",
      "coastal recreation and water-safety training demand",
    ],
    seasonalRisks: [
      "summer coastal activity and event density",
      "heat and wildfire season preparedness",
      "holiday travel and event response planning",
    ],
    localReference: "San Luis Obispo County: https://www.slocounty.ca.gov/",
    seoWeight: "secondary",
  },
  {
    slug: "pismo-beach-ca",
    label: "Pismo Beach, CA",
    city: "Pismo Beach",
    region: "San Luis Obispo County",
    state: "CA",
    nearbyAreas: [
      "Shell Beach",
      "Arroyo Grande",
      "Grover Beach",
      "San Luis Obispo",
    ],
    localDemandSignals: [
      "hospitality and visitor-serving employers with safety training needs",
      "seasonal staffing patterns requiring rapid onboarding",
      "coastal recreation environments where CPR and first aid readiness matters",
    ],
    seasonalRisks: [
      "summer tourism peak and beach activity",
      "coastal weather variation and outdoor-event incidents",
      "wildfire smoke and heat readiness",
    ],
    localReference: "City of Pismo Beach: https://www.pismobeach.org/",
    seoWeight: "secondary",
  },
];

const SERVICE_PROFILES: ServiceProfile[] = [
  {
    slugPrefix: "bls-certification",
    serviceLine: "BLS Certification",
    titleLabel: "AHA BLS Certification",
    shortName: "BLS",
    audience:
      "healthcare professionals, first responders, and clinical support teams",
    credential: "AHA Basic Life Support Provider eCard",
    classFormats: [
      "in-person instructor-led sessions",
      "blended learning with online coursework and in-person skills check",
    ],
    commonUseCases: [
      "new hire onboarding for clinics and healthcare facilities",
      "renewal for nurses, medical assistants, EMTs, and allied health teams",
      "compliance support for staffing agencies and healthcare employers",
    ],
    complianceNotes: [
      "Most employers require active BLS credentials for direct patient care roles.",
      "Renewal timelines are commonly every two years, but employers may set stricter internal deadlines.",
      "Skills confidence matters as much as the card—hands-on practice reduces hesitation during real incidents.",
    ],
    ctaHref:
      "https://www.hovn.app/tayloredinstruction/courses/aha-basic-life-support/o/cm408wcp10017ggkz39i7ptf9",
    faqTemplates: [
      {
        question: "How often do I need to renew my BLS card?",
        answer: (location) =>
          `Most BLS credentials are valid for two years, and many employers in ${location.label} expect renewal before expiration to avoid schedule disruption.`,
      },
      {
        question: "Can I complete part of BLS training online?",
        answer: (location) =>
          `Yes. Blended options are available for learners in ${location.label}, where you complete the cognitive module online and finish with an in-person skills session.`,
      },
      {
        question: "Who should enroll in BLS classes?",
        answer: (location) =>
          `BLS is ideal for healthcare and clinical support professionals across ${location.region}, including nurses, dental teams, medical assistants, and first responders.`,
      },
    ],
  },
  {
    slugPrefix: "first-aid-cpr-aed-classes",
    serviceLine: "First Aid CPR AED",
    titleLabel: "First Aid / CPR / AED Certification",
    shortName: "First Aid CPR AED",
    audience:
      "workplace teams, educators, coaches, parents, and community volunteers",
    credential: "American Red Cross First Aid/CPR/AED certification",
    classFormats: [
      "traditional in-person classes",
      "blended learning for faster scheduling flexibility",
    ],
    commonUseCases: [
      "OSHA-focused workplace preparedness programs",
      "school, church, and youth-program safety readiness",
      "family and caregiver emergency preparedness training",
    ],
    complianceNotes: [
      "Many employers require current First Aid/CPR/AED credentials for safety-sensitive roles.",
      "Class design should match the likely emergencies at your workplace or program environment.",
      "Regular skills refreshers can improve confidence between certification cycles.",
    ],
    ctaHref:
      "https://www.hovn.app/tayloredinstruction/courses/arc-adult-pediatric-first-aid-cpr-aed/o/cm408sfgn0000ggkzk66s7no4",
    faqTemplates: [
      {
        question: "What is covered in First Aid/CPR/AED training?",
        answer: (location) =>
          `Participants in ${location.label} learn scene safety, emergency assessment, CPR fundamentals, AED use, and first aid care for common injury and illness events.`,
      },
      {
        question: "Is this class suitable for non-medical professionals?",
        answer: () =>
          "Yes. This certification is designed for both workplace and community responders without a clinical background.",
      },
      {
        question: "Can we schedule private group training?",
        answer: (location) =>
          `Yes. Group training options are available throughout ${location.region} for schools, businesses, and community organizations.`,
      },
    ],
  },
  {
    slugPrefix: "heartsaver-cpr-aed",
    serviceLine: "Heartsaver CPR AED",
    titleLabel: "AHA Heartsaver CPR AED",
    shortName: "Heartsaver",
    audience:
      "non-clinical professionals, employers, instructors, and community leaders",
    credential: "AHA Heartsaver First Aid CPR AED certification",
    classFormats: [
      "in-person certification sessions",
      "hybrid format with online content and in-person skills assessment",
    ],
    commonUseCases: [
      "teacher and school support staff preparedness",
      "fitness, recreation, and coaching certifications",
      "employer safety and compliance programs",
    ],
    complianceNotes: [
      "Heartsaver is often selected when a workplace or program requires AHA-aligned training.",
      "Course selection should align with whether first aid, CPR/AED, or both are required.",
      "Practical scenarios improve retention and reduce response delay under stress.",
    ],
    ctaHref:
      "https://www.hovn.app/tayloredinstruction/courses/aha-heartsaver-first-aid-cpr-aed/o/cm408v8do0012ggkzda8f0otz",
    faqTemplates: [
      {
        question: "What is the difference between Heartsaver and BLS?",
        answer: () =>
          "Heartsaver is typically designed for non-clinical responders, while BLS focuses on healthcare-provider response standards.",
      },
      {
        question: "Do employers accept Heartsaver cards?",
        answer: (location) =>
          `Many employers in ${location.label} accept Heartsaver when it matches job requirements, but healthcare roles usually require BLS.`,
      },
      {
        question: "Can I use Heartsaver for school or coaching requirements?",
        answer: () =>
          "In many cases yes, but you should confirm exact credential requirements with your district, agency, or governing body.",
      },
    ],
  },
  {
    slugPrefix: "corporate-cpr-training",
    serviceLine: "Corporate Group Training",
    titleLabel: "Corporate CPR & First Aid Group Training",
    shortName: "Corporate Training",
    audience:
      "employers, HR leaders, operations managers, and safety coordinators",
    credential:
      "group CPR/first aid certification pathways aligned to team needs",
    classFormats: [
      "on-site private group classes",
      "blended group pathways to reduce time away from operations",
    ],
    commonUseCases: [
      "multi-department compliance and safety initiatives",
      "new facility openings and risk management planning",
      "annual or semiannual workforce preparedness cycles",
    ],
    complianceNotes: [
      "A training matrix by role helps organizations maintain compliance at scale.",
      "On-site delivery can reduce scheduling friction for shift-based teams.",
      "Documentation and renewal tracking are essential for audit readiness.",
    ],
    ctaHref: "/contact",
    faqTemplates: [
      {
        question: "Can you train our team on-site?",
        answer: (location) =>
          `Yes. On-site group training is available in ${location.label} and nearby areas, with schedules built around your operations.`,
      },
      {
        question: "How many employees can be trained at once?",
        answer: () =>
          "Class size depends on course type, timing, and skill-station setup; group plans can be scaled for single or multi-day delivery.",
      },
      {
        question: "Can we mix departments with different training needs?",
        answer: () =>
          "Yes. Teams can be segmented by role so each group receives the credential level appropriate to their responsibilities.",
      },
    ],
  },
  {
    slugPrefix: "aed-program-services",
    serviceLine: "AED Program Services",
    titleLabel: "AED Program Planning & CPR Integration",
    shortName: "AED Services",
    audience:
      "facility managers, safety leaders, and organizational decision makers",
    credential: "AED readiness program design with responder training support",
    classFormats: [
      "consultative planning sessions",
      "combined AED deployment and responder certification training",
    ],
    commonUseCases: [
      "new AED placement strategy and emergency response planning",
      "annual program review and refresher training",
      "integration with CPR training for response confidence",
    ],
    complianceNotes: [
      "Effective AED programs include device placement, responder readiness, and maintenance workflows.",
      "Teams should practice real-world response pathways, not just classroom theory.",
      "Program records and drills help maintain long-term readiness.",
    ],
    ctaHref: "/aeds",
    faqTemplates: [
      {
        question: "Where should AED units be placed?",
        answer: () =>
          "Placement should prioritize high-traffic, easily accessible areas and align with your emergency action plan.",
      },
      {
        question: "Do staff need CPR training if we have an AED?",
        answer: () =>
          "Yes. CPR and AED skills work together, and team practice improves response speed and confidence during a critical event.",
      },
      {
        question: "How do we maintain an AED program over time?",
        answer: () =>
          "A sustainable program includes battery/pad checks, responder refreshers, and periodic scenario drills.",
      },
    ],
  },
  {
    slugPrefix: "lifeguarding-certification",
    serviceLine: "Lifeguarding Certification",
    titleLabel: "Lifeguarding Certification",
    shortName: "Lifeguarding",
    audience:
      "aquatic staff, seasonal lifeguards, and recreation program leaders",
    credential:
      "American Red Cross Lifeguarding with First Aid/CPR/AED credentials",
    classFormats: [
      "in-person pool and classroom instruction",
      "blended options where available for prerequisite theory",
    ],
    commonUseCases: [
      "pre-season hiring and certification cycles",
      "mid-season recertification and staffing continuity",
      "aquatics program safety and supervision standards",
    ],
    complianceNotes: [
      "Lifeguarding programs require strong practical skill competency and rescue scenario performance.",
      "Facilities should align staffing plans with renewal windows to avoid coverage gaps.",
      "Team drills and leadership coaching improve deck communication and response consistency.",
    ],
    ctaHref:
      "https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding/o/cm40925g1001oggkzd9r40cdz",
    faqTemplates: [
      {
        question: "How long does lifeguard certification take?",
        answer: () =>
          "Program length varies by format and prerequisite completion, but practical in-water evaluation is a core requirement.",
      },
      {
        question: "Is this course useful for seasonal aquatic staff?",
        answer: (location) =>
          `Yes. It is commonly used to prepare seasonal teams serving pools and aquatic programs in ${location.label}.`,
      },
      {
        question: "Can facilities arrange private lifeguard classes?",
        answer: () =>
          "Yes. Private scheduling can support seasonal staffing windows and facility-specific preparedness goals.",
      },
    ],
  },
];

const seoSectionValidator = v.object({
  heading: v.string(),
  paragraphs: v.array(v.string()),
  bullets: v.optional(v.array(v.string())),
});

const seoFaqValidator = v.object({
  question: v.string(),
  answer: v.string(),
});

const seoPageInputValidator = v.object({
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
  sections: v.array(seoSectionValidator),
  faqItems: v.array(seoFaqValidator),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  ctaText: v.string(),
  researchNotes: v.array(v.string()),
  published: v.boolean(),
});

const summarizePublishedPage = (page: Doc<"seo_pages">) => ({
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
  publishedAt: page.publishedAt ?? page.updatedAt,
});

const clampLimit = (limit?: number): number => {
  const requested = limit ?? DEFAULT_PUBLISHED_PAGES_LIMIT;
  return Math.min(Math.max(requested, 1), MAX_PUBLISHED_PAGES_LIMIT);
};

const estimateReadingTime = (sections: GeneratedPage["sections"]): number => {
  const words = sections
    .flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])])
    .join(" ")
    .split(WORD_SEPARATOR_REGEX)
    .filter(Boolean).length;

  const estimated = Math.ceil(words / READING_TIME_WORDS_PER_MINUTE);
  return Math.max(MINIMUM_READING_TIME_MINUTES, estimated);
};

const getSecondaryKeywords = (
  service: ServiceProfile,
  location: LocationProfile
): string[] => [
  `${service.shortName} classes ${location.label}`,
  `${service.shortName} renewal ${location.city} ${location.state}`,
  `${service.serviceLine.toLowerCase()} ${location.region}`,
  `${service.shortName} training near me ${location.city}`,
  `same day certification card ${location.label}`,
  `${service.shortName} group training ${location.label}`,
];

const buildSections = (
  service: ServiceProfile,
  location: LocationProfile
): GeneratedPage["sections"] => {
  const localDemandSummary = location.localDemandSignals.join("; ");
  const seasonalSummary = location.seasonalRisks.join("; ");
  const classFormatsSummary = service.classFormats.join(" and ");

  return [
    {
      heading: `${service.titleLabel} in ${location.label}: Why local context matters`,
      paragraphs: [
        `${service.titleLabel} in ${location.label} should be practical, scenario-driven, and tailored to how people actually work and live in ${location.region}. Teams in this area often need training that balances strong clinical or workplace standards with realistic scheduling constraints.`,
        `Local demand is shaped by ${localDemandSummary}. A high-quality program addresses those realities and helps participants respond with confidence when seconds matter.`,
      ],
      bullets: [
        `Primary service area: ${location.label}`,
        `Nearby communities served: ${location.nearbyAreas.join(", ")}`,
        `Regional focus: ${location.region}, ${location.state}`,
      ],
    },
    {
      heading: "What participants learn",
      paragraphs: [
        `This program is built for ${service.audience} and follows recognized training standards. Participants build the skills needed to assess emergencies quickly, prioritize actions, and communicate effectively under pressure.`,
        "Instruction emphasizes repetition and applied practice, not passive lecture-only learning. That approach improves retention and makes skills easier to use in real situations.",
      ],
      bullets: [
        `Credential pathway: ${service.credential}`,
        `Format options: ${classFormatsSummary}`,
        ...service.commonUseCases.map((item) => `Use case: ${item}`),
      ],
    },
    {
      heading: `How training is delivered in ${location.label}`,
      paragraphs: [
        `Flexible delivery is critical for organizations and individuals in ${location.region}. Class planning can support shift schedules, school calendars, hiring cycles, and renewal deadlines without sacrificing instructional quality.`,
        "When possible, private and group options reduce administrative complexity while helping teams train together on shared protocols.",
      ],
      bullets: [
        "Public classes for individuals and small teams",
        "Private group sessions for employers and organizations",
        "Blended options to reduce seat time while preserving hands-on competency",
      ],
    },
    {
      heading: "Compliance, renewal, and readiness planning",
      paragraphs: [
        "For many roles, certification is only one part of a broader readiness system. Leaders should pair credential tracking with refreshers, drills, and clear emergency action steps.",
        "Programs are strongest when card validity, shift coverage, and practical scenario readiness are managed together instead of as separate tasks.",
      ],
      bullets: service.complianceNotes,
    },
    {
      heading: `Local risk profile for ${location.label}`,
      paragraphs: [
        `Training in ${location.label} should account for realistic risk conditions: ${seasonalSummary}. Addressing these patterns improves preparedness for both everyday incidents and high-volume periods.`,
        `Course discussions can incorporate local examples so participants practice decision-making that reflects real environments across ${location.nearbyAreas.join(", ")}.`,
      ],
    },
    {
      heading: "Implementation checklist for organizations",
      paragraphs: [
        "Organizations can increase program impact by aligning training cadence with staffing changes, documented emergency procedures, and facility risk points.",
      ],
      bullets: [
        "Map training requirements by role and location",
        "Track certification expiration before staffing bottlenecks occur",
        "Run periodic response drills with realistic scenarios",
        "Keep AED, first aid, and emergency contact workflows current",
      ],
    },
  ];
};

const buildSeoPage = (
  service: ServiceProfile,
  location: LocationProfile
): GeneratedPage => {
  const primaryKeyword = `${service.shortName} classes ${location.label}`;
  const title = `${service.titleLabel} in ${location.label}`;
  const slug = `${service.slugPrefix}-${location.slug}`;

  const sections = buildSections(service, location);
  const readingTimeMinutes = estimateReadingTime(sections);

  const ctaHref =
    service.ctaHref.startsWith("http") || service.ctaHref.startsWith("/")
      ? service.ctaHref
      : "/contact";

  const ctaLabel =
    ctaHref === "/contact" ? "Talk with our team" : "View course options";
  const ctaText = `Need ${service.shortName} training in ${location.label}? We can help you choose the right format for individuals, teams, and recurring renewal cycles.`;

  const faqItems = service.faqTemplates.map((template) => ({
    question: template.question,
    answer: template.answer(location),
  }));

  const researchNotes = [
    ...BASE_RESEARCH_NOTES,
    location.localReference,
    `City profile reference: https://www.google.com/search?q=${encodeURIComponent(location.label)}`,
  ];

  return {
    slug,
    title,
    metaTitle: `${title} | Taylored Instruction`,
    metaDescription: `Get ${service.shortName} training in ${location.label}. Practical, certification-focused instruction with flexible formats for individuals and teams.`,
    excerpt: `Professional ${service.shortName} training options in ${location.label} with practical skills, flexible scheduling, and local readiness focus.`,
    primaryKeyword,
    secondaryKeywords: getSecondaryKeywords(service, location),
    locationLabel: location.label,
    locationCity: location.city,
    locationRegion: location.region,
    locationState: location.state,
    serviceLine: service.serviceLine,
    audience: service.audience,
    readingTimeMinutes,
    sections,
    faqItems,
    ctaLabel,
    ctaHref,
    ctaText,
    researchNotes,
  };
};

const buildSeoSeedPages = (): GeneratedPage[] => {
  const pages: GeneratedPage[] = [];

  for (const location of LOCATION_PROFILES) {
    for (const service of SERVICE_PROFILES) {
      const isSloLocation = location.seoWeight === "secondary";
      const includePage = isSloLocation
        ? service.serviceLine !== "Lifeguarding Certification" ||
          location.city === "San Luis Obispo"
        : true;

      if (!includePage) {
        continue;
      }

      pages.push(buildSeoPage(service, location));
    }
  }

  return pages;
};

const requireAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!isAdminEmail(user.email)) {
    throw new Error("Admin access required");
  }

  return user;
};

const findPageBySlug = async (ctx: QueryCtx | MutationCtx, slug: string) =>
  ctx.db
    .query("seo_pages")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();

const upsertGeneratedPage = async (
  ctx: MutationCtx,
  page: GeneratedPage,
  generatedBy: string,
  overwriteExisting: boolean
): Promise<"inserted" | "updated" | "skipped"> => {
  const now = new Date().toISOString();
  const existing = await findPageBySlug(ctx, page.slug);

  if (!existing) {
    await ctx.db.insert("seo_pages", {
      ...page,
      generatedBy,
      published: true,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });
    return "inserted";
  }

  if (!overwriteExisting) {
    return "skipped";
  }

  await ctx.db.patch(existing._id, {
    ...page,
    generatedBy,
    published: true,
    updatedAt: now,
    publishedAt: existing.publishedAt ?? now,
  });

  return "updated";
};

export const listPublishedPages = query({
  args: {
    locationCity: v.optional(v.string()),
    serviceLine: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const safeLimit = clampLimit(args.limit);
    const locationCity = args.locationCity;
    const serviceLine = args.serviceLine;
    let candidates: Doc<"seo_pages">[];

    if (locationCity && serviceLine) {
      candidates = await ctx.db
        .query("seo_pages")
        .withIndex("by_published_location_city_service_line", (q) =>
          q
            .eq("published", true)
            .eq("locationCity", locationCity)
            .eq("serviceLine", serviceLine)
        )
        .take(MAX_PUBLISHED_PAGES_SCAN_LIMIT);
    } else if (locationCity) {
      candidates = await ctx.db
        .query("seo_pages")
        .withIndex("by_published_location_city", (q) =>
          q.eq("published", true).eq("locationCity", locationCity)
        )
        .take(MAX_PUBLISHED_PAGES_SCAN_LIMIT);
    } else if (serviceLine) {
      candidates = await ctx.db
        .query("seo_pages")
        .withIndex("by_published_service_line", (q) =>
          q.eq("published", true).eq("serviceLine", serviceLine)
        )
        .take(MAX_PUBLISHED_PAGES_SCAN_LIMIT);
    } else {
      candidates = await ctx.db
        .query("seo_pages")
        .withIndex("by_published_slug", (q) => q.eq("published", true))
        .take(MAX_PUBLISHED_PAGES_SCAN_LIMIT);
    }

    const filtered = candidates
      .filter((page) => {
        const locationMatches = locationCity
          ? page.locationCity === locationCity
          : true;
        const serviceMatches = serviceLine
          ? page.serviceLine === serviceLine
          : true;
        return locationMatches && serviceMatches;
      })
      .sort((a, b) => a.slug.localeCompare(b.slug));

    const limited = filtered.slice(0, safeLimit);
    return limited.map(summarizePublishedPage);
  },
});

export const getPublishedPageBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const page = await findPageBySlug(ctx, args.slug);
    if (!page?.published) {
      return null;
    }
    return page;
  },
});

export const getPublishedPageSlugs = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("seo_pages")
      .withIndex("by_published_slug", (q) => q.eq("published", true))
      .take(MAX_PUBLISHED_PAGES_SCAN_LIMIT);

    return pages.map((page) => ({
      slug: page.slug,
      updatedAt: page.updatedAt,
    }));
  },
});

export const listPagesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pages = await ctx.db
      .query("seo_pages")
      .take(MAX_ADMIN_PAGES_SCAN_LIMIT);
    return pages
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((page) => ({
        _id: page._id,
        slug: page.slug,
        title: page.title,
        locationLabel: page.locationLabel,
        serviceLine: page.serviceLine,
        published: page.published,
        updatedAt: page.updatedAt,
      }));
  },
});

export const upsertPage = mutation({
  args: {
    page: seoPageInputValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = new Date().toISOString();
    const existing = await findPageBySlug(ctx, args.page.slug);

    if (!existing) {
      const id = await ctx.db.insert("seo_pages", {
        ...args.page,
        generatedBy: user.email ?? user._id,
        createdAt: now,
        updatedAt: now,
        publishedAt: args.page.published ? now : undefined,
      });
      return { id, status: "inserted" as const };
    }

    await ctx.db.patch(existing._id, {
      ...args.page,
      generatedBy: user.email ?? user._id,
      updatedAt: now,
      publishedAt: args.page.published
        ? (existing.publishedAt ?? now)
        : existing.publishedAt,
    });

    return { id: existing._id, status: "updated" as const };
  },
});

export const deletePage = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await findPageBySlug(ctx, args.slug);
    if (!existing) {
      return { deleted: false };
    }

    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});

export const generateSeoContentBatch = mutation({
  args: {
    overwriteExisting: v.optional(v.boolean()),
    offset: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const allPages = buildSeoSeedPages();
    const safeOffset = Math.max(0, args.offset ?? 0);
    const safeBatchSize = Math.min(
      Math.max(args.batchSize ?? DEFAULT_GENERATION_BATCH_SIZE, 1),
      MAX_GENERATION_BATCH_SIZE
    );
    const pages = allPages.slice(safeOffset, safeOffset + safeBatchSize);
    const estimatedOperations =
      pages.length * ESTIMATED_DB_OPERATIONS_PER_TEMPLATE;

    if (estimatedOperations > MAX_ESTIMATED_BATCH_DB_OPERATIONS) {
      throw new Error(
        "Batch too large for a single mutation transaction. Reduce batchSize and retry."
      );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const page of pages) {
      const result = await upsertGeneratedPage(
        ctx,
        page,
        user.email ?? user._id,
        args.overwriteExisting ?? false
      );

      if (result === "inserted") {
        inserted += 1;
      } else if (result === "updated") {
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      totalTemplates: allPages.length,
      processed: pages.length,
      offset: safeOffset,
      batchSize: safeBatchSize,
      hasMore: safeOffset + pages.length < allPages.length,
      inserted,
      updated,
      skipped,
    };
  },
});

// Internal bootstrap helper for one-time initial content load.
// Existing data is not overwritten unless explicitly requested.
export const seedInitialSeoContent = internalMutation({
  args: {
    overwriteExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pages = buildSeoSeedPages();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const page of pages) {
      const result = await upsertGeneratedPage(
        ctx,
        page,
        "system-seed",
        args.overwriteExisting ?? false
      );

      if (result === "inserted") {
        inserted += 1;
      } else if (result === "updated") {
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      totalTemplates: pages.length,
      inserted,
      updated,
      skipped,
    };
  },
});
