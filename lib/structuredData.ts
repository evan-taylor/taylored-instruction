/**
 * Structured Data (JSON-LD) for SEO
 * Comprehensive schema markup for Taylored Instruction
 */

import { GOOGLE_BUSINESS_PROFILE_URL } from "@/lib/businessProfile";
import { SITE_URL } from "@/lib/seo";

type LocalBusinessSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  image: string;
  description: string;
  url: string;
  telephone: string;
  email: string;
  address: {
    "@type": string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  geo?: {
    "@type": string;
    latitude: number;
    longitude: number;
  };
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  priceRange: string;
  openingHoursSpecification?: {
    "@type": string;
    dayOfWeek: string[];
    opens?: string;
    closes?: string;
  };
  sameAs: string[];
  aggregateRating?: {
    "@type": string;
    ratingValue: string;
    reviewCount: string;
  };
};

type OrganizationSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  alternateName?: string;
  url: string;
  logo: string;
  description: string;
  email: string;
  telephone: string;
  address: {
    "@type": string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  founder: {
    "@type": string;
    name: string;
    jobTitle: string;
  };
  sameAs: string[];
  knowsAbout: string[];
};

type CourseSchema = {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  provider: {
    "@type": string;
    name: string;
    url: string;
  };
  courseCode?: string;
  educationalCredentialAwarded?: string;
  hasCourseInstance?: {
    "@type": string;
    courseMode: string | string[];
    duration: string;
    inLanguage: string;
  };
  offers?: {
    "@type": string;
    category: string;
    priceCurrency?: string;
  };
};

type WebSiteSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  url: string;
};

type WebPageSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  description: string;
  url: string;
  isPartOf: {
    "@id": string;
  };
  about?: {
    "@id": string;
  };
  primaryImageOfPage?: {
    "@type": string;
    url: string;
  };
  inLanguage: string;
};

type ServiceSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  serviceType: string;
  description: string;
  provider: {
    "@id": string;
  };
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  url: string;
  audience?: {
    "@type": string;
    audienceType: string;
  };
  availableChannel?: {
    "@type": string;
    serviceUrl: string;
  };
};

type ContactPageSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  description: string;
  url: string;
  isPartOf: {
    "@id": string;
  };
  about: {
    "@id": string;
  };
  inLanguage: string;
};

type PersonSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  jobTitle: string;
  worksFor: {
    "@id": string;
  };
  email: string;
  telephone: string;
  url: string;
};

type ProductSchema = {
  "@context": string;
  "@type": string;
  "@id": string;
  name: string;
  description: string;
  category: string;
  brand: {
    "@type": string;
    name: string;
  };
  seller: {
    "@id": string;
  };
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  url: string;
};

type BreadcrumbSchema = {
  "@context": string;
  "@type": string;
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item?: string;
  }>;
};

const BASE_URL = SITE_URL;
const WEBSITE_ID = `${BASE_URL}/#website`;
const ORGANIZATION_ID = `${BASE_URL}/#organization`;
const LESS_THAN_REGEX = /</g;
const GREATER_THAN_REGEX = />/g;
const AMPERSAND_REGEX = /&/g;
const LINE_SEPARATOR_REGEX = /\u2028/g;
const PARAGRAPH_SEPARATOR_REGEX = /\u2029/g;

// Organization Schema - Main company information
export const getOrganizationSchema = (): OrganizationSchema => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": ORGANIZATION_ID,
  name: "Taylored Instruction",
  alternateName: "Taylored Instruction CPR Training",
  url: "https://tayloredinstruction.com",
  logo: "https://tayloredinstruction.com/horizontal-logo-black.png",
  description:
    "Taylored Instruction provides professional CPR, BLS, First Aid, Lifeguard training, and AED sales in Vancouver, WA and San Luis Obispo, CA. American Red Cross Licensed Training Provider and AHA Training Site.",
  email: "evan@tayloredinstruction.com",
  telephone: "+1-360-685-8199",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Vancouver",
    addressRegion: "WA",
    addressCountry: "US",
  },
  founder: {
    "@type": "Person",
    name: "Evan Taylor",
    jobTitle: "Instructor Trainer, Owner",
  },
  sameAs: ["https://tayloredinstruction.com", GOOGLE_BUSINESS_PROFILE_URL],
  knowsAbout: [
    "CPR Training",
    "BLS Certification",
    "First Aid Training",
    "Lifeguard Certification",
    "AED Sales",
    "Water Safety",
    "Emergency Response",
    "Workplace Safety",
  ],
});

