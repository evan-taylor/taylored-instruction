import type { Metadata } from "next";
import type React from "react";
import AhaInstructorTrainingPageContent from "@/components/AhaInstructorTrainingPageContent";

export const metadata: Metadata = {
  title:
    "AHA Instructor Training Vancouver WA | Become BLS & Heartsaver Instructor",
  description:
    "Become an AHA certified CPR instructor in Vancouver WA. BLS & Heartsaver instructor courses. Teach lifesaving skills with American Heart Association certification. Serving Clark County, Battle Ground, Camas & San Luis Obispo.",
  keywords: [
    "AHA instructor training Vancouver WA",
    "Become CPR instructor Vancouver",
    "BLS instructor course Vancouver WA",
    "Heartsaver instructor course Vancouver WA",
    "Teach CPR classes Vancouver",
    "American Heart Association instructor certification",
    "Lifesaving skills instructor Clark County",
    "CPR instructor prerequisites",
    "AHA Training Faculty Vancouver",
    "Taylored Instruction AHA instructor",
    "Vancouver WA instructor training",
    "Clark County CPR instructor training",
    "Battle Ground instructor course",
    "San Luis Obispo AHA instructor",
    "BLS instructor certification",
    "Heartsaver instructor certification",
  ],
  openGraph: {
    title:
      "AHA Instructor Training Vancouver WA | Become BLS & Heartsaver Instructor",
    description:
      "Become an AHA certified CPR instructor. BLS & Heartsaver instructor courses in Vancouver WA.",
    url: "https://tayloredinstruction.com/aha-instructor-training",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AHA CPR Instructor Training Session in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AHA Instructor Training Vancouver WA | Become CPR Instructor",
    description:
      "Become an AHA certified CPR instructor. BLS & Heartsaver instructor courses.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/aha-instructor-training",
  },
};

const AhaInstructorTrainingPage: React.FC = () => {
  return <AhaInstructorTrainingPageContent />;
};

export default AhaInstructorTrainingPage;
