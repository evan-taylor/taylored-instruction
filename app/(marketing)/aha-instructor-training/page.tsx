"use cache";

import AhaInstructorTrainingPageContent from "@/components/AhaInstructorTrainingPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle = "AHA Instructor Training | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "Become an American Heart Association BLS or Heartsaver instructor through Taylored Instruction in Vancouver WA and San Luis Obispo CA.";

export const metadata = buildPageMetadata({
  description: pageDescription,
  image: {
    description: "Become a certified AHA BLS or Heartsaver instructor",
    title: "AHA Instructor Training",
    type: "aha",
  },
  keywords: [
    "AHA instructor training Vancouver WA",
    "BLS instructor course Clark County",
    "Heartsaver instructor course Vancouver WA",
    "become AHA CPR instructor",
    "AHA instructor essentials support",
    "AHA instructor training San Luis Obispo CA",
    "teach BLS and Heartsaver classes",
    "CPR instructor mentorship program",
  ],
  ogType: "article",
  path: "/aha-instructor-training",
  title: pageTitle,
});

const AhaInstructorTrainingPage = async () => {
  const webPageSchema = getWebPageSchema({
    description: pageDescription,
    name: pageTitle,
    path: "/aha-instructor-training",
  });
  const serviceSchema = getServiceSchema({
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    audienceType:
      "Current provider-level cardholders pursuing instructor certification",
    description:
      "Instructor development and certification preparation for AHA BLS and Heartsaver instructors.",
    name: "AHA Instructor Training",
    path: "/aha-instructor-training",
    serviceType: "Instructor Certification Training",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "AHA Instructor Training",
      url: "https://tayloredinstruction.com/aha-instructor-training",
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
      <AhaInstructorTrainingPageContent />
    </>
  );
};

export default AhaInstructorTrainingPage;
