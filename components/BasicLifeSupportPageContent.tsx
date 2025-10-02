"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import CourseRegistrationButton from "@/components/CourseRegistrationButton";

const BasicLifeSupportPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="Basic Life Support Training Session"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/CPR-Training-Stock-Photo-1-scaled.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Red Cross Basic Life Support
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Resource Links */}
        <div className="mb-8 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50"
            href="/BLS-Fact-Sheet.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            Course Fact Sheet
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50"
            href="/BLS-Participant-Manual.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            Participant Manual
          </Link>
        </div>

        {/* Registration Button */}
        <CourseRegistrationButton
          courseName="Basic Life Support"
          registrationUrl="https://www.hovn.app/service-providers/tayloredinstruction/offerings"
          buttonText="View Current Offerings"
        />

        {/* Course Purpose Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Purpose</h3>
          <p className="text-gray-700">
            The American Red Cross Basic Life Support (BLS) course provides
            participants with the knowledge and skills they need to assess,
            recognize and care for patients who are experiencing respiratory
            arrest, cardiac arrest, airway obstruction or opioid overdose. When
            a patient experiences a life-threatening emergency, healthcare
            providers need to act swiftly and promptly. The course emphasizes
            providing high-quality care and integrating psychomotor skills with
            critical thinking and problem solving to achieve the best possible
            patient outcomes.
          </p>
        </div>

        {/* Course Prerequisites Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Prerequisites
          </h3>
          <p className="text-gray-700">None</p>
        </div>

        {/* Course Length Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Length</h3>
          <p className="text-gray-700">
            Blended Learning: Approximately 2 hours online, 3 hours in-person
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicLifeSupportPageContent;
