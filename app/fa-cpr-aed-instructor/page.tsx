import React from 'react';
import { Metadata } from 'next';
import FaCprAedInstructorPageContent from '@/components/FaCprAedInstructorPageContent';

// Extract metadata from the provided HTML
export const metadata: Metadata = {
  title: 'Red Cross First Aid/CPR/AED Instructor Course | Vancouver WA - Taylored Instruction', // From <title>
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
    url: 'https://www.tayloredinstruction.com/fa-cpr-aed-instructor/', // From og:url
    siteName: 'Taylored Instruction', // From og:site_name
    type: 'article', // From og:type
    // You might want to add an image here as well
  },
  twitter: {
    card: 'summary_large_image', // From twitter:card
    title: 'First Aid/CPR/AED Instructor Course - Taylored Instruction', // From twitter:title
    description: 'Become a certified CPR instructor with Taylored Instruction\'s Red Cross course in Vancouver, WA. Sign up today for expert training.', // From twitter:description
    // Add image if applicable
  },
  alternates: {
    canonical: 'https://www.tayloredinstruction.com/fa-cpr-aed-instructor/', // From <link rel="canonical">
  }
};

const FaCprAedInstructorPage: React.FC = () => {
  return <FaCprAedInstructorPageContent />;
};

export default FaCprAedInstructorPage; 