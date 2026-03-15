"use cache";

import { cacheLife } from "next/cache";
import HeartsaverPageContent from "@/components/HeartsaverPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getHeartsaverCourseSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "AHA Heartsaver First Aid CPR AED | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "American Heart Association Heartsaver First Aid CPR AED certification in Vancouver WA, Clark County, and San Luis Obispo CA for workplace teams and community learners.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/heartsaver",
  ogType: "article",
  keywords: [
    "AHA Heartsaver class Vancouver WA",
    "Heartsaver first aid CPR AED certification",
    "CPR class for teachers and coaches",
    "childcare CPR first aid certification",
    "workplace CPR certification class",
    "Heartsaver blended learning class",
    "Heartsaver class San Luis Obispo CA",
    "community CPR class Clark County WA",
  ],
  image: {
    title: "AHA Heartsaver First Aid CPR AED",
    description:
      "Workplace and community Heartsaver certification in Vancouver WA and San Luis Obispo CA",
    type: "heartsaver",
  },
});

export default async function HeartsaverPage() {
  cacheLife("days");
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/heartsaver",
  });

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
      <HeartsaverPageContent />
    </>
  );
}
