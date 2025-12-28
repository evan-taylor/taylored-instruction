"use cache";

import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import CalPolyCprPageContent from "@/components/CalPolyCprPageContent";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getCalPolyCPRCourseSchema,
} from "@/lib/structuredData";
import { generateOgImageUrl } from "@/lib/utils";

const ogImageUrl = generateOgImageUrl({
  title: "Cal Poly CPR Classes",
  description: "AHA BLS & Red Cross CPR for Cal Poly SLO Students",
});

export const metadata: Metadata = {
  title:
    "Cal Poly CPR Classes | BLS & CPR Certification for Cal Poly SLO Students",
  description:
    "CPR classes for Cal Poly San Luis Obispo students. American Heart Association BLS and American Red Cross CPR/AED certification. Convenient scheduling, student-friendly pricing. Get certified in San Luis Obispo.",
  keywords: [
    "Cal Poly CPR",
    "Cal Poly CPR class",
    "Cal Poly SLO CPR",
    "Cal Poly BLS",
    "CPR certification Cal Poly",
    "Cal Poly San Luis Obispo CPR",
    "CPR class San Luis Obispo",
    "BLS certification Cal Poly",
    "Cal Poly nursing CPR",
    "Cal Poly kinesiology CPR",
    "CPR for Cal Poly students",
    "AHA BLS Cal Poly",
    "Red Cross CPR Cal Poly",
    "Cal Poly healthcare CPR",
    "SLO CPR class",
    "San Luis Obispo CPR certification",
    "Cal Poly pre-med CPR",
    "Cal Poly student CPR",
    "CPR training SLO",
    "BLS class San Luis Obispo",
  ],
  openGraph: {
    title: "Cal Poly CPR Classes | BLS & CPR Certification for Students",
    description:
      "CPR classes for Cal Poly San Luis Obispo students. AHA BLS and Red Cross CPR/AED certification with convenient scheduling and student-friendly pricing.",
    url: "https://tayloredinstruction.com/cal-poly-cpr",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "CPR Classes for Cal Poly SLO Students - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cal Poly CPR Classes | BLS & CPR Certification",
    description:
      "CPR classes for Cal Poly San Luis Obispo students. AHA BLS and Red Cross CPR/AED certification available.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/cal-poly-cpr",
  },
};

export default async function CalPolyCprPage() {
  cacheLife("days");
  const courseSchema = getCalPolyCPRCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Cal Poly CPR Classes",
      url: "https://tayloredinstruction.com/cal-poly-cpr",
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
      <CalPolyCprPageContent />
    </>
  );
}
