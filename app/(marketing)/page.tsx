"use cache";

import { cacheLife } from "next/cache";
import { AboutSection } from "@/components/home/AboutSection";
import { CertificationsSection } from "@/components/home/CertificationsSection";
import { Hero } from "@/components/home/Hero";
import { ServicesSection } from "@/components/home/ServicesSection";
import { buildPageMetadata } from "@/lib/seo";
import { generateJSONLD, getWebPageSchema } from "@/lib/structuredData";

const pageTitle = "CPR & BLS Training in Vancouver WA | Taylored Instruction";
const pageDescription =
  "Get certified in CPR, BLS, First Aid, and Lifeguarding with American Red Cross and AHA courses in Vancouver WA, Clark County, and San Luis Obispo County.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/",
  keywords: [
    "CPR classes Clark County WA",
    "BLS classes for healthcare providers",
    "First Aid CPR AED certification classes",
    "lifeguard training courses Vancouver WA",
    "CPR training Portland metro",
    "CPR classes San Luis Obispo County",
    "corporate CPR training on-site",
    "same-day CPR certification cards",
  ],
  image: {
    title: "Professional CPR, BLS & Lifeguard Training",
    eyebrow: "Red Cross & AHA certified",
  },
});

export default async function Home() {
  cacheLife("days");
  const homePageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/",
  });

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(homePageSchema)}
        type="application/ld+json"
      />
      <Hero />
      <ServicesSection />
      <CertificationsSection />
      <AboutSection />
    </>
  );
}
