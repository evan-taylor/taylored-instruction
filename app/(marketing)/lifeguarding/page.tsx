"use cache";

import LifeguardingPageContent from "@/components/LifeguardingPageContent";
import { getFAQSchema, lifeguardFAQs } from "@/lib/faqSchema";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getLifeguardingCourseSchema,
  getWebPageSchema,
} from "@/lib/structuredData";
const pageTitle =
  "Red Cross Lifeguarding Certification | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "Become a certified lifeguard with American Red Cross Lifeguarding training in Vancouver WA, Clark County, and San Luis Obispo CA.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/lifeguarding",
  ogType: "article",
  keywords: [
    "lifeguard certification Vancouver WA",
    "Red Cross lifeguarding class Clark County",
    "lifeguard prerequisites swim test",
    "CPR for professional rescuers class",
    "lifeguard recertification course Vancouver",
    "aquatic rescue training class",
    "lifeguard course San Luis Obispo CA",
    "lifeguard training Portland metro",
  ],
  image: {
    title: "Red Cross Lifeguarding Certification",
    description:
      "Professional lifeguard training in Vancouver WA and San Luis Obispo CA",
    type: "lifeguarding",
  },
});

const LifeguardingPage = async () => {
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/lifeguarding",
  });
  const faqSchema = getFAQSchema(lifeguardFAQs);

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
      <script
        dangerouslySetInnerHTML={generateJSONLD(faqSchema)}
        type="application/ld+json"
      />
      <LifeguardingPageContent />
    </>
  );
};

export default LifeguardingPage;
