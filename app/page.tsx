import type { Metadata } from "next";
import { AboutSection } from "@/components/home/AboutSection";
import { CertificationsSection } from "@/components/home/CertificationsSection";
import { Hero } from "@/components/home/Hero";
import { ServicesSection } from "@/components/home/ServicesSection";
import { renderJsonLd } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
  description:
    "Get certified in CPR, BLS, First Aid, and Lifeguarding in Vancouver WA & San Luis Obispo CA. American Red Cross & AHA authorized training. Expert instruction from certified professionals serving Clark County WA and SLO County CA.",
  keywords: [
    "CPR training Vancouver WA",
    "BLS certification Vancouver WA",
    "Lifeguard training Vancouver WA",
    "First aid courses Vancouver WA",
    "CPR classes San Luis Obispo",
    "Taylored Instruction",
    "CPR classes",
    "AED training",
    "Basic Life Support",
    "Vancouver WA CPR",
    "Clark County CPR",
    "San Luis Obispo CPR training",
    "Battle Ground CPR",
    "Camas CPR classes",
    "Washougal first aid",
    "Portland CPR certification",
    "AHA BLS Vancouver",
    "Red Cross Vancouver WA",
    "Lifeguard certification Clark County",
    "Healthcare CPR Vancouver",
  ],
  openGraph: {
    title: "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
    description:
      "Get certified in CPR, BLS, First Aid, and Lifeguarding. American Red Cross & AHA authorized training provider in Vancouver WA and San Luis Obispo CA.",
    url: "https://tayloredinstruction.com",
    siteName: "Taylored Instruction",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taylored Instruction - CPR and Safety Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taylored Instruction | BLS/CPR Training in Vancouver WA & San Luis Obispo CA",
    description:
      "Get certified in CPR, BLS, First Aid, and Lifeguarding. American Red Cross & AHA authorized training provider.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com",
  },
};

export default function Home() {
  // FAQ Schema for homepage
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where does Taylored Instruction offer CPR training?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Taylored Instruction offers CPR, BLS, First Aid, and Lifeguarding training in Vancouver, WA and surrounding cities including Battle Ground, Camas, Washougal, Ridgefield, and Portland OR. We also offer seasonal training in San Luis Obispo, CA.",
        },
      },
      {
        "@type": "Question",
        name: "What certifications does Taylored Instruction offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We offer American Heart Association BLS and Heartsaver certifications, American Red Cross First Aid/CPR/AED, Lifeguarding, and various instructor-level certifications. All certifications are nationally recognized and valid for 2 years.",
        },
      },
      {
        "@type": "Question",
        name: "Is Taylored Instruction an authorized training provider?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Taylored Instruction is an American Red Cross Licensed Training Provider, American Heart Association Training Site (aligned with Resuscitation Group), and HSI Training Center.",
        },
      },
      {
        "@type": "Question",
        name: "How long does CPR certification take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Course duration varies: BLS courses are typically 4 hours, Heartsaver CPR/AED is 4-5 hours, and First Aid/CPR/AED courses are 5-6 hours. Blended learning options with online components can reduce in-person time to 2-3 hours.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(faqSchema)}
      />
      <Hero />
      <ServicesSection />
      <CertificationsSection />
      <AboutSection />
    </>
  );
}
