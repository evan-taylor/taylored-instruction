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
  title: pageTitle,
  description: pageDescription,
  path: "/alignment",
  keywords: [
    "instructor alignment Vancouver WA",
    "CPR instructor affiliation program",
    "AHA training site alignment",
    "Red Cross LTP instructor support",
    "independent CPR instructor resources",
    "lifeguard instructor alignment support",
    "instructor alignment Clark County WA",
    "instructor alignment San Luis Obispo CA",
  },
  image: {
    title: "Instructor Alignment",
    description: "Partner with Taylored Instruction for instructor support",
  },
});

const AlignmentPage = async () => {
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/alignment",
  });
  const alignmentServiceSchema = getServiceSchema({
    name: "Instructor Alignment and Administrative Support",
    description:
      "Instructor alignment services for CPR, First Aid, BLS, and Lifeguard instructors, including operational guidance and certification processing support.",
    path: "/alignment",
    serviceType: "Instructor Alignment Program",
    areaServed: ["Clark County, WA", "Portland Metro, OR", "San Luis Obispo County, CA"],
    audienceType: "Independent and organizational instructors",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Instructor Alignment", url: "https://tayloredinstruction.com/alignment" },
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
