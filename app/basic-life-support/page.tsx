import React from 'react';
import { Metadata } from 'next';
import BasicLifeSupportPageContent from '@/components/BasicLifeSupportPageContent';

export const metadata: Metadata = {
  title: 'Red Cross Basic Life Support Course - Taylored Instruction',
  description: 'Learn essential Basic Life Support skills with our American Red Cross BLS course designed for healthcare providers in Vancouver, WA.',
  keywords: [
    'Basic Life Support Vancouver WA',
    'Red Cross BLS certification',
    'BLS for healthcare providers',
    'CPR for healthcare professionals',
    'BLS training',
    'American Red Cross BLS',
    'Respiratory arrest care',
    'Cardiac arrest care',
    'Airway obstruction training',
    'Opioid overdose response',
    'BLS course Vancouver WA',
    'Taylored Instruction BLS',
    'Vancouver WA BLS'
  ],
};

const BasicLifeSupportPage: React.FC = () => {
  return (
    <BasicLifeSupportPageContent />
  );
};

export default BasicLifeSupportPage; 