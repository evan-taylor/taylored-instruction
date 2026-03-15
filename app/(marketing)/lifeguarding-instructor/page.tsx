"use cache";

import { cacheLife } from "next/cache";
import LifeguardingInstructorPageContent from "@/components/LifeguardingInstructorPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Red Cross Lifeguarding Instructor Course | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "Become a certified American Red Cross Lifeguarding Instructor in Vancouver WA, Clark County, and San Luis Obispo CA with blended and in-person training.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/lifeguarding-instructor",
  ogType: "article",
  keywords: [
    "Red Cross lifeguarding instructor course",
    "LGI course Vancouver WA",
    "lifeguard instructor training Clark County",
    "aquatic safety instructor certification",
    "CPR AED for professional rescuers instructor",
    "lifeguarding instructor course San Luis Obispo CA",
    "teach lifeguarding classes",
    "become lifeguard instructor",
  ],
  image: {
    title: "Lifeguarding Instructor Course",
    description: "Become a certified Red Cross lifeguarding instructor",
    type: "lifeguarding",
  },
});

export default async function Page() {
  cacheLife("days");
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/lifeguarding-instructor",
  });
  const serviceSchema = getServiceSchema({
    name: "Red Cross Lifeguarding Instructor Training",
    description:
      "Instructor development course for candidates pursuing Red Cross Lifeguarding Instructor certification.",
    path: "/lifeguarding-instructor",
    serviceType: "Aquatic Instructor Certification Training",
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    audienceType: "Current lifeguards pursuing instructor credentials",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Lifeguarding Instructor",
      url: "https://tayloredinstruction.com/lifeguarding-instructor",
    },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(serviceSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <LifeguardingInstructorPageContent />
    </>
  );
}
