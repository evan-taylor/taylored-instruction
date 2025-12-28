/**
 * Structured Data (JSON-LD) for SEO
 * Comprehensive schema markup for Taylored Instruction
 */

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
  name: string;
  url: string;
  potentialAction: {
    "@type": string;
    target: {
      "@type": string;
      urlTemplate: string;
    };
    "query-input": string;
  };
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

// Organization Schema - Main company information
export const getOrganizationSchema = (): OrganizationSchema => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Taylored Instruction",
  alternateName: "Taylored Instruction CPR Training",
  url: "https://tayloredinstruction.com",
  logo: "https://tayloredinstruction.com/horizontal-logo-black.png",
  description:
    "Taylored Instruction provides professional CPR, BLS, First Aid, Lifeguard training, and AED sales in Vancouver, WA and San Luis Obispo, CA. American Red Cross Licensed Training Provider and AHA Training Site.",
  email: "evan@tayloredinstruction.com",
  telephone: "+1-360-207-1844",
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
  sameAs: [
    // Add social media links when available
    "https://tayloredinstruction.com",
  ],
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
  telephone: "+1-360-207-1844",
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
  sameAs: ["https://tayloredinstruction.com"],
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
  telephone: "+1-360-207-1844",
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
  sameAs: ["https://tayloredinstruction.com"],
});

// Website Schema with Search Action
export const getWebSiteSchema = (): WebSiteSchema => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Taylored Instruction",
  url: "https://tayloredinstruction.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://tayloredinstruction.com/?s={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
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

export const getCalPolyCPRCourseSchema = (): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "CPR Classes for Cal Poly SLO Students",
  description:
    "CPR and BLS certification courses for Cal Poly San Luis Obispo students. American Heart Association BLS and American Red Cross CPR/AED training available in San Luis Obispo.",
  provider: {
    "@type": "Organization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
  courseCode: "CALPOLY-CPR",
  educationalCredentialAwarded:
    "AHA BLS or Red Cross CPR/AED Certification (Valid 2 Years)",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: ["Blended", "In-Person"],
    duration: "PT4H",
    inLanguage: "en-US",
  },
  offers: {
    "@type": "Offer",
    category: "Student Training",
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
  __html: JSON.stringify(data),
});
