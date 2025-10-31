"use cache";

import type { Metadata } from "next";
import AhaInstructorTrainingPageContent from "@/components/AhaInstructorTrainingPageContent";

export const metadata: Metadata = {
  title:
    "AHA Instructor Training Vancouver WA & San Luis Obispo CA | Become a Certified CPR Instructor",
  description:
    "Become an American Heart Association (AHA) BLS or Heartsaver® instructor in Vancouver WA, Clark County & San Luis Obispo CA. Teach lifesaving CPR skills with Taylored Instruction. AHA Training Faculty approved. Start your CPR instructor career today!",
  keywords: [
    "AHA instructor training Vancouver WA",
    "Become CPR instructor",
    "BLS instructor course Vancouver WA",
    "Heartsaver instructor course Vancouver WA",
    "Teach CPR classes",
    "American Heart Association instructor certification",
    "Lifesaving skills instructor",
    "CPR instructor prerequisites",
    "AHA Training Faculty",
    "Taylored Instruction AHA instructor",
    "Vancouver WA instructor training",
    "Clark County CPR instructor",
    "AHA instructor San Luis Obispo",
    "Become BLS instructor",
    "Become Heartsaver instructor",
    "CPR instructor certification",
    "AHA instructor course",
    "Teach BLS classes",
    "AHA Training Center Vancouver",
  ],
  openGraph: {
    title:
      "AHA Instructor Training Vancouver WA & San Luis Obispo CA | Become a CPR Instructor",
    description:
      "Become an American Heart Association BLS or Heartsaver® instructor. Teach lifesaving CPR skills in Vancouver WA & San Luis Obispo CA.",
    url: "https://tayloredinstruction.com/aha-instructor-training",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AHA CPR Instructor Training - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AHA Instructor Training Vancouver WA & San Luis Obispo CA",
    description:
      "Become an American Heart Association CPR instructor. Teach lifesaving skills today!",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/aha-instructor-training",
  },
};

const AhaInstructorTrainingPage = async () => (
  <AhaInstructorTrainingPageContent />
);

export default AhaInstructorTrainingPage;
