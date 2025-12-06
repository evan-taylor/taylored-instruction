"use cache";

import type { Metadata } from "next";
import BasicLifeSupportPageContent from "@/components/BasicLifeSupportPageContent";
import { generateOgImageUrl } from "@/lib/utils";

const ogImageUrl = generateOgImageUrl({
  title: "Red Cross Basic Life Support (BLS)",
  description:
    "Healthcare Provider Certification in Vancouver WA & San Luis Obispo CA",
  type: "bls",
});

export const metadata: Metadata = {
  title:
    "Red Cross Basic Life Support (BLS) Certification | Vancouver WA & San Luis Obispo CA - Healthcare Providers",
  description:
    "American Red Cross Basic Life Support (BLS) certification for healthcare providers in Vancouver WA, Clark County & San Luis Obispo CA. Learn CPR, respiratory & cardiac arrest care, airway obstruction & opioid overdose response. Professional BLS training.",
  keywords: [
    "Basic Life Support Vancouver WA",
    "Red Cross BLS certification",
    "BLS for healthcare providers",
    "CPR for healthcare professionals",
    "BLS training",
    "American Red Cross BLS",
    "Respiratory arrest care",
    "Cardiac arrest care",
    "Airway obstruction training",
    "Opioid overdose response",
    "BLS course Vancouver WA",
    "Taylored Instruction BLS",
    "Vancouver WA BLS",
    "Red Cross BLS San Luis Obispo",
    "BLS Clark County",
    "Healthcare BLS certification",
  ],
  openGraph: {
    title:
      "Red Cross Basic Life Support (BLS) Certification | Vancouver WA & San Luis Obispo CA",
    description:
      "American Red Cross BLS certification for healthcare providers. Learn CPR, cardiac arrest care & emergency response in Vancouver WA & San Luis Obispo CA.",
    url: "https://tayloredinstruction.com/basic-life-support",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Red Cross BLS Certification - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Red Cross Basic Life Support (BLS) Certification | Vancouver WA & San Luis Obispo CA",
    description:
      "American Red Cross BLS certification for healthcare providers.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/basic-life-support",
  },
};

const BasicLifeSupportPage = async () => <BasicLifeSupportPageContent />;

export default BasicLifeSupportPage;
