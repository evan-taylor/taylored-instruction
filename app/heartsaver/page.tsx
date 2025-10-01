import type { Metadata } from "next";
import HeartsaverPageContent from "@/components/HeartsaverPageContent";
import {
  generateJSONLD,
  getHeartsaverCourseSchema,
  getBreadcrumbSchema,
} from "@/lib/structuredData";

export const metadata: Metadata = {
  title:
    "AHA Heartsaver First Aid CPR AED | Vancouver WA & San Luis Obispo CA - Workplace Certification",
  description:
    "American Heart Association Heartsaver® First Aid, CPR & AED certification in Vancouver WA, Clark County, and San Luis Obispo CA. Perfect for workplace teams, schools, childcare providers & personal preparedness. Blended learning available.",
  keywords: [
    "Heartsaver CPR AED Vancouver WA",
    "AHA Heartsaver certification",
    "First Aid training Vancouver WA",
    "CPR for non-medical personnel",
    "AED for lay responders",
    "Workplace first aid CPR",
    "Community CPR classes",
    "Infant child CPR Vancouver WA",
    "Blended learning Heartsaver",
    "Taylored Instruction Heartsaver",
    "Clark County Heartsaver",
    "Heartsaver San Luis Obispo",
    "Heartsaver certification San Luis Obispo CA",
    "Childcare CPR certification",
    "Daycare CPR training Vancouver",
    "School CPR training",
    "Heartsaver Total",
    "Heartsaver K-12",
    "Heartsaver Portland OR",
    "Heartsaver Camas WA",
    "SLO County Heartsaver",
  ],
  openGraph: {
    title:
      "AHA Heartsaver First Aid CPR AED | Vancouver WA & San Luis Obispo CA",
    description:
      "American Heart Association Heartsaver® certification in Vancouver WA and San Luis Obispo CA. Perfect for workplace teams, schools, and personal preparedness.",
    url: "https://tayloredinstruction.com/heartsaver",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AHA Heartsaver CPR AED Training - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AHA Heartsaver First Aid CPR AED | Vancouver WA & San Luis Obispo CA",
    description:
      "American Heart Association Heartsaver® certification for workplace teams, schools, and personal preparedness. Blended learning available.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/heartsaver",
  },
};

export default function HeartsaverPage() {
  // Generate structured data
  const courseSchema = getHeartsaverCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Heartsaver",
      url: "https://tayloredinstruction.com/heartsaver",
    },
  ]);

  return (
    <>
      {/* Structured Data - Course */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJSONLD(courseSchema)}
      />
      {/* Structured Data - Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
      />
      <HeartsaverPageContent />
    </>
  );
}
