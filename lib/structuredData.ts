/**
 * Structured Data (JSON-LD) for SEO
 * Comprehensive schema markup for Taylored Instruction
 */

import {
  ACCREDITATION_PHRASE,
  BUSINESS,
  BUSINESS_SAME_AS,
} from "@/lib/business";
import { SITE_URL } from "@/lib/seo";

type SchemaNode = {
  "@context": "https://schema.org";
  "@type": string | string[];
  "@id": string;
  [key: string]: unknown;
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

const LOCAL_BUSINESS_ID = `${BASE_URL}/#localbusiness`;
const PERSON_ID = `${BASE_URL}/about#evan-taylor`;

const postalAddress = () => ({
  "@type": "PostalAddress",
  streetAddress: BUSINESS.address.streetAddress,
  addressLocality: BUSINESS.address.locality,
  addressRegion: BUSINESS.address.region,
  postalCode: BUSINESS.address.postalCode,
  addressCountry: BUSINESS.address.country,
});

const logoImage = () => ({
  "@type": "ImageObject",
  "@id": `${BASE_URL}/#logo`,
  url: BUSINESS.logoUrl,
  contentUrl: BUSINESS.logoUrl,
  caption: BUSINESS.name,
});

const businessCredentials = () =>
  BUSINESS.accreditations.map((accreditation) => ({
    "@type": "EducationalOccupationalCredential",
    name: accreditation.name,
    credentialCategory: "Training provider authorization",
    recognizedBy: {
      "@type": "Organization",
      name: accreditation.recognizedBy.name,
      url: accreditation.recognizedBy.url,
    },
  }));

export const getOrganizationSchema = (): SchemaNode => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": ORGANIZATION_ID,
  name: BUSINESS.name,
  legalName: BUSINESS.legalName,
  url: BASE_URL,
  logo: logoImage(),
  image: BUSINESS.imageUrl,
  description: `${BUSINESS.name} teaches CPR, BLS, First Aid, Lifeguarding and instructor courses in Vancouver, WA, Portland, OR and San Luis Obispo, CA. ${ACCREDITATION_PHRASE}.`,
  email: BUSINESS.email,
  telephone: BUSINESS.phone.schema,
  address: postalAddress(),
  foundingDate: BUSINESS.foundingYear,
  founder: { "@id": PERSON_ID },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: BUSINESS.phone.schema,
    email: BUSINESS.email,
    areaServed: "US",
    availableLanguage: "English",
  },
  hasCredential: businessCredentials(),
  sameAs: BUSINESS_SAME_AS,
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

export const getLocalBusinessSchema = (): SchemaNode => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": LOCAL_BUSINESS_ID,
  name: BUSINESS.name,
  url: BASE_URL,
  image: BUSINESS.imageUrl,
  logo: logoImage(),
  description: `CPR, BLS, First Aid and Lifeguard training based in downtown Vancouver, WA, serving Vancouver, Camas, Portland, San Luis Obispo and surrounding areas. ${ACCREDITATION_PHRASE}.`,
  telephone: BUSINESS.phone.schema,
  email: BUSINESS.email,
  address: postalAddress(),
  geo: {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.geo.latitude,
    longitude: BUSINESS.geo.longitude,
  },
  areaServed: BUSINESS.serviceArea.map((area) => ({
    "@type": area.type,
    name: area.name,
  })),
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...BUSINESS.hours.days],
      opens: BUSINESS.hours.opens,
      closes: BUSINESS.hours.closes,
    },
  ],
  parentOrganization: { "@id": ORGANIZATION_ID },
  hasCredential: businessCredentials(),
  sameAs: BUSINESS_SAME_AS,
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

export const getAboutPersonSchema = (): SchemaNode => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: BUSINESS.founder.name,
  jobTitle: BUSINESS.founder.jobTitle,
  image: BUSINESS.founder.imageUrl,
  worksFor: {
    "@id": ORGANIZATION_ID,
  },
  url: `${BASE_URL}/about`,
  hasCredential: BUSINESS.founder.credentials.map((credential) => ({
    "@type": "EducationalOccupationalCredential",
    name: credential.name,
    credentialCategory: "Instructor certification",
    recognizedBy: { "@type": "Organization", name: credential.recognizedBy },
  })),
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
