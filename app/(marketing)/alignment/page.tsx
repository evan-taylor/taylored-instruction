"use cache";

import type { Metadata } from "next";
import AlignmentPageContent from "@/components/AlignmentPageContent";

export const metadata: Metadata = {
  title:
    "Instructor Alignment with Taylored Instruction | Vancouver WA & San Luis Obispo CA - Red Cross & AHA",
  description:
    "Align with Taylored Instruction in Vancouver WA, Clark County & San Luis Obispo CA. American Red Cross Licensed Training Provider & AHA Training Site. Strong support for CPR, First Aid & Lifeguard instructors. Enhance your training courses with professional resources.",
  keywords: [
    "Instructor alignment Taylored Instruction",
    "Teach with Taylored Instruction",
    "CPR instructor affiliation Vancouver WA",
    "First Aid instructor alignment",
    "Lifeguard instructor opportunities Vancouver WA",
    "AHA Training Site alignment Vancouver WA",
    "Red Cross LTP alignment Vancouver WA",
    "Join Taylored Instruction team",
    "Safety training instructor partnership",
    "Clark County instructor alignment",
    "Instructor alignment San Luis Obispo",
    "Red Cross instructor support",
    "AHA instructor alignment",
    "CPR instructor resources",
    "Teach CPR Vancouver WA",
    "Independent instructor support",
  ],
  alternates: {
    canonical: "https://tayloredinstruction.com/alignment",
  },
  openGraph: {
    title:
      "Instructor Alignment with Taylored Instruction | Vancouver WA & San Luis Obispo CA",
    description:
      "Align with Taylored Instruction to enhance your CPR, First Aid, or Lifeguard training courses. Red Cross & AHA support in Vancouver, WA & San Luis Obispo, CA.",
    url: "https://tayloredinstruction.com/alignment",
    siteName: "Taylored Instruction",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Instructor Alignment - Taylored Instruction",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Instructor Alignment with Taylored Instruction | Vancouver WA & San Luis Obispo CA",
    description:
      "Align with Taylored Instruction to enhance your training courses. Red Cross & AHA support available.",
    images: ["/twitter-image.png"],
  },
};

const AlignmentPage = async () => <AlignmentPageContent />;

export default AlignmentPage;
