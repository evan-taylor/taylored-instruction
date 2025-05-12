import { Metadata } from 'next';
import BlsPageContent from '@/components/BlsPageContent'; // Import the new client component

export const metadata: Metadata = {
  title: "AHA BLS Course | Vancouver WA for Healthcare Professionals - Taylored Instruction",
  description: "Taylored Instruction offers American Heart Association (AHA) BLS courses in Vancouver, WA, for healthcare professionals and first responders. Renew or get your BLS certification.",
  keywords: [
    'AHA BLS Vancouver WA',
    'Basic Life Support for healthcare providers',
    'BLS certification AHA',
    'CPR for medical professionals Vancouver WA',
    'AHA BLS renewal Vancouver WA',
    'Healthcare CPR certification',
    'First responder BLS',
    'BLS blended learning AHA',
    'Taylored Instruction AHA BLS',
    'Vancouver WA BLS for healthcare',
    'Clark County BLS'
  ],
  openGraph: {
    title: "AHA BLS Course | Vancouver WA for Healthcare Professionals - Taylored Instruction",
    description: "Taylored Instruction offers American Heart Association (AHA) BLS courses in Vancouver, WA, for healthcare professionals and first responders.",
    url: 'https://tayloredinstruction.com/bls',
    siteName: 'Taylored Instruction',
    type: 'article',
    images: [
      {
        url: '/og-image.png', // To be created
        width: 1200,
        height: 630,
        alt: 'AHA BLS Training Session for Healthcare Professionals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AHA BLS Course | Vancouver WA for Healthcare Professionals - Taylored Instruction",
    description: "Taylored Instruction offers American Heart Association (AHA) BLS courses in Vancouver, WA, for healthcare professionals and first responders.",
    images: ['/twitter-image.png'], // To be created
  },
  alternates: {
    canonical: 'https://tayloredinstruction.com/bls',
  }
};

export default function BlsPage() {
  return <BlsPageContent />; // Render the client component
} 