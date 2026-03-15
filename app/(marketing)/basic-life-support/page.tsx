"use cache";

import BasicLifeSupportPageContent from "@/components/BasicLifeSupportPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getRedCrossBLSCourseSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Red Cross Basic Life Support (BLS) Certification | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "American Red Cross Basic Life Support (BLS) certification for healthcare providers in Vancouver WA, Clark County, and San Luis Obispo CA.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/basic-life-support",
  ogType: "article",
  keywords: [
    "Red Cross BLS class Vancouver WA",
    "basic life support certification Clark County",
    "healthcare provider BLS course",
    "professional rescuer CPR class",
    "airway obstruction response training",
    "opioid overdose response BLS class",
    "Red Cross BLS class San Luis Obispo",
    "BLS classes Portland metro",
  ],
  image: {
    title: "Red Cross Basic Life Support (BLS)",
    description:
      "Red Cross BLS training for healthcare providers in Vancouver WA and San Luis Obispo CA",
    type: "bls",
  },
});

const BasicLifeSupportPage = async () => {
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/basic-life-support",
  });
  const courseSchema = getRedCrossBLSCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Red Cross Basic Life Support",
      url: "https://tayloredinstruction.com/basic-life-support",
    },
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
      <BasicLifeSupportPageContent />
    </>
  );
};

export default BasicLifeSupportPage;
