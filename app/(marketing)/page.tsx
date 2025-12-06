"use cache";

import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { AboutSection } from "@/components/home/AboutSection";
import { CertificationsSection } from "@/components/home/CertificationsSection";
import { Hero } from "@/components/home/Hero";
import { ServicesSection } from "@/components/home/ServicesSection";
import { generateOgImageUrl } from "@/lib/utils";

const ogImageUrl = generateOgImageUrl({
  title: "Professional CPR, BLS & Lifeguard Training",
  description:
    "American Red Cross & AHA Certified Training in Vancouver WA & San Luis Obispo CA",
});

export const metadata: Metadata = {
  title:
    "Taylored Instruction | Professional CPR, BLS & Lifeguard Training in Vancouver WA & San Luis Obispo CA",
  description:
    "Get certified in CPR, BLS, First Aid & Lifeguarding with Taylored Instruction. American Red Cross & AHA Training in Vancouver WA, Clark County, San Luis Obispo CA & surrounding areas. Expert instruction, flexible scheduling.",
  keywords: [
    "CPR training Vancouver WA",
    "BLS certification Vancouver WA",
    "Lifeguard training Vancouver WA",
    "First aid courses Vancouver WA",
    "CPR classes San Luis Obispo",
    "BLS San Luis Obispo CA",
    "Taylored Instruction",
    "AHA training Vancouver",
    "Red Cross training Vancouver",
    "CPR certification Clark County",
    "CPR training Camas WA",
    "CPR training Battle Ground WA",
    "CPR training Ridgefield WA",
    "CPR training Portland OR",
    "Lifeguard certification San Luis Obispo",
    "Corporate CPR training Vancouver",
    "Healthcare CPR certification",
    "AED training Vancouver WA",
    "Basic Life Support Vancouver",
    "First responder training",
    "Workplace safety training",
    "CPR training Pismo Beach",
    "CPR training Arroyo Grande",
    "CPR training Morro Bay",
    "San Luis Obispo County CPR",
  ],
  alternates: {
    canonical: "https://tayloredinstruction.com",
  },
  openGraph: {
    title: "Taylored Instruction | Professional CPR, BLS & Lifeguard Training",
    description:
      "Get certified in CPR, BLS, First Aid & Lifeguarding. American Red Cross & AHA Training in Vancouver WA, San Luis Obispo CA & surrounding areas.",
    url: "https://tayloredinstruction.com",
    siteName: "Taylored Instruction",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Taylored Instruction - Professional CPR & Lifeguard Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taylored Instruction | Professional CPR, BLS & Lifeguard Training",
    description:
      "Get certified in CPR, BLS, First Aid & Lifeguarding. American Red Cross & AHA Training in Vancouver WA & San Luis Obispo CA.",
    images: [ogImageUrl],
  },
};

export default async function Home() {
  cacheLife("days");
  return (
    <>
      <Hero />
      <ServicesSection />
      <CertificationsSection />
      <AboutSection />
    </>
  );
}
