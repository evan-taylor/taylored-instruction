import type { Metadata } from "next";
import LifeguardingInstructorPageContent from "@/components/LifeguardingInstructorPageContent";

export const metadata: Metadata = {
  title:
    "Lifeguarding Instructor Course Vancouver WA | Red Cross Instructor Training",
  description:
    "Become a Red Cross Lifeguarding Instructor in Vancouver WA & San Luis Obispo CA. Train to teach lifeguard certification. Blended learning available. Serving Clark County, Battle Ground, Camas & Portland.",
  keywords: [
    "Lifeguarding Instructor Vancouver WA",
    "Red Cross Lifeguarding Instructor course",
    "Lifeguard Instructor training Vancouver",
    "Vancouver WA lifeguard instructor course",
    "San Luis Obispo lifeguard instructor",
    "CPR AED for Professional Rescuers instructor",
    "Aquatic safety instructor training",
    "Teach lifeguarding Vancouver",
    "Clark County lifeguard instructor",
    "Battle Ground instructor training",
    "Lifeguard instructor certification",
    "Red Cross aquatic instructor",
  ],
  openGraph: {
    title:
      "Lifeguarding Instructor Course Vancouver WA | Red Cross Training",
    description:
      "Become a Red Cross Lifeguarding Instructor. Train to teach lifeguard certification in Vancouver WA.",
    url: "https://tayloredinstruction.com/lifeguarding-instructor",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lifeguarding Instructor Course in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Lifeguarding Instructor Course Vancouver WA | Red Cross",
    description:
      "Become a Red Cross Lifeguarding Instructor. Train to teach lifeguard certification.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/lifeguarding-instructor",
  },
};

export default function Page() {
  return <LifeguardingInstructorPageContent />;
}
