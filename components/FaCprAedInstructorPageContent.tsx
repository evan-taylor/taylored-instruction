"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import CourseRegistrationButton from "@/components/CourseRegistrationButton";

const FaCprAedInstructorPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="CPR Instructor Training Session"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/Cpr-Instructor-Image.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Red Cross First Aid/CPR/AED Instructor Course
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Resource Links */}
        <div className="mb-8 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50" // Extracted from HTML
            href="/contact"
          >
            Request Course Fact Sheet
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50" // Extracted from HTML
            href="/contact"
          >
            Request Instructor Manual
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50" // Extracted from HTML
            href="/contact"
          >
            Request Practice Teaching Workbook
          </Link>
        </div>

        {/* Registration Button */}
        <CourseRegistrationButton
          buttonText="View Current Offerings"
          courseName="First Aid/CPR/AED Instructor"
          registrationUrl="https://www.hovn.app/tayloredinstruction/courses/arc-first-aid-cpr-aed-instructor"
        />

        {/* Course Purpose Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Purpose</h3>
          <p className="text-gray-700">
            The purpose of the American Red Cross FA/CPR/AED Instructor course
            is to train instructor candidates to teach the basic-level American
            Red Cross FA/CPR/AED course.
          </p>
        </div>

        {/* Course Prerequisites Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Prerequisites
          </h3>
          <p className="text-gray-700">
            FA/CPR/AED Instructor candidates must possess a current basic-level
            certification in FA/CPR/AED or equivalent.
          </p>
        </div>

        {/* Course Length Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Length</h3>
          <p className="mb-2 text-gray-700">
            The FA/CPR/AED Instructor Course is offered in a blended learning
            format that includes:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>
              FA/CPR/AED Instructor Course online session—designed to be
              completed in approximately 2 hours.
            </li>
            <li>
              FA/CPR/AED Instructor Course in-person session—designed to be
              completed in approximately 8 hours
            </li>
          </ul>
        </div>

        {/* Course Preparation Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Preparation
          </h3>
          <p className="mb-4 text-gray-700">
            To prepare for the American Red Cross First Aid/CPR/AED Instructor
            course, please ensure that you have a strong familiarity with the
            base skills taught in the Red Cross CPR curriculum. Instructor
            candidates should be confident performing these skills for others,
            so that they may teach them themselves. In addition, each
            participant must have a copy of the American Red Cross First
            Aid/CPR/AED Instructor&#8217;s Manual. You can request a manual copy
            using the link at the top of this page, or purchase one from the Red
            Cross store.
          </p>
          <p className="text-gray-700">
            You may view all instructor candidate resources on the{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="https://www.redcrosslearningcenter.org/s/candidate-resources-first-aid-cpr-aed-21"
              rel="noopener noreferrer"
              target="_blank"
            >
              Red Cross Learning Center
            </Link>
            .
          </p>
        </div>

        {/* Interested Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Interested in taking a course?
          </h3>
          <p className="text-gray-700">
            Register for a course on our{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="https://www.hovn.app/tayloredinstruction/courses/arc-first-aid-cpr-aed-instructor"
            >
              registration page
            </Link>
            !
          </p>
        </div>
      </div>
    </div>
  );
};

export default FaCprAedInstructorPageContent;
