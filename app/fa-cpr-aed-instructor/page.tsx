import type { Metadata } from "next";
import type React from "react";
import FaCprAedInstructorPageContent from "@/components/FaCprAedInstructorPageContent";

export const metadata: Metadata = {
  title:
    "Red Cross Instructor Training Vancouver WA | First Aid CPR AED Instructor",
  description:
    "Become a Red Cross First Aid/CPR/AED Instructor in Vancouver WA. Train to teach lifesaving skills. American Red Cross instructor certification. Serving Clark County, Battle Ground, Camas & San Luis Obispo.",
  keywords: [
    "Red Cross CPR instructor course Vancouver WA",
    "First Aid instructor training Vancouver",
    "AED instructor certification Clark County",
    "Become Red Cross instructor Vancouver",
    "Teach First Aid CPR AED Vancouver",
    "FA CPR AED instructor prerequisites",
    "Red Cross Learning Center Vancouver",
    "Taylored Instruction Red Cross instructor",
    "Vancouver WA FA CPR AED instructor",
    "Clark County Red Cross instructor",
    "CPR instructor training Vancouver",
    "Battle Ground instructor training",
    "San Luis Obispo Red Cross instructor",
    "Instructor Trainer Vancouver",
  ],
  openGraph: {
    title:
      "Red Cross Instructor Training Vancouver WA | First Aid CPR AED Instructor",
    description:
      "Become a Red Cross First Aid/CPR/AED Instructor. Train to teach lifesaving skills in Vancouver WA.",
    url: "https://tayloredinstruction.com/fa-cpr-aed-instructor",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Red Cross First Aid/CPR/AED Instructor Training in Vancouver WA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Red Cross Instructor Training Vancouver WA | First Aid CPR AED",
    description:
      "Become a Red Cross First Aid/CPR/AED Instructor. Train to teach lifesaving skills.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/fa-cpr-aed-instructor",
  },
};

const FaCprAedInstructorPage: React.FC = () => {
  return <FaCprAedInstructorPageContent />;
};

export default FaCprAedInstructorPage;
