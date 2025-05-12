'use client'

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const LifeguardingPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/IMG_1872.jpeg"
            alt="Lifeguarding training session"
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
              American Red Cross Lifeguarding
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* PDF Links */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 text-center">
          <Link
            href="/Lifeguarding-Fact-Sheet.pdf" // Extracted from HTML
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Course Fact Sheet
          </Link>
          <Link
            href="/LG-Ebook-Link-r.24.pdf" // Extracted from HTML
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Ebook Access Instructions
          </Link>
        </div>

        {/* Registration Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12 text-center">
          <Button
            href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm5bmm7kp000cmv034k7fmslj"
            target="_blank"
            size="lg"
          >
            Register for Lifeguard Certification
          </Button>
          <Button
            href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm5e9nti30000l40951fkzcd5"
            target="_blank"
            size="lg"
          >
            Register for Recertification
          </Button>
        </div>

        {/* Course Purpose Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Purpose</h3>
          <p className="mb-4 text-gray-700">
            The primary purpose of the courses in the American Red Cross Lifeguarding program is to provide participants with the knowledge and skills needed to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Prevent, recognize and respond to aquatic emergencies.</li>
            <li>Provide professional-level care for breathing and cardiac emergencies, injuries, and sudden illnesses until emergency medical services (EMS) professionals take over.</li>
          </ul>
        </div>

        {/* Course Prerequisites Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Prerequisites</h3>
          <p className="mb-4 text-gray-700">
            To participate in the Lifeguarding (Including Deep Water) course, participants must:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-6 text-gray-700">
            <li>Be at least 15 years old on or before the final scheduled session of the Lifeguarding course.</li>
            <li>Successfully complete the two prerequisite swimming skills evaluations:</li>
          </ul>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-gray-800">Prerequisite 1:</h4>
              <p className="mb-2 text-gray-700">Complete a swim-tread-swim sequence without stopping to rest:</p>
              <ul className="list-decimal pl-5 space-y-1 text-gray-700 text-sm">
                <li>Jump into the water and totally submerge, resurface then swim 150 yards (3 full, down and back laps in a typical 25 yard pool) using the front crawl, breaststroke or a combination of both. (Swimming on the back or side is not permitted. Swim goggles are allowed)</li>
                <li>Maintain position at the surface of the water for 2 minutes by treading water using only the legs</li>
                <li>Swim 50 yards (1 full lap) using the front crawl, breaststroke or a combination of both</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-800">Prerequisite 2:</h4>
              <p className="mb-2 text-gray-700">Complete a timed event within 1 minute, 40 seconds:</p>
              <ul className="list-decimal pl-5 space-y-1 text-gray-700 text-sm">
                <li>Starting in the water, swim 20 yards. (The face may be in or out of the water. Swim goggles are not allowed).</li>
                <li>Submerge to a depth of 7 - 10 feet to retrieve a 10-pound object.</li>
                <li>Return to the surface and swim 20 yards on the back to return to the starting point, holding the object at the surface with both hands and keeping the face out at or near the surface.</li>
                <li>Exit the water without using a ladder or steps.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Course Length Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Length</h3>
          <p className="text-gray-700">
            Approximately 7 hours online, 25 hours in-person (including breaks)
          </p>
        </div>

         {/* Course Preparation Section */}
         <div className="p-6 rounded-lg shadow-sm mb-8">
            <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Preparation</h3>
            <p className="mb-4 text-gray-700">
                To prepare for the American Red Cross Lifeguarding course, please ensure that you are 100% confident with the prerequisites listed above. These will be conducted as soon as the course begins, and you will not be able to continue in the course if you are unsuccessful. In addition, be certain to complete the eLearning in its entirety prior to the first in-person class session. This can take a while, so please do not wait until the last minute to do this! The eLearning is sent in the confirmation email following registration. If you have any questions, please <Link href="/contact/" className="text-primary hover:underline font-medium">contact us</Link>!
            </p>
        </div>

        {/* Interested Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Interested in taking a course?</h3>
          <p className="text-gray-700">
            Search for open class on our <Link href="/classes/" className="text-primary hover:underline font-medium">registration page</Link>!
          </p>
        </div>

      </div>
    </div>
  );
};

export default LifeguardingPageContent; 