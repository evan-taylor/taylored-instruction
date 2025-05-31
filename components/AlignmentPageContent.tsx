'use client'

import React from 'react';
import Image from 'next/image';
import AlignmentInterestForm from '@/components/AlignmentInterestForm';

const AlignmentPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative min-h-[50vh] flex items-center justify-center text-center px-4 overflow-hidden">
        <Image
          src="/CPR-Training-Getty-Images-scaled.jpg" // Pulled from HTML og:image
          alt="CPR Training Session with Manikins"
          fill
          quality={100}
          className="absolute inset-0 z-0 object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/30 z-10"></div>
        <div className="relative z-20 max-w-3xl mx-auto p-6 md:p-8 rounded-xl shadow-2xl bg-black/30 backdrop-blur-sm">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Taylored Instruction Alignment
          </h1>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Introductory Paragraph */}
        <div className="mb-12 p-6 rounded-lg shadow-sm bg-white">
          <p className="text-gray-700 leading-relaxed text-center">
            Are you passionate about saving lives and empowering others? At Taylored Instruction, we believe in the power of health and safety education and the critical role that instructors play in building safer communities. As an American Red Cross Licensed Training Provider and an American Heart Association (AHA) Training Site, we deliver top-quality training in CPR, First Aid, Lifeguarding, and other essential life-saving skills. We&apos;re looking for motivated instructors to join us on this mission!
          </p>
        </div>

        {/* Removed Image Section */}

        {/* Why Teach Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">Why Teach with Taylored Instruction?</h2>
        </div>

        {/* Mission Section */}
        <div className="p-6 rounded-lg shadow-sm mb-12 bg-gray-50">
          <h3 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">A Mission with Impact</h3>
          <p className="text-gray-700 leading-relaxed">
            By joining us, you become part of a team dedicated to making a genuine difference. We don&apos;t just teach—we inspire and equip individuals with vital health and safety skills.
          </p>
        </div>

        {/* Support Section */}
        <div className="p-6 rounded-lg shadow-sm mb-12 bg-gray-50">
          <h3 className="text-xl lg:text-2xl font-semibold mb-3 text-gray-800">Unmatched Support, Every Step of the Way</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            At Taylored Instruction, support isn&apos;t just a promise—it&apos;s our priority.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
            <li><strong>Rapid Response:</strong> Have a question or need assistance? We respond quickly—often within an hour, during the day—to ensure you never feel stuck or unsupported. You may contact us via email, phone, or text, whatever is easiest for you.</li>
              <li><strong>Comprehensive Help:</strong> Whether it&apos;s guidance, troubleshooting, or connecting you with the right resources, we&apos;re here to assist you to the fullest of our ability.</li>
              <li><strong>Ongoing Growth:</strong> We&apos;ll help you expand your skillset, advance your career, and achieve your goals.</li>
            <li><strong>Low Fees:</strong> We are here to help! We do not charge any alignment fees. We do charge a fee to recertify your instructor card, and that is it!</li>
          </ul>
           <p className="text-gray-700 leading-relaxed mt-4">
            We are committed to being your partner in success, dedicated to helping you thrive as an instructor.
          </p>
        </div>

        {/* Get Started Section */}
        <div className="p-6 rounded-lg shadow-sm mb-8 bg-white">
          <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">Ready to Get Started?</h3>
          <p className="text-gray-700 leading-relaxed text-center mb-8">
            Want to make a difference? Join Taylored Instruction and help us build safer communities—one class at a time! Fill out the form below to get started today.
          </p>
          {/* Embed the Alignment Interest Form */}
          <AlignmentInterestForm />
        </div>

      </div>
    </div>
  );
};

export default AlignmentPageContent; 