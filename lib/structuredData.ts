/**
 * Structured Data (JSON-LD) for SEO
 * Comprehensive schema markup for Taylored Instruction
 */

import { GOOGLE_BUSINESS_PROFILE_URL } from "@/lib/businessProfile";
import { SITE_URL } from "@/lib/seo";

interface LocalBusinessSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  address: {
    "@type": string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  aggregateRating?: {
    "@type": string;
    ratingValue: string;
    reviewCount: string;
  };
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  description: string;
  email: string;
  geo?: {
    "@type": string;
    latitude: number;
    longitude: number;
  };
  image: string;
  name: string;
  openingHoursSpecification?: {
    "@type": string;
    dayOfWeek: string[];
    opens?: string;
    closes?: string;
  };
  priceRange: string;
  sameAs: string[];
  telephone: string;
  url: string;
}

interface OrganizationSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  address: {
    "@type": string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  alternateName?: string;
  description: string;
  email: string;
  founder: {
    "@type": string;
    name: string;
    jobTitle: string;
  };
  knowsAbout: string[];
  logo: string;
  name: string;
  sameAs: string[];
  telephone: string;
  url: string;
}

interface CourseSchema {
  "@context": string;
  "@type": string;
  courseCode?: string;
  description: string;
  educationalCredentialAwarded?: string;
  hasCourseInstance?: {
    "@type": string;
    courseMode: string | string[];
    duration: string;
    inLanguage: string;
  };
  name: string;
  offers?: {
    "@type": string;
    category: string;
    priceCurrency?: string;
  };
  provider: {
    "@type": string;
    name: string;
    url: string;
  };
}

interface WebSiteSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  name: string;
  url: string;
}

interface WebPageSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  about?: {
    "@id": string;
  };
  description: string;
  inLanguage: string;
  isPartOf: {
    "@id": string;
  };
  name: string;
  primaryImageOfPage?: {
    "@type": string;
    url: string;
  };
  url: string;
}

interface ServiceSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  audience?: {
    "@type": string;
    audienceType: string;
  };
  availableChannel?: {
    "@type": string;
    serviceUrl: string;
  };
  description: string;
  name: string;
  provider: {
    "@id": string;
  };
  serviceType: string;
  url: string;
}

interface ContactPageSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  about: {
    "@id": string;
  };
  description: string;
  inLanguage: string;
  isPartOf: {
    "@id": string;
  };
  name: string;
  url: string;
}

interface PersonSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  email: string;
  jobTitle: string;
  name: string;
  telephone: string;
  url: string;
  worksFor: {
    "@id": string;
  };
}

interface ProductSchema {
  "@context": string;
  "@id": string;
  "@type": string;
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  brand: {
    "@type": string;
    name: string;
  };
  category: string;
  description: string;
  name: string;
  seller: {
    "@id": string;
  };
  url: string;
}

interface BreadcrumbSchema {
  "@context": string;
  "@type": string;
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item?: string;
  }>;
}

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
  "@id": ORGANIZATION_ID,
  "@type": "EducationalOrganization",
  address: {
    "@type": "PostalAddress",
    addressCountry: "US",
    addressLocality: "Vancouver",
    addressRegion: "WA",
  },
  alternateName: "Taylored Instruction CPR Training",
  description:
    "Taylored Instruction provides professional CPR, BLS, First Aid, Lifeguard training, and AED sales in Vancouver, WA and San Luis Obispo, CA. American Red Cross Licensed Training Provider and AHA Training Site.",
  email: "evan@tayloredinstruction.com",
  founder: {
    "@type": "Person",
    jobTitle: "Instructor Trainer, Owner",
    name: "Evan Taylor",
  },
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
  logo: "https://tayloredinstruction.com/horizontal-logo-black.png",
  name: "Taylored Instruction",
  sameAs: ["https://tayloredinstruction.com", GOOGLE_BUSINESS_PROFILE_URL],
  telephone: "+1-360-685-8199",
  url: "https://tayloredinstruction.com",
});

