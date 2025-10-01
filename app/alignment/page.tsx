import type { Metadata } from "next";
import AlignmentPageContent from "@/components/AlignmentPageContent";

export const metadata: Metadata = {
  title: "Instructor Alignment Vancouver WA | Teach with Taylored Instruction",
  description:
    "Align with Taylored Instruction's American Red Cross LTP & AHA Training Site in Vancouver WA. CPR, BLS, First Aid & Lifeguard instructor opportunities. Strong support for aligned instructors in Clark County & San Luis Obispo.",
  keywords: [
    "Instructor alignment Taylored Instruction",
    "Teach with Taylored Instruction Vancouver",
    "CPR instructor affiliation Vancouver WA",
    "First Aid instructor alignment Clark County",
    "Lifeguard instructor opportunities Vancouver WA",
    "AHA Training Site alignment Vancouver WA",
    "Red Cross LTP alignment Vancouver WA",
    "Join Taylored Instruction team",
    "Safety training instructor partnership",
    "Clark County instructor alignment",
    "Battle Ground instructor opportunities",
    "San Luis Obispo instructor alignment",
    "BLS instructor affiliation",
  ],
  alternates: {
    canonical: "https://tayloredinstruction.com/alignment",
  },
  openGraph: {
    title: "Instructor Alignment with Taylored Instruction | Vancouver WA",
    description:
      "Align with Taylored Instruction to enhance your CPR, First Aid, or Lifeguard training courses. Offering strong support for instructors in Vancouver, WA.",
    url: "https://tayloredinstruction.com/alignment/",
    siteName: "Taylored Instruction",
    images: [
      {
        url: "https://tayloredinstruction.com/CPR-Training-Getty-Images-scaled.jpg",
        width: 1024,
        height: 683,
        alt: "Instructor Alignment - CPR Training Manikins",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Instructor Alignment with Taylored Instruction | Vancouver WA",
    description:
      "Align with Taylored Instruction to enhance your CPR, First Aid, or Lifeguard training courses. Offering strong support for instructors in Vancouver, WA.",
    images: [
      "https://tayloredinstruction.com/CPR-Training-Getty-Images-scaled.jpg",
    ],
  },
};

const AlignmentPage = () => {
  return <AlignmentPageContent />;
};

export default AlignmentPage;