// Local Business Schema - Vancouver, WA
export const getVancouverLocalBusinessSchema = (): LocalBusinessSchema => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://tayloredinstruction.com/#vancouver-wa",
  name: "Taylored Instruction - Vancouver WA",
  image: "https://tayloredinstruction.com/og-image.png",
  description:
    "Professional CPR, BLS, First Aid, and Lifeguard training in Vancouver, WA. American Red Cross Licensed Training Provider and AHA Training Site serving Clark County and surrounding areas.",
  url: "https://tayloredinstruction.com",
  telephone: "+1-360-685-8199",
  email: "evan@tayloredinstruction.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Vancouver",
    addressRegion: "WA",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 45.6387,
    longitude: -122.6615,
  },
  areaServed: [
    { "@type": "City", name: "Vancouver, WA" },
    { "@type": "City", name: "Camas, WA" },
    { "@type": "City", name: "Washougal, WA" },
    { "@type": "City", name: "Battle Ground, WA" },
    { "@type": "City", name: "Ridgefield, WA" },
    { "@type": "City", name: "La Center, WA" },
    { "@type": "AdministrativeArea", name: "Clark County, WA" },
    { "@type": "City", name: "Portland, OR" },
  ],
  priceRange: "$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  sameAs: ["https://tayloredinstruction.com", GOOGLE_BUSINESS_PROFILE_URL],
});

// Local Business Schema - San Luis Obispo, CA
export const getSLOLocalBusinessSchema = (): LocalBusinessSchema => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://tayloredinstruction.com/#san-luis-obispo-ca",
  name: "Taylored Instruction - San Luis Obispo CA",
  image: "https://tayloredinstruction.com/og-image.png",
  description:
    "Seasonal CPR, BLS, First Aid, and Lifeguard training in San Luis Obispo, CA. Professional instruction from American Red Cross and AHA certified trainers.",
  url: "https://tayloredinstruction.com",
  telephone: "+1-360-685-8199",
  email: "evan@tayloredinstruction.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Luis Obispo",
    addressRegion: "CA",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 35.2828,
    longitude: -120.6596,
  },
  areaServed: [
    { "@type": "City", name: "San Luis Obispo, CA" },
    { "@type": "City", name: "Pismo Beach, CA" },
    { "@type": "City", name: "Arroyo Grande, CA" },
    { "@type": "City", name: "Morro Bay, CA" },
    { "@type": "City", name: "Atascadero, CA" },
    { "@type": "AdministrativeArea", name: "San Luis Obispo County, CA" },
  ],
  priceRange: "$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  sameAs: ["https://tayloredinstruction.com", GOOGLE_BUSINESS_PROFILE_URL],
});

// Website Schema
export const getWebSiteSchema = (): WebSiteSchema => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "Taylored Instruction",
  url: BASE_URL,
});

export const getWebPageSchema = (params: {
  name: string;
  description: string;
  path: string;
  imageUrl?: string;
}): WebPageSchema => {
  const url = new URL(params.path, BASE_URL).toString();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: params.name,
    description: params.description,
    url,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    about: {
      "@id": ORGANIZATION_ID,
    },
    ...(params.imageUrl
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            url: params.imageUrl,
          },
        }
      : {}),
    inLanguage: "en-US",
  };
};

export const getServiceSchema = (params: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
  areaServed: string[];
  audienceType?: string;
}): ServiceSchema => {
  const url = new URL(params.path, BASE_URL).toString();

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: params.name,
    serviceType: params.serviceType,
    description: params.description,
    provider: {
      "@id": ORGANIZATION_ID,
    },
    areaServed: params.areaServed.map((area) => ({
      "@type": "AdministrativeArea",
      name: area,
    })),
    url,
    ...(params.audienceType
      ? {
          audience: {
            "@type": "Audience",
            audienceType: params.audienceType,
          },
        }
      : {}),
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${BASE_URL}/contact`,
    },
  };
};

export const getContactPageSchema = (): ContactPageSchema => ({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${BASE_URL}/contact#webpage`,
  name: "Contact Taylored Instruction",
  description:
    "Contact Taylored Instruction for CPR, BLS, First Aid, Lifeguard, and AED training in Vancouver, WA and San Luis Obispo, CA.",
  url: `${BASE_URL}/contact`,
  isPartOf: {
    "@id": WEBSITE_ID,
  },
  about: {
    "@id": ORGANIZATION_ID,
  },
  inLanguage: "en-US",
});