// Local Business Schema - Vancouver, WA
export const getVancouverLocalBusinessSchema = (): LocalBusinessSchema => ({
  "@context": "https://schema.org",
  "@id": "https://tayloredinstruction.com/#vancouver-wa",
  "@type": "LocalBusiness",
  address: {
    "@type": "PostalAddress",
    addressCountry: "US",
    addressLocality: "Vancouver",
    addressRegion: "WA",
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
  description:
    "Professional CPR, BLS, First Aid, and Lifeguard training in Vancouver, WA. American Red Cross Licensed Training Provider and AHA Training Site serving Clark County and surrounding areas.",
  email: "evan@tayloredinstruction.com",
  geo: {
    "@type": "GeoCoordinates",
    latitude: 45.6387,
    longitude: -122.6615,
  },
  image: "https://tayloredinstruction.com/og-image.png",
  name: "Taylored Instruction - Vancouver WA",
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
  priceRange: "$$",
  sameAs: ["https://tayloredinstruction.com", GOOGLE_BUSINESS_PROFILE_URL],
  telephone: "+1-360-685-8199",
  url: "https://tayloredinstruction.com",
});

// Local Business Schema - San Luis Obispo, CA
export const getSLOLocalBusinessSchema = (): LocalBusinessSchema => ({
  "@context": "https://schema.org",
  "@id": "https://tayloredinstruction.com/#san-luis-obispo-ca",
  "@type": "LocalBusiness",
  address: {
    "@type": "PostalAddress",
    addressCountry: "US",
    addressLocality: "San Luis Obispo",
    addressRegion: "CA",
  },
  areaServed: [
    { "@type": "City", name: "San Luis Obispo, CA" },
    { "@type": "City", name: "Pismo Beach, CA" },
    { "@type": "City", name: "Arroyo Grande, CA" },
    { "@type": "City", name: "Morro Bay, CA" },
    { "@type": "City", name: "Atascadero, CA" },
    { "@type": "AdministrativeArea", name: "San Luis Obispo County, CA" },
  ],
  description:
    "Seasonal CPR, BLS, First Aid, and Lifeguard training in San Luis Obispo, CA. Professional instruction from American Red Cross and AHA certified trainers.",
  email: "evan@tayloredinstruction.com",
  geo: {
    "@type": "GeoCoordinates",
    latitude: 35.2828,
    longitude: -120.6596,
  },
  image: "https://tayloredinstruction.com/og-image.png",
  name: "Taylored Instruction - San Luis Obispo CA",
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
  priceRange: "$$",
  sameAs: ["https://tayloredinstruction.com", GOOGLE_BUSINESS_PROFILE_URL],
  telephone: "+1-360-685-8199",
  url: "https://tayloredinstruction.com",
});

// Website Schema
export const getWebSiteSchema = (): WebSiteSchema => ({
  "@context": "https://schema.org",
  "@id": WEBSITE_ID,
  "@type": "WebSite",
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
    "@id": `${url}#webpage`,
    "@type": "WebPage",
    about: {
      "@id": ORGANIZATION_ID,
    },
    description: params.description,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    name: params.name,
    url,
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
    "@id": `${url}#service`,
    "@type": "Service",
    areaServed: params.areaServed.map((area) => ({
      "@type": "AdministrativeArea",
      name: area,
    })),
    description: params.description,
    name: params.name,
    provider: {
      "@id": ORGANIZATION_ID,
    },
    serviceType: params.serviceType,
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
  "@id": `${BASE_URL}/contact#webpage`,
  "@type": "ContactPage",
  about: {
    "@id": ORGANIZATION_ID,
  },
  description:
    "Contact Taylored Instruction for CPR, BLS, First Aid, Lifeguard, and AED training in Vancouver, WA and San Luis Obispo, CA.",
  inLanguage: "en-US",
  isPartOf: {
    "@id": WEBSITE_ID,
  },
  name: "Contact Taylored Instruction",
  url: `${BASE_URL}/contact`,
});

export const getAboutPersonSchema = (): PersonSchema => ({
  "@context": "https://schema.org",
  "@id": `${BASE_URL}/about#evan-taylor`,
  "@type": "Person",
  email: "evan@tayloredinstruction.com",
  jobTitle: "Owner, Instructor Trainer",
  name: "Evan Taylor",
  telephone: "+1-360-685-8199",
  url: `${BASE_URL}/about`,
  worksFor: {
    "@id": ORGANIZATION_ID,
  },
});

export const getAedProductSchema = (): ProductSchema => ({
  "@context": "https://schema.org",
  "@id": `${BASE_URL}/aeds#product`,
  "@type": "Product",
  areaServed: [
    { "@type": "AdministrativeArea", name: "Clark County, WA" },
    { "@type": "AdministrativeArea", name: "Portland Metro, OR" },
    { "@type": "AdministrativeArea", name: "San Luis Obispo County, CA" },
  ],
  brand: {
    "@type": "Brand",
    name: "ZOLL, Cardiac Science, and other leading AED manufacturers",
  },
  category: "Medical Device",
  description:
    "AED sales, consultation, and implementation support for workplaces, schools, and community organizations in Southwest Washington and San Luis Obispo County.",
  name: "Automated External Defibrillators (AEDs)",
  seller: {
    "@id": ORGANIZATION_ID,
  },
  url: `${BASE_URL}/aeds`,
});

// Course Schemas for different training programs
export const getBLSCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  courseCode: "AHA-BLS",
  description:
    "American Heart Association BLS certification course for healthcare professionals and first responders in Vancouver, WA and San Luis Obispo, CA.",
  educationalCredentialAwarded: "AHA BLS Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "Blended",
    duration: "PT4H",
    inLanguage: "en-US",
  },
  name: "Basic Life Support (BLS) for Healthcare Providers",
  offers: {
    "@type": "Offer",
    category: "Professional Development",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
});

