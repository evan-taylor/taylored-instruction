"use client";

import Image from "next/image";
import type React from "react";
import AlignmentInterestForm from "@/components/AlignmentInterestForm";

const AlignmentPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden px-4 text-center">
        <Image
          alt="CPR Training Session with Manikins" // Pulled from HTML og:image
          className="absolute inset-0 z-0 object-cover"
          fill
          priority
          quality={100}
          src="/CPR-Training-Getty-Images-scaled.jpg"
        />
        <div className="absolute inset-0 z-10 bg-linear-to-b from-black/60 to-black/30" />
        <div className="relative z-20 mx-auto max-w-3xl">
          <h1 className="mb-4 font-bold text-3xl text-white sm:text-4xl md:text-5xl">
            Align with Taylored Instruction
          </h1>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Introductory Paragraph */}
        <div className="mb-12 rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-center text-slate-700 leading-relaxed">
            Are you passionate about saving lives and empowering others? At
            Taylored Instruction, we believe in the power of health and safety
            education and the critical role that instructors play in building
            safer communities. As an American Red Cross Licensed Training
            Provider and an American Heart Association (AHA) Training Site, we
            deliver top-quality training in CPR, First Aid, Lifeguarding, and
            other essential life-saving skills. We&apos;re looking for motivated
            instructors to join us on this mission!
          </p>
        </div>

        {/* Removed Image Section */}

        {/* Why Teach Section Title */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-semibold text-3xl text-slate-800">
            Why teach with Taylored Instruction?
          </h2>
        </div>

        {/* Mission Section */}
        <div className="mb-12 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h3 className="mb-3 font-semibold text-slate-800 text-xl lg:text-2xl">
            A mission with impact
          </h3>
          <p className="text-slate-700 leading-relaxed">
            By joining us, you become part of a team dedicated to making a
            genuine difference. We don&apos;t just teach—we inspire and equip
            individuals with vital health and safety skills.
          </p>
        </div>

        {/* Support Section */}
        <div className="mb-12 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h3 className="mb-3 font-semibold text-slate-800 text-xl lg:text-2xl">
            Support every step of the way
          </h3>
          <p className="mb-4 text-slate-700 leading-relaxed">
            At Taylored Instruction, support isn&apos;t just a promise—it&apos;s
            our priority.
          </p>
          <ul className="list-disc space-y-2 pl-6 text-slate-700 leading-relaxed">
            <li>
              <strong>Rapid response:</strong> Have a question or need
              assistance? We respond quickly—often within an hour, during the
              day—to ensure you never feel stuck or unsupported. You may contact
              us via email, phone, or text, whatever is easiest for you.
            </li>
            <li>
              <strong>Comprehensive help:</strong> Whether it&apos;s guidance,
              troubleshooting, or connecting you with the right resources,
              we&apos;re here to assist you to the fullest of our ability.
            </li>
            <li>
              <strong>Ongoing growth:</strong> We&apos;ll help you expand your
              skillset, advance your career, and achieve your goals.
            </li>
            <li>
              <strong>Low fees:</strong> We are here to help! We do not charge
              any alignment fees. We do charge a fee to recertify your
              instructor card, and that is it!
            </li>
          </ul>
          <p className="mt-4 text-slate-700 leading-relaxed">
            We are committed to being your partner in success, dedicated to
            helping you thrive as an instructor.
          </p>
        </div>

        {/* Get Started Section */}
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-6 text-center font-semibold text-2xl text-slate-800">
            Ready to get started?
          </h3>
          <p className="mb-8 text-center text-slate-700 leading-relaxed">
            Want to make a difference? Join Taylored Instruction and help us
            build safer communities—one class at a time! Fill out the form below
            to get started today.
          </p>
          {/* Embed the Alignment Interest Form */}
          <AlignmentInterestForm />
        </div>
      </div>
    </div>
  );
};

export default AlignmentPageContent;
