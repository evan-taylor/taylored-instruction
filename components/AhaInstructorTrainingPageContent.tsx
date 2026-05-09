"use client";

import Image from "next/image";
import type React from "react";
import CourseRegistrationButton from "@/components/CourseRegistrationButton";

const AhaInstructorTrainingPageContent: React.FC = () => {
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
              American Heart Association Instructor Training
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-6 text-center font-bold text-2xl lg:text-3xl">
          Become an American Heart Association Instructor
        </h2>
        <p className="mb-6 text-center text-gray-700 text-lg">
          Are you passionate about saving lives and teaching others critical
          lifesaving skills? The American Heart Association (AHA) Instructor
          courses for Basic Life Support (BLS) and Heartsaver® certifications
          will equip you with the knowledge and skills to lead AHA courses in
          your community, workplace, or organization. As an AHA Instructor,
          you&apos;ll be part of a network dedicated to improving survival rates
          and providing lifesaving training.
        </p>

        <CourseRegistrationButton
          buttonText="View Current Offerings"
          courseName="AHA Instructor Training"
          registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/aha-bls-instructor-2025/"
        />

        <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Overview</h3>
        <p className="mb-4 text-gray-700">
          The AHA Instructor Course is designed to train individuals to
          effectively teach BLS or Heartsaver® courses. Through a combination of
          online and in-person training, you&apos;ll learn instructional
          techniques, gain hands-on experience, and receive mentorship to ensure
          your success as a certified AHA Instructor.
        </p>

        <h3 className="mb-3 font-bold text-xl lg:text-2xl">Duration:</h3>
        <ul className="mb-6 list-inside list-disc space-y-2 text-gray-700">
          <li>
            <strong>Blended Learning:</strong> 2 hours online, 8 hours in-person
            (excluding monitoring)
          </li>
          <li>
            <strong>Total Commitment:</strong> Approximately 12 hours, including
            teaching your first course!
          </li>
        </ul>

        <h3 className="mb-3 font-bold text-xl lg:text-2xl">Audience:</h3>
        <p className="mb-6 text-gray-700">
          This course is ideal for healthcare providers, workplace safety
          trainers, educators, and anyone passionate about teaching lifesaving
          skills.
        </p>

        <h3 className="mb-3 font-bold text-xl lg:text-2xl">
          Steps to Become an AHA Instructor
        </h3>
        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          1. Complete the Prerequisites
        </h4>
        <p className="mb-2 text-gray-700">
          Before enrolling in the instructor course, you must:
        </p>
        <ul className="mb-4 list-inside list-disc space-y-2 text-gray-700">
          <li>
            Hold a current, valid AHA Provider certification for the discipline
            you wish to teach (BLS or Heartsaver®).
          </li>
          <li>
            Have an interest in teaching lifesaving skills and a willingness to
            mentor students.
          </li>
          <li>
            Submit an{" "}
            <a className="text-primary hover:underline" href="/contact">
              AHA Instructor Candidate Application request
            </a>{" "}
            through our contact form, or email Taylored Instruction at{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:info@tayloredinstruction.com"
            >
              info@tayloredinstruction.com
            </a>
            .
          </li>
        </ul>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          2. Enroll in the AHA Instructor Course
        </h4>
        <p className="mb-2 text-gray-700">
          Choose the discipline you want to teach:
        </p>
        <ul className="mb-4 list-inside list-disc space-y-2 text-gray-700">
          <li>
            <strong>BLS Instructor Course:</strong> Focused on teaching
            healthcare providers and first responders.
          </li>
          <li>
            <strong>Heartsaver® Instructor Course:</strong> Focused on CPR, AED,
            and first aid for the general public and workplaces.
          </li>
        </ul>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          3. Complete Online Instructor Essentials
        </h4>
        <p className="mb-4 text-gray-700">
          After registration, you&apos;ll receive access to the AHA Instructor
          Essentials online module. This self-paced training introduces you to
          AHA&apos;s teaching philosophy and course administration processes.
          You must complete this module before attending the in-person session.
        </p>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          4. Attend the In-Person Instructor Training
        </h4>
        <p className="mb-2 text-gray-700">
          During the in-person session, you&apos;ll:
        </p>
        <ul className="mb-4 list-inside list-disc space-y-2 text-gray-700">
          <li>
            Learn to manage a classroom and conduct hands-on skills sessions.
          </li>
          <li>
            Practice teaching and receive feedback from experienced AHA Training
            Faculty.
          </li>
          <li>
            Review course materials and administrative requirements for AHA
            Instructors.
          </li>
        </ul>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          5. Complete Monitoring Session
        </h4>
        <p className="mb-4 text-gray-700">
          After your instructor training, you&apos;ll teach your first class
          under the supervision of an AHA Training Faculty member. This ensures
          you are confident and prepared to lead AHA courses independently.
        </p>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          6. Receive Your Instructor Certification
        </h4>
        <p className="mb-6 text-gray-700">
          Once all steps are complete, you&apos;ll receive your AHA Instructor
          eCard, valid for two years. You can now teach AHA BLS or Heartsaver®
          courses as part of a Training Site or Training Center.
        </p>

        <h3 className="mb-3 font-bold text-xl lg:text-2xl">
          Certification Details
        </h3>
        <ul className="mb-6 list-inside list-disc space-y-2 text-gray-700">
          <li>
            <strong>Instructor Certification Validity:</strong> 2 years
          </li>
          <li>
            <strong>Renewal Requirements:</strong> Teach at least four courses
            and complete an Instructor Renewal session every two years.
          </li>
        </ul>

        <h3 className="mb-3 font-bold text-xl lg:text-2xl">
          Frequently Asked Questions (FAQ)
        </h3>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          Who can become an AHA Instructor?
        </h4>
        <p className="mb-4 text-gray-700">
          Anyone with a current AHA Provider certification and a passion for
          teaching lifesaving skills can become an AHA Instructor.
        </p>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          What disciplines can I teach as an Instructor?
        </h4>
        <p className="mb-4 text-gray-700">
          You can choose to teach BLS or Heartsaver® courses, depending on your
          interest and audience.
        </p>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          What is the cost of the Instructor Course?
        </h4>
        <p className="mb-4 text-gray-700">
          Pricing varies depending on the training center and location. Contact
          us for details and upcoming course dates.
        </p>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          What materials will I need as an Instructor?
        </h4>
        <p className="mb-4 text-gray-700">
          You&apos;ll need an AHA Instructor Manual for your chosen discipline,
          and access to AHA course materials.
        </p>

        <h4 className="mb-2 font-semibold text-lg lg:text-xl">
          Can I teach independently?
        </h4>
        <p className="mb-4 text-gray-700">
          Instructors must align with an AHA Training Site or Training Center.
          This affiliation ensures access to course completion cards and
          administrative support.
        </p>
      </div>
    </div>
  );
};

export default AhaInstructorTrainingPageContent;
