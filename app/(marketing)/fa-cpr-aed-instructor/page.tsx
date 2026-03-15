"use cache";

import FaCprAedInstructorPageContent from "@/components/FaCprAedInstructorPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "Become a certified American Red Cross First Aid/CPR/AED Instructor in Vancouver WA, Clark County, and San Luis Obispo CA.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/fa-cpr-aed-instructor",
  ogType: "article",
  keywords: [
    "Red Cross first aid CPR AED instructor course",
    "FA CPR AED instructor training Vancouver WA",
    "become Red Cross instructor Clark County",
    "Red Cross instructor course San Luis Obispo CA",
    "CPR instructor development program",
    "first aid instructor certification support",
    "teach Red Cross classes",
    "instructor bridge and alignment support",
  ],
  image: {
    title: "First Aid/CPR/AED Instructor Course",
    description: "Become a certified Red Cross First Aid CPR AED instructor",
  },
});

const FaCprAedInstructorPage = async () => {
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/fa-cpr-aed-instructor",
  });
  const serviceSchema = getServiceSchema({
    name: "Red Cross First Aid/CPR/AED Instructor Training",
    description:
      "Instructor training program for professionals pursuing Red Cross First Aid/CPR/AED instructor credentials.",
    path: "/fa-cpr-aed-instructor",
    serviceType: "Instructor Certification Training",
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    audienceType:
      "Current provider-level cardholders pursuing instructor certification",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Red Cross Instructor Course",
      url: "https://tayloredinstruction.com/fa-cpr-aed-instructor",
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
      <FaCprAedInstructorPageContent />
    </>
  );
};

export default FaCprAedInstructorPage;
