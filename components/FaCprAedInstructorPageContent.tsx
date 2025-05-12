'use client'

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const FaCprAedInstructorPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/Cpr-Instructor-Image.jpeg"
            alt="CPR Instructor Training Session"
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
              American Red Cross First Aid/CPR/AED Instructor Course
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Resource Links */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 text-center">
          <Link
            href="/First-Aid-CPR-AED-Instructor-Fact-Sheet.pdf" // Extracted from HTML
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Course Fact Sheet
          </Link>
          <Link
            href="/First-Aid-CPR-AED-Instructor-Manual-Dec-2021.pdf" // Extracted from HTML
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Instructor Manual
          </Link>
          <Link
            href="/Practice-Teaching-Workbook.pdf" // Extracted from HTML
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Practice Teaching Workbook
          </Link>
        </div>

        {/* Registration Button */}
        <div className="text-center mb-12">
          <Button
            href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm4lyuefl000013m00k5rnnlq" // Extracted from HTML
            target="_blank"
            size="lg"
          >
            View Current Offerings
          </Button>
        </div>

        {/* Course Purpose Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Purpose</h3>
          <p className="text-gray-700">
            The purpose of the American Red Cross FA/CPR/AED Instructor course is to train instructor candidates to teach the basic-level American Red Cross FA/CPR/AED course.
          </p>
        </div>

        {/* Course Prerequisites Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Prerequisites</h3>
          <p className="text-gray-700">
            FA/CPR/AED Instructor candidates must possess a current basic-level certification in FA/CPR/AED or equivalent.
          </p>
        </div>

        {/* Course Length Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Length</h3>
          <p className="mb-2 text-gray-700">The FA/CPR/AED Instructor Course is offered in a blended learning format that includes:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>FA/CPR/AED Instructor Course online session—designed to be completed in approximately 2 hours.</li>
            <li>FA/CPR/AED Instructor Course in-person session—designed to be completed in approximately 8 hours</li>
          </ul>
        </div>

        {/* Course Preparation Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Preparation</h3>
          <p className="mb-4 text-gray-700">
            To prepare for the American Red Cross First Aid/CPR/AED Instructor course, please ensure that you have a strong familiarity with the base skills taught in the Red Cross CPR curriculum. Instructor candidates should be confident performing these skills for others, so that they may teach them themselves. In addition, each participant must have a copy of the American Red Cross First Aid/CPR/AED Instructor&#8217;s Manual. This can be printed using the PDF linked at the top of this page, or purchased from the Red Cross store.
          </p>
          <p className="text-gray-700">
            You may view all instructor candidate resources on the <Link href="https://www.redcrosslearningcenter.org/s/candidate-resources-first-aid-cpr-aed-21" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Red Cross Learning Center</Link>.
          </p>
        </div>

        {/* Interested Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Interested in taking a course?</h3>
          <p className="text-gray-700">
            Register for a course on our <Link href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm4lyuefl000013m00k5rnnlq" className="text-primary hover:underline font-medium">registration page</Link>!
          </p>
        </div>

      </div>
    </div>
  );
};

export default FaCprAedInstructorPageContent; 