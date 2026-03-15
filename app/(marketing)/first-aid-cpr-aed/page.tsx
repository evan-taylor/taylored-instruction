"use cache";

import FirstAidCprAedPageContent from "@/components/FirstAidCprAedPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getFirstAidCPRAEDCourseSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "First Aid/CPR/AED Certification | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "American Red Cross First Aid, CPR, and AED certification classes in Vancouver WA, Clark County, and San Luis Obispo CA with blended and in-person options.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/first-aid-cpr-aed",
  ogType: "article",
  keywords: [
    "first aid CPR AED classes Vancouver WA",
    "Red Cross CPR certification Clark County",
    "adult and pediatric CPR AED class",
    "workplace first aid training on-site",
    "blended learning CPR first aid classes",
    "first aid certification San Luis Obispo CA",
    "CPR AED course Portland metro",
    "emergency response certification course",
  ],
  image: {
    title: "First Aid/CPR/AED Certification",
    description:
      "Red Cross First Aid CPR AED classes in Vancouver WA and San Luis Obispo CA",
  },
});

const FirstAidCprAedPage = async () => {
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/first-aid-cpr-aed",
  });

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
      <FirstAidCprAedPageContent />
    </>
  );
};

export default FirstAidCprAedPage;
