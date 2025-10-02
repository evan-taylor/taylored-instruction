import type { Metadata } from "next";
import type React from "react";
import LifeguardingPageContent from "@/components/LifeguardingPageContent";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getLifeguardingCourseSchema,
} from "@/lib/structuredData";

export const metadata: Metadata = {
  title:
    "Red Cross Lifeguarding Certification | Vancouver WA & San Luis Obispo CA - Professional Training",
  description:
    "Become a certified lifeguard with American Red Cross Lifeguarding training in Vancouver WA, Clark County, and San Luis Obispo CA. Learn rescue techniques, CPR, First Aid & water safety. Blended learning & in-person options. Start your lifeguard career today!",
  keywords: [
    "Lifeguard certification Vancouver WA",
    "Red Cross lifeguarding",
    "Lifeguard training courses",
    "Become a lifeguard",
    "Lifeguard recertification Vancouver WA",
    "Aquatic emergency response",
    "Water safety certification",
    "Professional lifeguard training",
    "Lifeguard swimming prerequisites",
    "Taylored Instruction lifeguarding",
    "Vancouver WA lifeguard classes",
    "Clark County lifeguard",
    "Lifeguard San Luis Obispo",
    "Lifeguard certification San Luis Obispo CA",
    "Lifeguard training Portland OR",
    "Lifeguard Camas WA",
    "Lifeguard Battle Ground WA",
    "Pool lifeguard training",
    "Waterfront lifeguard certification",
    "Shallow water lifeguard",
    "SLO County lifeguard",
    "Red Cross LGI",
    "Lifeguard Instructor Vancouver",
  ],
  openGraph: {
    title:
      "Red Cross Lifeguarding Certification | Vancouver WA & San Luis Obispo CA",
    description:
      "Become a certified lifeguard with American Red Cross training in Vancouver WA and San Luis Obispo CA. Learn rescue techniques, CPR, First Aid & water safety.",
    url: "https://tayloredinstruction.com/lifeguarding",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Red Cross Lifeguarding Certification - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Red Cross Lifeguarding Certification | Vancouver WA & San Luis Obispo CA",
    description:
      "Become a certified lifeguard with American Red Cross training. Learn rescue techniques, CPR, First Aid & water safety.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/lifeguarding",
  },
};

const LifeguardingPage: React.FC = () => {
  // Generate structured data
  const courseSchema = getLifeguardingCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Lifeguarding",
      url: "https://tayloredinstruction.com/lifeguarding",
    },
  ]);

  return (
    <>
      {/* Structured Data - Course */}
      <script
        dangerouslySetInnerHTML={generateJSONLD(courseSchema)}
        type="application/ld+json"
      />
      {/* Structured Data - Breadcrumb */}
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <LifeguardingPageContent />
    </>
  );
};

export default LifeguardingPage;
