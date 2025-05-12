import React from 'react';
import { Metadata } from 'next';
import FirstAidCprAedPageContent from '@/components/FirstAidCprAedPageContent';

export const metadata: Metadata = {
  title: 'First Aid/CPR/AED Certification Course | Vancouver WA - Taylored Instruction',
  description: 'Learn to respond to cardiac, breathing, and first aid emergencies with the American Red Cross First Aid/CPR/AED course at Taylored Instruction in Vancouver, WA. Gain life-saving skills.',
  keywords: [
    'First Aid CPR AED Vancouver WA',
    'Red Cross First Aid certification',
    'CPR and AED training',
    'Emergency response course',
    'Workplace safety training',
    'Blended learning CPR First Aid',
    'Cardiac emergency care',
    'Breathing emergency care',
    'First aid for injuries',
    'Taylored Instruction First Aid',
    'Vancouver WA CPR AED',
    'Clark County First Aid'
  ],
  openGraph: {
    title: 'First Aid/CPR/AED Certification Course | Vancouver WA - Taylored Instruction',
    description: 'Learn to respond to cardiac, breathing, and first aid emergencies with the American Red Cross First Aid/CPR/AED course at Taylored Instruction in Vancouver, WA. Gain life-saving skills.',
    url: 'https://tayloredinstruction.com/first-aid-cpr-aed',
    siteName: 'Taylored Instruction',
    type: 'article',
    images: [
      {
        url: '/og-image-first-aid-cpr-aed.png', // To be created
        width: 1200,
        height: 630,
        alt: 'First Aid, CPR, and AED Training Session',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'First Aid/CPR/AED Certification Course | Vancouver WA - Taylored Instruction',
    description: 'Learn to respond to cardiac, breathing, and first aid emergencies with the American Red Cross First Aid/CPR/AED course at Taylored Instruction in Vancouver, WA. Gain life-saving skills.',
    images: ['/twitter-image-first-aid-cpr-aed.png'], // To be created
  },
  alternates: {
    canonical: 'https://tayloredinstruction.com/first-aid-cpr-aed',
  }
};

const FirstAidCprAedPage: React.FC = () => {
  return (
    <FirstAidCprAedPageContent />
  );
};

export default FirstAidCprAedPage; 