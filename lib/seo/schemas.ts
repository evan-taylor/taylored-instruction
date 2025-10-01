/**
 * JSON-LD Schema utilities for SEO optimization
 * Implements Schema.org structured data for better search engine visibility
 */

export interface LocalBusinessSchema {
  "@context": string;
  "@type": string;
  name: string;
  image: string[];
  "@id": string;
  url: string;
  telephone: string;
  email: string;
  address: {
    "@type": string;
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    "@type": string;
    latitude: number;
    longitude: number;
  };
  openingHoursSpecification?: Array<{
    "@type": string;
    dayOfWeek: string[];
    opens?: string;
    closes?: string;
  }>;
  sameAs?: string[];
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
  priceRange?: string;
  description: string;
}

export interface CourseSchema {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  provider: {
    "@type": string;
    name: string;
    url: string;
  };
  educationalCredentialAwarded?: string;
  aggregateRating?: {
    "@type": string;
    ratingValue: string;
    reviewCount: string;
  };
  offers?: {
    "@type": string;
    category: string;
    priceCurrency?: string;
    price?: string;
    availability?: string;
  };
  hasCourseInstance?: Array<{
    "@type": string;
    courseMode: string;
    duration: string;
    inLanguage: string;
  }>;
  occupationalCredentialAwarded?: {
    "@type": string;
    credentialCategory: string;
    name: string;
    recognizedBy: {
      "@type": string;
      name: string;
    };
  };
}

export interface OrganizationSchema {
  "@context": string;
  "@type": string;
  name: string;
  alternateName?: string;
  url: string;
  logo: string;
  image: string[];
  description: string;
  founder: {
    "@type": string;
    name: string;
    jobTitle: string;
  };
  foundingDate: string;
  address: {
    "@type": string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  contactPoint: {
    "@type": string;
    telephone: string;
    contactType: string;
    email: string;
    areaServed: string[];
    availableLanguage: string[];
  };
  sameAs?: string[];
  areaServed: Array<{
    "@type": string;
    name: string;
  }>;
}

export interface BreadcrumbSchema {
  "@context": string;
  "@type": string;
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item?: string;
  }>;
}

// Main organization schema for Vancouver, WA location
export const getOrganizationSchema = (): OrganizationSchema => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Taylored Instruction",
  alternateName: "Taylored Instruction CPR Training",
  url: "https://tayloredinstruction.com",
  logo: "https://tayloredinstruction.com/horizontal-logo-black.png",
  image: [
    "https://tayloredinstruction.com/CPR-Training-Image.jpeg",
    "https://tayloredinstruction.com/lifeguard-training.jpeg",
    "https://tayloredinstruction.com/headshot.png",
  ],
  description:
    "Taylored Instruction provides expert CPR, BLS, First Aid, and Lifeguarding training in Vancouver, WA and San Luis Obispo, CA. American Red Cross Licensed Training Provider and American Heart Association Training Site.",
  founder: {
    "@type": "Person",
    name: "Evan Taylor",
    jobTitle: "Owner & Instructor Trainer",
  },
  foundingDate: "2023",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Vancouver",
    addressRegion: "WA",
    addressCountry: "US",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-360-207-1844",
    contactType: "customer service",
    email: "evan@tayloredinstruction.com",
    areaServed: [
      "US-WA",
      "US-CA",
      "Vancouver WA",
      "San Luis Obispo CA",
      "Clark County WA",
    ],
    availableLanguage: ["English"],
  },
  areaServed: [
    {
      "@type": "City",
      name: "Vancouver, WA",
    },
    {
      "@type": "City",
      name: "Battle Ground, WA",
    },
    {
      "@type": "City",
      name: "Camas, WA",
    },
    {
      "@type": "City",
      name: "Washougal, WA",
    },
    {
      "@type": "City",
      name: "Ridgefield, WA",
    },
    {
      "@type": "City",
      name: "La Center, WA",
    },
    {
      "@type": "City",
      name: "Woodland, WA",
    },
    {
      "@type": "City",
      name: "Portland, OR",
    },
    {
      "@type": "City",
      name: "San Luis Obispo, CA",
    },
    {
      "@type": "City",
      name: "Pismo Beach, CA",
    },
    {
      "@type": "City",
      name: "Morro Bay, CA",
    },
  ],
});

