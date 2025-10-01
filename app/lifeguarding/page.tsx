import type { Metadata } from "next";
import type React from "react";
import LifeguardingPageContent from "@/components/LifeguardingPageContent";
import { getCourseSchema, getBreadcrumbSchema, renderJsonLd } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Lifeguard Certification Vancouver WA | Red Cross Lifeguarding Training",
  description:
    "Get Red Cross Lifeguard certification in Vancouver WA & San Luis Obispo CA. Professional lifeguard training for pools, waterparks & beaches. Serving Clark County, Battle Ground, Camas, Portland. Blended learning available.",
  keywords: [
    "Lifeguard certification Vancouver WA",
    "Red Cross lifeguarding Vancouver",
    "Lifeguard training courses Clark County",
    "Become a lifeguard Vancouver",
    "Lifeguard recertification Vancouver WA",
    "Aquatic emergency response training",
    "Water safety certification",
    "Professional lifeguard training Vancouver",
    "Lifeguard swimming prerequisites",
    "Taylored Instruction lifeguarding",
    "Vancouver WA lifeguard classes",
    "Clark County lifeguard certification",
    "Battle Ground lifeguard training",
    "Camas lifeguarding course",
    "Portland lifeguard certification",
    "San Luis Obispo lifeguard training",
    "CPR for professional rescuers",
    "Lifeguard instructor Vancouver",
  ],
  openGraph: {
    title: "Lifeguard Certification Vancouver WA | Red Cross Lifeguarding Training",
    description:
      "Get Red Cross Lifeguard certification in Vancouver WA. Professional aquatic safety training for pools, waterparks & beaches.",
    url: "https://tayloredinstruction.com/lifeguarding",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Red Cross Lifeguarding Certification Training in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lifeguard Certification Vancouver WA | Red Cross Lifeguarding",
    description:
      "Get Red Cross Lifeguard certification in Vancouver WA. Professional aquatic safety training.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/lifeguarding",
  },
};

const LifeguardingPage: React.FC = () => {
  const courseSchema = getCourseSchema(
    "American Red Cross Lifeguarding Certification",
    "Comprehensive lifeguard training including water rescue skills, CPR/AED for professional rescuers, first aid, and emergency response. Prepare for employment at pools, waterparks, beaches, and aquatic facilities. Includes CPR for the Professional Rescuer certification.",
    "American Red Cross Lifeguard Certification",
    "PT25H",
    "American Red Cross"
  );

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Lifeguarding", url: "https://tayloredinstruction.com/lifeguarding" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What are the prerequisites for lifeguard certification?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You must be at least 15 years old by the last day of class. Swimming prerequisites include: swim 300 yards continuously (front crawl and breaststroke), tread water for 2 minutes using only legs, and complete a timed event - starting in the water, swim 20 yards, surface dive to retrieve a 10-pound object, return to the surface, swim 20 yards back to the starting point with the object, and exit the water within 1 minute 40 seconds.",
        },
      },
      {
        "@type": "Question",
        name: "How long does lifeguard certification last?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Red Cross Lifeguarding certification is valid for 2 years. You can renew through a shorter review course before expiration.",
        },
      },
      {
        "@type": "Question",
        name: "Where do you offer lifeguard training?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Taylored Instruction offers lifeguard training in Vancouver, WA and surrounding Clark County areas including Battle Ground, Camas, and Washougal. We also offer seasonal lifeguard training in San Luis Obispo, CA. Classes require access to a pool facility.",
        },
      },
      {
        "@type": "Question",
        name: "What does lifeguard certification include?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Lifeguard certification includes water rescue skills, surveillance techniques, CPR/AED for Professional Rescuers, First Aid, spinal injury management, and emergency oxygen use. Upon completion, you receive Lifeguarding/First Aid/CPR/AED certification valid for 2 years.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(courseSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(faqSchema)}
      />
      <LifeguardingPageContent />
    </>
  );
};

export default LifeguardingPage;
