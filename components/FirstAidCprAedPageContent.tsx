'use client'

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const FirstAidCprAedPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/CPR-Training-Image.jpeg"
            alt="First Aid CPR AED Training Session"
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
              American Red Cross First Aid/CPR/AED
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 text-center">
          <Link 
            href="/First-Aid-CPR-AED-Fact-Sheet.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Course Fact Sheet
          </Link>
          <Link 
            href="/First-Aid-CPR-AED-Manual.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Ebook Access Instructions
          </Link>
        </div>

        <div className="text-center mb-12">
          <Button
            href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm408sfgn0000ggkzk66s7no4"
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
            The American Red Cross First Aid/CPR/AED r.21 program is designed to help participants recognize and respond appropriately to cardiac, breathing and first aid emergencies. The courses in this program teach participants the knowledge and skills needed to give immediate care to an injured or ill person when minutes matter, and to decide whether advanced medical care is needed. This program offers a choice of First Aid, CPR and AED courses in traditional classroom or blended learning (online learning with instructor-led skill session) formats, in addition to optional skill boosts to meet the various training needs of a diverse audience.
          </p>
        </div>

        {/* Course Prerequisites Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Prerequisites</h3>
          <p className="text-gray-700">
            There are no prerequisites for the core courses within the First Aid/CPR/AED r.21 program.<br />
            <strong>Skill Boost Prerequisites:</strong> Participants must have a valid and current certification in First Aid (inc. FA/CPR/AED, Lifeguarding, EMR, RTE, etc.) to take an optional Skill Boost. Participants also have the option to add skill boosts onto a First Aid/CPR/AED course.
          </p>
        </div>

        {/* Course Length Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Length</h3>
          <p className="text-gray-700">
            Approximately 2 hours online, 3 hours in-person
          </p>
        </div>

        {/* Interested Section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Interested in taking a course?</h3>
          <p className="text-gray-700">
            Search for open class on our <Link href="/classes/" className="text-primary hover:underline font-medium">classes page</Link>!
          </p>
        </div>

      </div>
    </div>
  );
};

export default FirstAidCprAedPageContent; 