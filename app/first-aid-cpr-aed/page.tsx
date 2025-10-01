import type { Metadata } from "next";
import type React from "react";
import FirstAidCprAedPageContent from "@/components/FirstAidCprAedPageContent";
import {
  generateJSONLD,
  getFirstAidCPRAEDCourseSchema,
  getBreadcrumbSchema,
} from "@/lib/structuredData";

export const metadata: Metadata = {
  title:
    "First Aid/CPR/AED Certification | Vancouver WA & San Luis Obispo CA - Red Cross Training",
  description:
    "Learn lifesaving First Aid, CPR & AED skills with American Red Cross certification in Vancouver WA, Clark County, and San Luis Obispo CA. Respond to cardiac, breathing & first aid emergencies. Blended learning & in-person classes available.",
  keywords: [
    "First Aid CPR AED Vancouver WA",
    "Red Cross First Aid certification",
    "CPR and AED training",
    "Emergency response course Vancouver",
    "Workplace safety training",
    "Blended learning CPR First Aid",
    "Cardiac emergency care",
    "Breathing emergency care",
    "First aid for injuries",
    "Taylored Instruction First Aid",
    "Vancouver WA CPR AED",
    "Clark County First Aid",
    "First Aid San Luis Obispo",
    "CPR AED San Luis Obispo CA",
    "Adult Pediatric First Aid CPR",
    "First Aid training Portland OR",
    "First Aid Camas WA",
    "First Aid Battle Ground WA",
    "First Aid Ridgefield WA",
    "SLO County First Aid",
    "Red Cross certification Vancouver",
    "Workplace First Aid training",
  ],
  openGraph: {
    title:
      "First Aid/CPR/AED Certification | Vancouver WA & San Luis Obispo CA",
    description:
      "Learn lifesaving First Aid, CPR & AED skills with American Red Cross certification in Vancouver WA and San Luis Obispo CA. Blended learning & in-person classes.",
    url: "https://tayloredinstruction.com/first-aid-cpr-aed",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "First Aid, CPR, and AED Training - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "First Aid/CPR/AED Certification | Vancouver WA & San Luis Obispo CA",
    description:
      "Learn lifesaving First Aid, CPR & AED skills with American Red Cross certification. Blended learning & in-person classes available.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/first-aid-cpr-aed",
  },
};

const FirstAidCprAedPage: React.FC = () => {
  // Generate structured data
  const courseSchema = getFirstAidCPRAEDCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "First Aid/CPR/AED",
      url: "https://tayloredinstruction.com/first-aid-cpr-aed",
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
      <FirstAidCprAedPageContent />
    </>
  );
};

export default FirstAidCprAedPage;
