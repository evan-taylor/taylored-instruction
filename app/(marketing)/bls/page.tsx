"use cache";

import { cacheLife } from "next/cache";
import BlsPageContent from "@/components/BlsPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBLSCourseSchema,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "AHA BLS Certification Course | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "American Heart Association BLS certification for healthcare professionals in Vancouver WA, Clark County, and San Luis Obispo CA with in-person and blended options.";

export const metadata = buildPageMetadata({
  description: pageDescription,
  image: {
    description:
      "Healthcare provider BLS certification in Vancouver WA and San Luis Obispo CA",
    title: "AHA BLS Certification Course",
    type: "bls",
  },
  keywords: [
    "AHA BLS provider course Vancouver WA",
    "BLS renewal for healthcare providers",
    "HeartCode BLS skills session Vancouver",
    "BLS classes Clark County WA",
    "healthcare CPR certification Portland metro",
    "BLS certification San Luis Obispo CA",
    "BLS course for nurses EMTs",
    "same-day AHA BLS eCard",
  ],
  ogType: "article",
  path: "/bls",
  title: pageTitle,
});

export default async function BlsPage() {
  cacheLife("days");
  const webPageSchema = getWebPageSchema({
    description: pageDescription,
    name: pageTitle,
    path: "/bls",
  });

  // Generate structured data
  const courseSchema = getBLSCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "BLS Certification", url: "https://tayloredinstruction.com/bls" },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(courseSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <BlsPageContent />
    </>
  );
}