export const getRedCrossBLSCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  courseCode: "ARC-BLS",
  description:
    "American Red Cross Basic Life Support course for healthcare providers, first responders, and professional rescuers in Vancouver, WA and San Luis Obispo, CA.",
  educationalCredentialAwarded: "Red Cross Basic Life Support Certification",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT4H",
    inLanguage: "en-US",
  },
  name: "American Red Cross Basic Life Support (BLS)",
  offers: {
    "@type": "Offer",
    category: "Healthcare Training",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: BASE_URL,
  },
});

export const getFirstAidCPRAEDCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  courseCode: "ARC-FACPRAED",
  description:
    "American Red Cross First Aid, CPR, and AED certification course for workplace teams and individuals in Vancouver, WA and San Luis Obispo, CA.",
  educationalCredentialAwarded:
    "Red Cross First Aid/CPR/AED Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT5H",
    inLanguage: "en-US",
  },
  name: "First Aid/CPR/AED Certification",
  offers: {
    "@type": "Offer",
    category: "Safety Training",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
});

export const getHeartsaverCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  courseCode: "AHA-HEARTSAVER",
  description:
    "American Heart Association Heartsaver course for workplace teams, schools, and individuals needing CPR and First Aid certification in Vancouver, WA and San Luis Obispo, CA.",
  educationalCredentialAwarded: "AHA Heartsaver Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT5H",
    inLanguage: "en-US",
  },
  name: "Heartsaver First Aid CPR AED",
  offers: {
    "@type": "Offer",
    category: "Safety Training",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
});

export const getLifeguardingCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  courseCode: "ARC-LIFEGUARDING",
  description:
    "Professional lifeguard training and certification through the American Red Cross in Vancouver, WA and San Luis Obispo, CA. Learn rescue techniques, CPR, and water safety.",
  educationalCredentialAwarded:
    "Red Cross Lifeguarding/First Aid/CPR/AED Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT25H",
    inLanguage: "en-US",
  },
  name: "American Red Cross Lifeguarding Certification",
  offers: {
    "@type": "Offer",
    category: "Professional Certification",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
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
    name: item.name,
    position: index + 1,
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
