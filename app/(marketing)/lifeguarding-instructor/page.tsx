"use cache";

import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import LifeguardingInstructorPageContent from "@/components/LifeguardingInstructorPageContent";
import { generateOgImageUrl } from "@/lib/utils";

const ogImageUrl = generateOgImageUrl({
  title: "Lifeguarding Instructor Course",
  description: "Become a Certified Red Cross Lifeguard Instructor",
  type: "lifeguarding",
});

export const metadata: Metadata = {
  title:
    "Red Cross Lifeguarding Instructor Course | Vancouver WA & San Luis Obispo CA - Become a Lifeguard Instructor",
  description:
    "Become a certified American Red Cross Lifeguarding Instructor in Vancouver WA, Clark County & San Luis Obispo CA. Teach lifeguard certification courses with Taylored Instruction. Blended learning with online & in-person sessions. CPR for Professional Rescuers & aquatic safety training included.",
  keywords: [
    "Lifeguarding Instructor",
    "Red Cross Lifeguarding Instructor course",
    "Lifeguard Instructor training",
    "Vancouver WA lifeguard instructor",
    "San Luis Obispo lifeguard instructor",
    "CPR AED for Professional Rescuers",
    "Aquatic safety instructor training",
    "Become lifeguard instructor",
    "Teach lifeguarding",
    "LGI course",
    "Lifeguard Instructor certification",
    "Red Cross LGI Vancouver",
    "Lifeguard Instructor Clark County",
    "Teach aquatic safety",
  ],
  openGraph: {
    title:
      "Red Cross Lifeguarding Instructor Course | Vancouver WA & San Luis Obispo CA",
    description:
      "Become a certified American Red Cross Lifeguarding Instructor. Teach lifeguard courses in Vancouver WA & San Luis Obispo CA. Blended learning available.",
    url: "https://tayloredinstruction.com/lifeguarding-instructor",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Red Cross Lifeguarding Instructor Course - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Red Cross Lifeguarding Instructor Course | Vancouver WA & San Luis Obispo CA",
    description:
      "Become a certified American Red Cross Lifeguarding Instructor. Teach lifeguard courses today!",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/lifeguarding-instructor",
  },
};

export default async function Page() {
  cacheLife("days");
  return <LifeguardingInstructorPageContent />;
}