export const getAboutPersonSchema = (): PersonSchema => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${BASE_URL}/about#evan-taylor`,
  name: "Evan Taylor",
  jobTitle: "Owner, Instructor Trainer",
  worksFor: {
    "@id": ORGANIZATION_ID,
  },
  email: "evan@tayloredinstruction.com",
  telephone: "+1-360-685-8199",
  url: `${BASE_URL}/about`,
});

export const getAedProductSchema = (): ProductSchema => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${BASE_URL}/aeds#product`,
  name: "Automated External Defibrillators (AEDs)",
  description:
    "AED sales, consultation, and implementation support for workplaces, schools, and community organizations in Southwest Washington and San Luis Obispo County.",
  category: "Medical Device",
  brand: {
    "@type": "Brand",
    name: "ZOLL, Cardiac Science, and other leading AED manufacturers",
  },
  seller: {
    "@id": ORGANIZATION_ID,
  },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Clark County, WA" },
    { "@type": "AdministrativeArea", name: "Portland Metro, OR" },
    { "@type": "AdministrativeArea", name: "San Luis Obispo County, CA" },
  ],
  url: `${BASE_URL}/aeds`,
});

// Course Schemas for different training programs
export const getBLSCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Basic Life Support (BLS) for Healthcare Providers",
  description:
    "American Heart Association BLS certification course for healthcare professionals and first responders in Vancouver, WA and San Luis Obispo, CA.",
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
  courseCode: "AHA-BLS",
  educationalCredentialAwarded: "AHA BLS Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "Blended",
    duration: "PT4H",
    inLanguage: "en-US",
  },
  offers: {
    "@type": "Offer",
    category: "Professional Development",
    priceCurrency: "USD",
  },
});

export const getRedCrossBLSCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "American Red Cross Basic Life Support (BLS)",
  description:
    "American Red Cross Basic Life Support course for healthcare providers, first responders, and professional rescuers in Vancouver, WA and San Luis Obispo, CA.",
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: BASE_URL,
  },
  courseCode: "ARC-BLS",
  educationalCredentialAwarded: "Red Cross Basic Life Support Certification",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT4H",
    inLanguage: "en-US",
  },
  offers: {
    "@type": "Offer",
    category: "Healthcare Training",
    priceCurrency: "USD",
  },
});

export const getFirstAidCPRAEDCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "First Aid/CPR/AED Certification",
  description:
    "American Red Cross First Aid, CPR, and AED certification course for workplace teams and individuals in Vancouver, WA and San Luis Obispo, CA.",
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
  courseCode: "ARC-FACPRAED",
  educationalCredentialAwarded:
    "Red Cross First Aid/CPR/AED Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT5H",
    inLanguage: "en-US",
  },
  offers: {
    "@type": "Offer",
    category: "Safety Training",
    priceCurrency: "USD",
  },
});

export const getHeartsaverCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Heartsaver First Aid CPR AED",
  description:
    "American Heart Association Heartsaver course for workplace teams, schools, and individuals needing CPR and First Aid certification in Vancouver, WA and San Luis Obispo, CA.",
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
  courseCode: "AHA-HEARTSAVER",
  educationalCredentialAwarded: "AHA Heartsaver Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT5H",
    inLanguage: "en-US",
  },
  offers: {
    "@type": "Offer",
    category: "Safety Training",
    priceCurrency: "USD",
  },
});

export const getLifeguardingCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "American Red Cross Lifeguarding Certification",
  description:
    "Professional lifeguard training and certification through the American Red Cross in Vancouver, WA and San Luis Obispo, CA. Learn rescue techniques, CPR, and water safety.",
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
  courseCode: "ARC-LIFEGUARDING",
  educationalCredentialAwarded:
    "Red Cross Lifeguarding/First Aid/CPR/AED Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT25H",
    inLanguage: "en-US",
  },
  offers: {
    "@type": "Offer",
    category: "Professional Certification",
    priceCurrency: "USD",
  },
});

// Breadcrumb Schema Generator
export const getBreadcrumbSchema = (
  items: Array<{ name: string; url?: string }>
): BreadcrumbSchema => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.url && { item: item.url }),
  })),
});

// Utility function to generate script tag for JSON-LD
export const generateJSONLD = (data: unknown) => ({
  __html: JSON.stringify(data)
    .replace(LESS_THAN_REGEX, "\\u003c")
    .replace(GREATER_THAN_REGEX, "\\u003e")
    .replace(AMPERSAND_REGEX, "\\u0026")
    .replace(LINE_SEPARATOR_REGEX, "\\u2028")
    .replace(PARAGRAPH_SEPARATOR_REGEX, "\\u2029"),
});
