import React from 'react';
import { Metadata } from 'next';
import LifeguardingPageContent from '@/components/LifeguardingPageContent';

// Extract metadata from the provided HTML
export const metadata: Metadata = {
  title: 'Lifeguarding Certification in Vancouver, WA',
  description: 'Explore Red Cross lifeguarding classes for certification. Become a certified lifeguard with us today with our experienced instructors!',
  keywords: [
    'Lifeguard certification Vancouver WA',
    'Red Cross lifeguarding',
    'Lifeguard training courses',
    'Become a lifeguard',
    'Lifeguard recertification Vancouver WA',
    'Aquatic emergency response',
    'Water safety certification',
    'Professional lifeguard training',
    'Lifeguard swimming prerequisites',
    'Taylored Instruction lifeguarding',
    'Vancouver WA lifeguard classes',
    'Clark County lifeguard'
  ],
  // Add other relevant metadata extracted from HTML if needed
  // e.g., openGraph data
  openGraph: {
    title: 'Lifeguarding Certification in Vancouver, WA',
    description: 'Explore Red Cross lifeguarding classes for certification. Become a certified lifeguard with us today with our experienced instructors!',
    url: 'https://www.tayloredinstruction.com/lifeguarding/', // Use your actual URL
    siteName: 'Taylored Instruction',
    type: 'article',
    // You might want to add an image here as well
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lifeguarding Certification in Vancouver, WA',
    description: 'Explore Red Cross lifeguarding classes for certification. Become a certified lifeguard with us today with our experienced instructors!',
    // Add image if applicable
  },
  alternates: {
    canonical: 'https://www.tayloredinstruction.com/lifeguarding/', // Use your actual URL
  }
};

const LifeguardingPage: React.FC = () => {
  return <LifeguardingPageContent />;
};

export default LifeguardingPage; 