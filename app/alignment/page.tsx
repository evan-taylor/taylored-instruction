import React from 'react';
import type { Metadata } from 'next';
import AlignmentPageContent from '@/components/AlignmentPageContent';

export const metadata: Metadata = {
  title: "Instructor Alignment with Taylored Instruction | Vancouver WA",
  description: "Align with Taylored Instruction, an American Red Cross Licensed Training Provider and AHA Training Site in Vancouver, WA. Enhance your CPR, First Aid, or Lifeguard training courses with our support.",
  keywords: [
    'Instructor alignment Taylored Instruction',
    'Teach with Taylored Instruction',
    'CPR instructor affiliation Vancouver WA',
    'First Aid instructor alignment',
    'Lifeguard instructor opportunities Vancouver WA',
    'AHA Training Site alignment Vancouver WA',
    'Red Cross LTP alignment Vancouver WA',
    'Join Taylored Instruction team',
    'Safety training instructor partnership',
    'Clark County instructor alignment'
  ],
  alternates: {
    canonical: "https://tayloredinstruction.com/alignment/",
  },
  openGraph: {
    title: "Instructor Alignment with Taylored Instruction | Vancouver WA",
    description: "Align with Taylored Instruction to enhance your CPR, First Aid, or Lifeguard training courses. Offering strong support for instructors in Vancouver, WA.",
    url: "https://tayloredinstruction.com/alignment/",
    siteName: "Taylored Instruction",
    images: [
      {
        url: 'https://tayloredinstruction.com/CPR-Training-Getty-Images-scaled.jpg',
        width: 1024,
        height: 683,
        alt: 'Instructor Alignment - CPR Training Manikins',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Instructor Alignment with Taylored Instruction | Vancouver WA",
    description: "Align with Taylored Instruction to enhance your CPR, First Aid, or Lifeguard training courses. Offering strong support for instructors in Vancouver, WA.",
    images: ['https://tayloredinstruction.com/CPR-Training-Getty-Images-scaled.jpg'],
  },
};

const AlignmentPage = () => {
  return (
    <AlignmentPageContent />
  );
};

export default AlignmentPage; 