import type { Metadata } from "next";
import BlsPageContent from "@/components/BlsPageContent";
import {
  generateJSONLD,
  getBLSCourseSchema,
  getBreadcrumbSchema,
} from "@/lib/structuredData";

export const metadata: Metadata = {
  title:
    "AHA BLS Certification Course | Vancouver WA & San Luis Obispo CA - Healthcare Providers",
  description:
    "American Heart Association BLS certification for healthcare professionals in Vancouver WA, Clark County, and San Luis Obispo CA. In-person & blended learning. Renew or get your BLS Provider certification. Same-day eCard available.",
  keywords: [
    "AHA BLS Vancouver WA",
    "BLS certification Vancouver WA",
    "Basic Life Support for healthcare providers",
    "BLS certification AHA",
    "CPR for medical professionals Vancouver WA",
    "AHA BLS renewal Vancouver WA",
    "Healthcare CPR certification",
    "First responder BLS",
    "BLS blended learning AHA",
    "Taylored Instruction AHA BLS",
    "Vancouver WA BLS for healthcare",
    "Clark County BLS",
    "BLS San Luis Obispo",
    "BLS certification San Luis Obispo CA",
    "BLS for nurses Vancouver WA",
    "BLS for EMT Vancouver WA",
    "BLS HeartCode",
    "BLS Provider course",
    "BLS training Portland OR",
    "BLS Camas WA",
    "BLS Battle Ground WA",
    "SLO County BLS",
  ],
  openGraph: {
    title:
      "AHA BLS Certification Course | Vancouver WA & San Luis Obispo CA - Healthcare Providers",
    description:
      "American Heart Association BLS certification for healthcare professionals in Vancouver WA and San Luis Obispo CA. In-person & blended learning available.",
    url: "https://tayloredinstruction.com/bls",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AHA BLS Training for Healthcare Professionals - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AHA BLS Certification | Vancouver WA & San Luis Obispo CA - Healthcare Providers",
    description:
      "American Heart Association BLS certification for healthcare professionals. In-person & blended learning in Vancouver WA and San Luis Obispo CA.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/bls",
  },
};

export default function BlsPage() {
  // Generate structured data
  const courseSchema = getBLSCourseSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "BLS Certification", url: "https://tayloredinstruction.com/bls" },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(courseSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <BlsPageContent />
    </>
  );
}
