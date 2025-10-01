import type { Metadata } from "next";
import type React from "react";
import FirstAidCprAedPageContent from "@/components/FirstAidCprAedPageContent";
import { getCourseSchema, getBreadcrumbSchema, renderJsonLd } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title:
    "First Aid/CPR/AED Certification Vancouver WA | Red Cross Training",
  description:
    "Get Red Cross First Aid/CPR/AED certification in Vancouver WA. Learn emergency response for cardiac, breathing & injury emergencies. Workplace safety training for Clark County, Battle Ground, Camas. Same-day certification.",
  keywords: [
    "First Aid CPR AED Vancouver WA",
    "Red Cross First Aid certification Vancouver",
    "CPR AED training Vancouver WA",
    "Emergency response course Clark County",
    "Workplace safety training Vancouver",
    "Blended learning CPR First Aid",
    "Cardiac emergency care training",
    "Breathing emergency care",
    "First aid for injuries Vancouver",
    "Taylored Instruction First Aid",
    "Vancouver WA CPR AED course",
    "Clark County First Aid training",
    "Battle Ground First Aid CPR",
    "Camas CPR certification",
    "Portland First Aid training",
    "Adult Pediatric First Aid CPR",
    "San Luis Obispo First Aid",
    "Red Cross blended learning Vancouver",
  ],
  openGraph: {
    title:
      "First Aid/CPR/AED Certification Vancouver WA | Red Cross Training",
    description:
      "Get Red Cross First Aid/CPR/AED certification in Vancouver WA. Emergency response training for cardiac, breathing & injury emergencies.",
    url: "https://tayloredinstruction.com/first-aid-cpr-aed",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "First Aid, CPR, and AED Training Session in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "First Aid/CPR/AED Certification Vancouver WA | Red Cross Training",
    description:
      "Get Red Cross First Aid/CPR/AED certification in Vancouver WA. Emergency response training for all ages.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/first-aid-cpr-aed",
  },
};

const FirstAidCprAedPage: React.FC = () => {
  const courseSchema = getCourseSchema(
    "American Red Cross Adult and Pediatric First Aid/CPR/AED",
    "Comprehensive First Aid, CPR, and AED training for adults and children. Learn to recognize and respond to cardiac emergencies, breathing emergencies, and common injuries. Perfect for workplace safety, childcare providers, teachers, and community members.",
    "Adult and Pediatric First Aid/CPR/AED Certification",
    "PT5H",
    "American Red Cross"
  );

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "First Aid/CPR/AED", url: "https://tayloredinstruction.com/first-aid-cpr-aed" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does First Aid/CPR/AED certification cover?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Red Cross First Aid/CPR/AED course covers CPR and AED use for adults, children, and infants, plus first aid for injuries and illnesses including bleeding, burns, fractures, allergic reactions, and medical emergencies. It's comprehensive training for workplace and community safety.",
        },
      },
      {
        "@type": "Question",
        name: "How long is First Aid/CPR/AED certification valid?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Red Cross First Aid/CPR/AED certification is valid for 2 years. You can renew your certification through a recertification course before it expires.",
        },
      },
      {
        "@type": "Question",
        name: "What is blended learning for First Aid/CPR/AED?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Blended learning combines online coursework (completed at your own pace) with a shorter in-person skills session. The online portion takes about 2-3 hours, and the in-person session takes 2-3 hours, making it more convenient than the traditional 5-6 hour in-person only class.",
        },
      },
      {
        "@type": "Question",
        name: "Where do you offer First Aid/CPR/AED training in Vancouver WA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Taylored Instruction offers First Aid/CPR/AED training throughout Vancouver, WA and surrounding cities including Battle Ground, Camas, Washougal, Ridgefield, La Center, and Portland, OR. We also provide seasonal training in San Luis Obispo, CA and can bring training to your workplace.",
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
      <FirstAidCprAedPageContent />
    </>
  );
};

export default FirstAidCprAedPage;
