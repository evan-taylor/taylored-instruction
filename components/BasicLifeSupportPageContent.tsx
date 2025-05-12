'use client'

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const BasicLifeSupportPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/CPR-Training-Stock-Photo-1-scaled.jpeg"
            alt="Basic Life Support Training Session"
            fill
            sizes="100vw"
            style={{objectFit: 'cover', objectPosition: 'center'}}
            className="brightness-[0.85]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 py-20 text-center">
          <div className="bg-black/30 backdrop-blur-sm p-8 md:p-10 rounded-xl max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              American Red Cross Basic Life Support
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Resource Links */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 text-center">
          <Link 
            href="/BLS-Fact-Sheet.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Course Fact Sheet
          </Link>
          <Link 
            href="/BLS-Participant-Manual.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Participant Manual
          </Link>
        </div>

        {/* Registration Button */}
        <div className="text-center mb-12">
          <Button
            href="https://www.hovn.app/service-providers/tayloredinstruction/offerings"
            target="_blank"
            size="lg"
          >
            View Current Offerings
          </Button>
        </div>

        {/* Course Purpose Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Purpose</h3>
          <p className="text-gray-700">
            The American Red Cross Basic Life Support (BLS) course provides participants with the knowledge and skills they need to assess, recognize and care for patients who are experiencing respiratory arrest, cardiac arrest, airway obstruction or opioid overdose. When a patient experiences a life-threatening emergency, healthcare providers need to act swiftly and promptly. The course emphasizes providing high-quality care and integrating psychomotor skills with critical thinking and problem solving to achieve the best possible patient outcomes.
          </p>
        </div>

        {/* Course Prerequisites Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Prerequisites</h3>
          <p className="text-gray-700">
            None
          </p>
        </div>

        {/* Course Length Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Length</h3>
          <p className="text-gray-700">
            Blended Learning: Approximately 2 hours online, 3 hours in-person
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicLifeSupportPageContent; 