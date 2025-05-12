import { Metadata } from 'next';
import HeartsaverPageContent from '@/components/HeartsaverPageContent'; // Import the new client component

// Extracted from <title> and <meta name="description">
export const metadata: Metadata = {
  title: "AHA Heartsaver First Aid CPR AED | Vancouver WA - Taylored Instruction",
  description: "Taylored Instruction offers AHA Heartsaver® First Aid, CPR, and AED courses in Vancouver, WA, for individuals needing certification for work or personal preparedness. Learn life-saving skills.",
  keywords: [
    'Heartsaver CPR AED Vancouver WA',
    'AHA Heartsaver certification',
    'First Aid training Vancouver WA',
    'CPR for non-medical personnel',
    'AED for lay responders',
    'Workplace first aid CPR',
    'Community CPR classes',
    'Infant child CPR Vancouver WA',
    'Blended learning Heartsaver',
    'Taylored Instruction Heartsaver',
    'Clark County Heartsaver'
  ],
  openGraph: {
    title: "AHA Heartsaver First Aid CPR AED | Vancouver WA - Taylored Instruction",
    description: "Taylored Instruction offers AHA Heartsaver® First Aid, CPR, and AED courses in Vancouver, WA, for individuals needing certification for work or personal preparedness. Learn life-saving skills.",
    url: 'https://tayloredinstruction.com/heartsaver',
    siteName: 'Taylored Instruction',
    type: 'article',
    images: [
      {
        url: '/og-image-heartsaver.png', // To be created
        width: 1200,
        height: 630,
        alt: 'AHA Heartsaver CPR AED Training Session',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AHA Heartsaver First Aid CPR AED | Vancouver WA - Taylored Instruction",
    description: "Taylored Instruction offers AHA Heartsaver® First Aid, CPR, and AED courses in Vancouver, WA, for individuals needing certification for work or personal preparedness. Learn life-saving skills.",
    images: ['/twitter-image-heartsaver.png'], // To be created
  },
  alternates: {
    canonical: 'https://tayloredinstruction.com/heartsaver',
  }
};

export default function HeartsaverPage() {
  return <HeartsaverPageContent />; // Render the client component
} 