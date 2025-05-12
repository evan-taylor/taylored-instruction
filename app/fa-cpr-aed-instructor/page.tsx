import React from 'react';
import { Metadata } from 'next';
import FaCprAedInstructorPageContent from '@/components/FaCprAedInstructorPageContent';

// Extract metadata from the provided HTML
export const metadata: Metadata = {
  title: 'Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA - Taylored Instruction',
  description: 'Become a certified American Red Cross First Aid/CPR/AED Instructor with Taylored Instruction in Vancouver, WA. Train to teach others lifesaving skills.', // From <meta name="description">
  keywords: [
    'Red Cross CPR instructor course Vancouver WA',
    'First Aid instructor training',
    'AED instructor certification',
    'Become Red Cross instructor',
    'Teach First Aid CPR AED',
    'FA CPR AED instructor prerequisites',
    'Red Cross Learning Center',
    'Taylored Instruction Red Cross instructor',
    'Vancouver WA FA CPR AED instructor',
    'Clark County Red Cross instructor',
    'CPR instructor training'
  ],
  openGraph: {
    title: 'Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA - Taylored Instruction', // From og:title
    description: 'Become a certified American Red Cross First Aid/CPR/AED Instructor with Taylored Instruction in Vancouver, WA. Train to teach others lifesaving skills.', // From og:description
    url: 'https://tayloredinstruction.com/fa-cpr-aed-instructor/', // From og:url, ensured full path
    siteName: 'Taylored Instruction', // From og:site_name
    type: 'article', // From og:type
    images: [
      {
        url: '/og-image.png', // To be created
        width: 1200,
        height: 630,
        alt: 'Red Cross First Aid/CPR/AED Instructor Training',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image', // From twitter:card
    title: 'Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA - Taylored Instruction', // From twitter:title, corrected for consistency
    description: 'Become a certified American Red Cross First Aid/CPR/AED Instructor with Taylored Instruction in Vancouver, WA. Train to teach others lifesaving skills.', // From twitter:description, corrected for consistency
    images: ['/twitter-image-fa-cpr-aed-instructor.png'], // To be created
  },
  alternates: {
    canonical: 'https://www.tayloredinstruction.com/fa-cpr-aed-instructor/', // From <link rel="canonical">
  }
};

const FaCprAedInstructorPage: React.FC = () => {
  return <FaCprAedInstructorPageContent />;
};

export default FaCprAedInstructorPage; 