// Local Business schema for Vancouver, WA
export const getVancouverLocalBusinessSchema = (): LocalBusinessSchema => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Taylored Instruction - CPR & Safety Training Vancouver WA",
  image: [
    "https://tayloredinstruction.com/CPR-Training-Image.jpeg",
    "https://tayloredinstruction.com/Vancouver-Washington-Stock-Photo-scaled.jpeg",
  ],
  "@id": "https://tayloredinstruction.com",
  url: "https://tayloredinstruction.com",
  telephone: "(360) 207-1844",
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
    { "@type": "City", name: "Vancouver, Washington" },
    { "@type": "City", name: "Battle Ground, Washington" },
    { "@type": "City", name: "Camas, Washington" },
    { "@type": "City", name: "Washougal, Washington" },
    { "@type": "City", name: "Ridgefield, Washington" },
    { "@type": "City", name: "La Center, Washington" },
    { "@type": "City", name: "Woodland, Washington" },
    { "@type": "City", name: "Portland, Oregon" },
  ],
  priceRange: "$$",
  description:
    "Professional CPR, BLS, First Aid, and Lifeguarding certification training in Vancouver, WA and surrounding cities. American Red Cross and AHA authorized training provider.",
});

// San Luis Obispo location schema
export const getSanLuisObispoLocalBusinessSchema =
  (): LocalBusinessSchema => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Taylored Instruction - CPR Training San Luis Obispo CA",
    image: [
      "https://tayloredinstruction.com/CPR-Training-Image.jpeg",
      "https://tayloredinstruction.com/Cal-Poly-Stock-Photo-334513455-scaled.jpeg",
    ],
    "@id": "https://tayloredinstruction.com/san-luis-obispo",
    url: "https://tayloredinstruction.com",
    telephone: "(360) 207-1844",
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
      { "@type": "City", name: "San Luis Obispo, California" },
      { "@type": "City", name: "Pismo Beach, California" },
      { "@type": "City", name: "Morro Bay, California" },
      { "@type": "City", name: "Arroyo Grande, California" },
      { "@type": "City", name: "Atascadero, California" },
    ],
    priceRange: "$$",
    description:
      "Seasonal CPR, First Aid, and safety training in San Luis Obispo, CA. Expert instruction from American Red Cross and AHA certified trainers.",
  });

// Course schema generator
export const getCourseSchema = (
  courseName: string,
  description: string,
  credentialName: string,
  duration: string,
  issuingOrganization: string
): CourseSchema => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: courseName,
  description: description,
  provider: {
    "@type": "EducationalOrganization",
    name: "Taylored Instruction",
    url: "https://tayloredinstruction.com",
  },
  educationalCredentialAwarded: credentialName,
  hasCourseInstance: [
    {
      "@type": "CourseInstance",
      courseMode: "blended",
      duration: duration,
      inLanguage: "en-US",
    },
    {
      "@type": "CourseInstance",
      courseMode: "onsite",
      duration: duration,
      inLanguage: "en-US",
    },
  ],
  occupationalCredentialAwarded: {
    "@type": "EducationalOccupationalCredential",
    credentialCategory: "certification",
    name: credentialName,
    recognizedBy: {
      "@type": "Organization",
      name: issuingOrganization,
    },
  },
});

// Breadcrumb schema generator
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

// Utility to render JSON-LD script tag
export const renderJsonLd = (schema: object) => {
  return {
    __html: JSON.stringify(schema),
  };
};
