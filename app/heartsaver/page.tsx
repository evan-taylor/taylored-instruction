import type { Metadata } from "next";
import HeartsaverPageContent from "@/components/HeartsaverPageContent";
import { getCourseSchema, getBreadcrumbSchema, renderJsonLd } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title:
    "AHA Heartsaver CPR AED Vancouver WA | First Aid Certification",
  description:
    "Get AHA Heartsaver CPR, AED & First Aid certification in Vancouver WA. Workplace safety training for non-medical personnel. Serving Clark County, Battle Ground, Camas, Portland. Blended learning & in-person options.",
  keywords: [
    "Heartsaver CPR AED Vancouver WA",
    "AHA Heartsaver certification Vancouver",
    "First Aid training Vancouver WA",
    "CPR non-medical personnel",
    "AED lay responders Vancouver",
    "Workplace first aid CPR Clark County",
    "Community CPR classes Vancouver",
    "Infant child CPR Vancouver WA",
    "Blended learning Heartsaver",
    "Taylored Instruction Heartsaver",
    "Clark County Heartsaver CPR",
    "Battle Ground Heartsaver",
    "Camas CPR AED training",
    "Portland Heartsaver course",
    "San Luis Obispo Heartsaver",
    "Heartsaver total course",
    "Workplace CPR certification",
  ],
  openGraph: {
    title:
      "AHA Heartsaver CPR AED Vancouver WA | First Aid Certification",
    description:
      "Get AHA Heartsaver CPR, AED & First Aid certification in Vancouver WA. Workplace safety training for the community.",
    url: "https://tayloredinstruction.com/heartsaver",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AHA Heartsaver CPR AED Training Session in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AHA Heartsaver CPR AED Vancouver WA | First Aid Certification",
    description:
      "Get AHA Heartsaver CPR, AED & First Aid certification in Vancouver WA. Workplace safety training.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/heartsaver",
  },
};

export default function HeartsaverPage() {
  const courseSchema = getCourseSchema(
    "American Heart Association Heartsaver® CPR AED First Aid",
    "Heartsaver courses train workplace employees and community members to respond to cardiac and first aid emergencies. Learn adult, child, and infant CPR, AED use, and basic first aid. Perfect for teachers, coaches, daycare workers, and anyone wanting to learn lifesaving skills.",
    "Heartsaver CPR AED First Aid Certification",
    "PT5H",
    "American Heart Association"
  );

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Heartsaver", url: "https://tayloredinstruction.com/heartsaver" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the difference between Heartsaver and BLS?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Heartsaver is designed for non-medical personnel including workplace employees, teachers, coaches, and community members. BLS is for healthcare providers and includes advanced techniques. If you work in healthcare, you typically need BLS. If you need certification for work, childcare, or personal knowledge, Heartsaver is appropriate.",
        },
      },
      {
        "@type": "Question",
        name: "How long is Heartsaver certification valid?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AHA Heartsaver certification is valid for 2 years from the date of issue. You can renew your certification before it expires.",
        },
      },
      {
        "@type": "Question",
        name: "What Heartsaver courses do you offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We offer Heartsaver CPR AED (adult, child, and infant), Heartsaver First Aid CPR AED (combined course), and Heartsaver Total (includes pediatric and additional content). Courses are available in traditional in-person format or blended learning with online and in-person components.",
        },
      },
      {
        "@type": "Question",
        name: "Where do you teach Heartsaver courses in Vancouver WA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Taylored Instruction offers Heartsaver courses throughout Vancouver, WA and surrounding areas including Battle Ground, Camas, Washougal, Ridgefield, and Portland, OR. We also provide training in San Luis Obispo, CA. We can bring training to your workplace or organization.",
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
      <HeartsaverPageContent />
    </>
  );
}
