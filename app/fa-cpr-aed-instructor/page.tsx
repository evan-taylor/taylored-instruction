import type { Metadata } from "next";
import type React from "react";
import FaCprAedInstructorPageContent from "@/components/FaCprAedInstructorPageContent";

// Extract metadata from the provided HTML
export const metadata: Metadata = {
  title:
    "Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA & San Luis Obispo CA - Become a Certified Instructor",
  description:
    "Become a certified American Red Cross First Aid/CPR/AED Instructor in Vancouver WA, Clark County & San Luis Obispo CA. Teach lifesaving skills with Taylored Instruction. Red Cross Learning Center approved. Comprehensive instructor training.",
  keywords: [
    "Red Cross CPR instructor course Vancouver WA",
    "First Aid instructor training",
    "AED instructor certification",
    "Become Red Cross instructor",
    "Teach First Aid CPR AED",
    "FA CPR AED instructor prerequisites",
    "Red Cross Learning Center",
    "Taylored Instruction Red Cross instructor",
    "Vancouver WA FA CPR AED instructor",
    "Clark County Red Cross instructor",
    "CPR instructor training",
    "First Aid instructor San Luis Obispo",
    "Red Cross instructor certification",
    "Teach CPR classes",
    "Become First Aid instructor",
  ],
  openGraph: {
    title:
      "Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA & San Luis Obispo CA",
    description:
      "Become a certified American Red Cross First Aid/CPR/AED Instructor. Teach lifesaving skills in Vancouver WA & San Luis Obispo CA.",
    url: "https://tayloredinstruction.com/fa-cpr-aed-instructor",
    siteName: "Taylored Instruction",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Red Cross First Aid/CPR/AED Instructor Training - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA & San Luis Obispo CA",
    description:
      "Become a certified American Red Cross First Aid/CPR/AED Instructor. Teach lifesaving skills today!",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/fa-cpr-aed-instructor",
  },
};

const FaCprAedInstructorPage: React.FC = () => (
  <FaCprAedInstructorPageContent />
);

export default FaCprAedInstructorPage;
