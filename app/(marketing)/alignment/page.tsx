"use cache";

import AlignmentPageContent from "@/components/AlignmentPageContent";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Instructor Alignment with Taylored Instruction | Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "Align with Taylored Instruction as an independent CPR, First Aid, BLS, or Lifeguard instructor and receive support from a Red Cross LTP and AHA-aligned training site.";

export const metadata = buildPageMetadata({
  description: pageDescription,
  image: {
    description: "Partner with Taylored Instruction for instructor support",
    title: "Instructor Alignment",
  },
  keywords: [
    "instructor alignment Vancouver WA",
    "CPR instructor affiliation program",
    "AHA training site alignment",
    "Red Cross LTP instructor support",
    "independent CPR instructor resources",
    "lifeguard instructor alignment support",
    "instructor alignment Clark County WA",
    "instructor alignment San Luis Obispo CA",
  ],
  path: "/alignment",
  title: pageTitle,
});

const AlignmentPage = async () => {
  const webPageSchema = getWebPageSchema({
    description: pageDescription,
    name: pageTitle,
    path: "/alignment",
  });
  const alignmentServiceSchema = getServiceSchema({
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    audienceType: "Independent and organizational instructors",
    description:
      "Instructor alignment services for CPR, First Aid, BLS, and Lifeguard instructors, including operational guidance and certification processing support.",
    name: "Instructor Alignment and Administrative Support",
    path: "/alignment",
    serviceType: "Instructor Alignment Program",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Instructor Alignment",
      url: "https://tayloredinstruction.com/alignment",
    },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(alignmentServiceSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <AlignmentPageContent />
    </>
  );
};

export default AlignmentPage;
