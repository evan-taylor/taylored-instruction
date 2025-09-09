import type { Metadata } from "next";
import LifeguardingInstructorPageContent from "@/components/LifeguardingInstructorPageContent";

export const metadata: Metadata = {
  title:
    "Lifeguarding Instructor Course | American Red Cross | Vancouver, WA & San Luis Obispo",
  description:
    "Become an American Red Cross Lifeguarding Instructor. Blended learning with online and in-person sessions in Vancouver, WA and San Luis Obispo, CA.",
  keywords: [
    "Lifeguarding Instructor",
    "Red Cross Lifeguarding Instructor course",
    "Lifeguard Instructor training",
    "Vancouver WA lifeguard instructor",
    "San Luis Obispo lifeguard instructor",
    "CPR AED for Professional Rescuers",
    "Aquatic safety instructor training",
  ],
  openGraph: {
    title:
      "Lifeguarding Instructor Course | American Red Cross | Vancouver, WA & San Luis Obispo",
    description:
      "Become an American Red Cross Lifeguarding Instructor. Blended learning with online and in-person sessions in Vancouver, WA and San Luis Obispo, CA.",
    url: "https://tayloredinstruction.com/lifeguarding-instructor/",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lifeguarding Instructor Course",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Lifeguarding Instructor Course | American Red Cross | Vancouver, WA & San Luis Obispo",
    description:
      "Become an American Red Cross Lifeguarding Instructor. Blended learning with online and in-person sessions in Vancouver, WA and San Luis Obispo, CA.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://www.tayloredinstruction.com/lifeguarding-instructor/",
  },
};

export default function Page() {
  return <LifeguardingInstructorPageContent />;
}
