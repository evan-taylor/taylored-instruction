import type { Metadata } from "next";
import BlsPageContent from "@/components/BlsPageContent";
import { getCourseSchema, getBreadcrumbSchema, renderJsonLd } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title:
    "AHA BLS Course Vancouver WA | Healthcare Provider CPR Certification",
  description:
    "Get AHA BLS certification in Vancouver WA for healthcare professionals & first responders. American Heart Association Basic Life Support training. Serving Clark County, Battle Ground, Camas, Portland. Same-day certification available.",
  keywords: [
    "AHA BLS Vancouver WA",
    "Basic Life Support healthcare providers",
    "BLS certification AHA Vancouver",
    "CPR medical professionals Vancouver WA",
    "AHA BLS renewal Vancouver WA",
    "Healthcare CPR certification Clark County",
    "First responder BLS Vancouver",
    "BLS blended learning AHA",
    "Taylored Instruction AHA BLS",
    "Vancouver WA BLS healthcare",
    "Clark County BLS certification",
    "Battle Ground BLS training",
    "Camas BLS course",
    "Portland BLS certification",
    "HeartCode BLS Vancouver",
    "BLS for nurses Vancouver WA",
    "BLS for EMT Vancouver",
    "San Luis Obispo BLS training",
  ],
  openGraph: {
    title:
      "AHA BLS Course Vancouver WA | Healthcare Provider CPR Certification",
    description:
      "Get AHA BLS certification in Vancouver WA for healthcare professionals. American Heart Association training. Same-day certification.",
    url: "https://tayloredinstruction.com/bls",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AHA BLS Training Session for Healthcare Professionals in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AHA BLS Course Vancouver WA | Healthcare Provider CPR Certification",
    description:
      "Get AHA BLS certification in Vancouver WA for healthcare professionals. American Heart Association training.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/bls",
  },
};

export default function BlsPage() {
  const courseSchema = getCourseSchema(
    "American Heart Association Basic Life Support (BLS) for Healthcare Providers",
    "Comprehensive BLS training for healthcare professionals covering high-quality CPR, AED use, and relief of choking for adults, children, and infants. Required certification for nurses, doctors, EMTs, paramedics, and other healthcare providers.",
    "BLS for Healthcare Providers Certification",
    "PT4H",
    "American Heart Association"
  );

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "BLS Certification", url: "https://tayloredinstruction.com/bls" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is BLS certification?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "BLS (Basic Life Support) is an American Heart Association certification for healthcare providers and first responders. It covers high-quality CPR, AED use, and choking relief for all age groups. BLS certification is required for most healthcare positions including nurses, doctors, EMTs, and paramedics.",
        },
      },
      {
        "@type": "Question",
        name: "How long does BLS certification last?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "BLS certification is valid for 2 years from the date of issue. After 2 years, healthcare providers must renew their certification through a BLS renewal course.",
        },
      },
      {
        "@type": "Question",
        name: "Where do you offer BLS training in Vancouver WA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Taylored Instruction offers BLS training throughout Vancouver, WA and surrounding areas including Battle Ground, Camas, Washougal, Ridgefield, and Portland, OR. We also offer seasonal training in San Luis Obispo, CA. Classes can be held at our training facility or at your workplace.",
        },
      },
      {
        "@type": "Question",
        name: "What is the difference between BLS and Heartsaver CPR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "BLS is designed for healthcare providers and includes advanced techniques like 2-person CPR, bag-mask ventilation, and team dynamics. Heartsaver CPR is for the general public, workplace employees, and non-medical personnel. Healthcare providers typically need BLS certification.",
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
      <BlsPageContent />
    </>
  );
}
