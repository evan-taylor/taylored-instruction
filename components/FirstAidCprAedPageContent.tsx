"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import CourseRegistrationButton from "@/components/CourseRegistrationButton";

const FirstAidCprAedPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="First Aid CPR AED Training Session"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/CPR-Training-Image.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Red Cross First Aid/CPR/AED
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50"
            href="/contact"
          >
            Request Course Fact Sheet
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50"
            href="/contact"
          >
            Request eBook Access Instructions
          </Link>
        </div>

        <CourseRegistrationButton
          buttonText="View Current Offerings"
          courseName="First Aid/CPR/AED"
          registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/arc-adult-and-pediatric-first-aid-cpr-aed-bl-r25/"
        />

        {/* Course Purpose Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Purpose</h3>
          <p className="text-gray-700">
            The American Red Cross First Aid/CPR/AED r.21 program is designed to
            help participants recognize and respond appropriately to cardiac,
            breathing and first aid emergencies. The courses in this program
            teach participants the knowledge and skills needed to give immediate
            care to an injured or ill person when minutes matter, and to decide
            whether advanced medical care is needed. This program offers a
            choice of First Aid, CPR and AED courses in traditional classroom or
            blended learning (online learning with instructor-led skill session)
            formats, in addition to optional skill boosts to meet the various
            training needs of a diverse audience.
          </p>
        </div>

        {/* Course Prerequisites Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Prerequisites
          </h3>
          <p className="text-gray-700">
            There are no prerequisites for the core courses within the First
            Aid/CPR/AED r.21 program.
            <br />
            <strong>Skill Boost Prerequisites:</strong> Participants must have a
            valid and current certification in First Aid (inc. FA/CPR/AED,
            Lifeguarding, EMR, RTE, etc.) to take an optional Skill Boost.
            Participants also have the option to add skill boosts onto a First
            Aid/CPR/AED course.
          </p>
        </div>

        {/* Course Length Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Length</h3>
          <p className="text-gray-700">
            Approximately 2 hours online, 3 hours in-person
          </p>
        </div>

        {/* Interested Section */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Interested in taking a course?
          </h3>
          <p className="text-gray-700">
            Search for open class on our{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="https://www.hovn.app/tayloredinstruction/certifications/arc-adult-and-pediatric-first-aid-cpr-aed-bl-r25/"
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

export default FirstAidCprAedPageContent;
