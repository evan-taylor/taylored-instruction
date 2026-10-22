"use cache";

import { cacheLife } from "next/cache";
import WaterSafetyInstructorPageContent from "@/components/WaterSafetyInstructorPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Red Cross Water Safety Instructor Course | Taylored Instruction";
const pageDescription =
  "Train to teach swimming and water safety with the American Red Cross Water Safety Instructor course. Explore prerequisites and upcoming WSI classes.";
const path = "/water-safety-instructor";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path,
  ogType: "article",
  keywords: [
    "Water Safety Instructor",
    "WSI course",
    "Red Cross swim instructor training",
    "swimming teacher certification",
  ],
  image: { title: "Water Safety Instructor", description: pageDescription },
});

export default async function Page() {
  cacheLife("days");
  const webPage = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path,
  });
  const service = getServiceSchema({
    name: "American Red Cross Water Safety Instructor Training",
    description: pageDescription,
    path,
    serviceType: "Swim Instructor Certification Training",
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    audienceType: "Swimmers pursuing instructor certification",
  });
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Water Safety Instructor",
      url: `https://tayloredinstruction.com${path}`,
    },
  ]);
  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPage)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(service)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbs)}
        type="application/ld+json"
      />
      <WaterSafetyInstructorPageContent />
    </>
  );
}
