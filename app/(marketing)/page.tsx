"use cache";

import { cacheLife } from "next/cache";
import { AboutSection } from "@/components/home/AboutSection";
import { CertificationsSection } from "@/components/home/CertificationsSection";
import { Hero } from "@/components/home/Hero";
import { ServicesSection } from "@/components/home/ServicesSection";
import { buildPageMetadata } from "@/lib/seo";
import { generateJSONLD, getWebPageSchema } from "@/lib/structuredData";

const pageTitle =
  "Taylored Instruction | CPR, BLS, First Aid & Lifeguard Training in Vancouver WA & San Luis Obispo CA";
const pageDescription =
  "Get certified in CPR, BLS, First Aid, and Lifeguarding with American Red Cross and AHA courses in Vancouver WA, Clark County, Portland metro, and San Luis Obispo County.";

export const metadata = buildPageMetadata({
  description: pageDescription,
  image: {
    description:
      "American Red Cross & AHA certified courses in Vancouver WA and San Luis Obispo CA",
    title: "Professional CPR, BLS & Lifeguard Training",
  },
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
  path: "/",
  title: pageTitle,
});

export default async function Home() {
  cacheLife("days");
  const homePageSchema = getWebPageSchema({
    description: pageDescription,
    name: pageTitle,
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
