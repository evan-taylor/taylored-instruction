"use cache";

import type { Metadata } from "next";
import FirstAidCprAedPageContent from "@/components/FirstAidCprAedPageContent";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getFirstAidCPRAEDCourseSchema,
} from "@/lib/structuredData";
import { generateOgImageUrl } from "@/lib/utils";

const ogImageUrl = generateOgImageUrl({
  title: "First Aid/CPR/AED Certification",
  description: "Red Cross Training in Vancouver WA & San Luis Obispo CA",
});

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
        url: ogImageUrl,
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
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/first-aid-cpr-aed",
  },
};

const FirstAidCprAedPage = async () => {
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
      <script
        dangerouslySetInnerHTML={generateJSONLD(courseSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <FirstAidCprAedPageContent />
    </>
  );
};

export default FirstAidCprAedPage;
