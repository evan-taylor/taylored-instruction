import type { Metadata } from "next";
import type React from "react";
import BasicLifeSupportPageContent from "@/components/BasicLifeSupportPageContent";

export const metadata: Metadata = {
  title: "Red Cross BLS Vancouver WA | Basic Life Support Healthcare Providers",
  description:
    "Red Cross Basic Life Support (BLS) certification in Vancouver WA for healthcare providers. Professional CPR training for respiratory & cardiac arrest, airway obstruction. Serving Clark County, Battle Ground, Camas & San Luis Obispo.",
  keywords: [
    "Basic Life Support Vancouver WA",
    "Red Cross BLS certification Vancouver",
    "BLS healthcare providers Clark County",
    "CPR healthcare professionals Vancouver",
    "BLS training Vancouver WA",
    "American Red Cross BLS",
    "Respiratory arrest care training",
    "Cardiac arrest care Vancouver",
    "Airway obstruction training",
    "Opioid overdose response BLS",
    "BLS course Vancouver WA",
    "Taylored Instruction BLS",
    "Battle Ground BLS",
    "Camas BLS training",
    "San Luis Obispo BLS",
  ],
  openGraph: {
    title: "Red Cross BLS Vancouver WA | Basic Life Support Healthcare",
    description:
      "Red Cross BLS certification for healthcare providers in Vancouver WA. Professional life support training.",
    url: "https://tayloredinstruction.com/basic-life-support",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Red Cross Basic Life Support Training in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Red Cross BLS Vancouver WA | Basic Life Support",
    description:
      "Red Cross BLS certification for healthcare providers. Professional life support training.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/basic-life-support",
  },
};

const BasicLifeSupportPage: React.FC = () => {
  return <BasicLifeSupportPageContent />;
};

export default BasicLifeSupportPage;
