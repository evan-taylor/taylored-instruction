import React from 'react';
import { Metadata } from 'next';
import AhaInstructorTrainingPageContent from '@/components/AhaInstructorTrainingPageContent';

export const metadata: Metadata = {
  title: 'AHA Instructor Training | Become a Certified CPR Instructor - Vancouver WA',
  description: 'Join Taylored Instruction in Vancouver, WA to teach lifesaving skills as an American Heart Association (AHA) instructor for BLS or Heartsaver® courses. Start your journey today!',
  keywords: [
    'AHA instructor training Vancouver WA',
    'Become CPR instructor',
    'BLS instructor course Vancouver WA',
    'Heartsaver instructor course Vancouver WA',
    'Teach CPR classes',
    'American Heart Association instructor certification',
    'Lifesaving skills instructor',
    'CPR instructor prerequisites',
    'AHA Training Faculty',
    'Taylored Instruction AHA instructor',
    'Vancouver WA instructor training',
    'Clark County CPR instructor'
  ],
  openGraph: {
    title: 'AHA Instructor Training | Become a Certified CPR Instructor - Vancouver WA',
    description: 'Join Taylored Instruction in Vancouver, WA to teach lifesaving skills as an American Heart Association (AHA) instructor for BLS or Heartsaver® courses.',
    url: 'https://tayloredinstruction.com/aha-instructor-training',
    siteName: 'Taylored Instruction',
    type: 'article',
    images: [
      {
        url: '/og-image.png', // To be created
        width: 1200,
        height: 630,
        alt: 'AHA CPR Instructor Training Session',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AHA Instructor Training | Become a Certified CPR Instructor - Vancouver WA',
    description: 'Join Taylored Instruction in Vancouver, WA to teach lifesaving skills as an American Heart Association (AHA) instructor for BLS or Heartsaver® courses.',
    images: ['/twitter-image.png'], // To be created
  },
  alternates: {
    canonical: 'https://tayloredinstruction.com/aha-instructor-training',
  }
};

const AhaInstructorTrainingPage: React.FC = () => {
  return (
    <AhaInstructorTrainingPageContent />
  );
};

export default AhaInstructorTrainingPage; 