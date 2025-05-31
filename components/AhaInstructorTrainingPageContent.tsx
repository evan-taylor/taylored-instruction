'use client'

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

const AhaInstructorTrainingPageContent: React.FC = () => {
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
              American Heart Association Instructor Training
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-center">Become an American Heart Association Instructor</h2>
        <p className="mb-6 text-lg text-center text-gray-700">
            Are you passionate about saving lives and teaching others critical lifesaving skills? The American Heart Association (AHA) Instructor courses for Basic Life Support (BLS) and Heartsaver® certifications will equip you with the knowledge and skills to lead AHA courses in your community, workplace, or organization. As an AHA Instructor, you&apos;ll be part of a network dedicated to improving survival rates and providing lifesaving training.
        </p>

        <div className="text-center mb-10">
          <Button
            href="https://www.hovn.app/service-providers/tayloredinstruction/offerings/cm4uu58qy00004wzl00n1svnn"
            target="_blank"
            size="lg"
          >
            View Current Offerings
          </Button>
        </div>

        <h3 className="text-xl lg:text-2xl font-bold mb-3">Course Overview</h3>
          <p className="mb-4 text-gray-700">
            The AHA Instructor Course is designed to train individuals to effectively teach BLS or Heartsaver® courses. Through a combination of online and in-person training, you&apos;ll learn instructional techniques, gain hands-on experience, and receive mentorship to ensure your success as a certified AHA Instructor.
          </p>

        <h3 className="text-xl lg:text-2xl font-bold mb-3">Duration:</h3>
        <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
          <li><strong>Blended Learning:</strong> 2 hours online, 8 hours in-person (excluding monitoring)</li>
          <li><strong>Total Commitment:</strong> Approximately 12 hours, including teaching your first course!</li>
        </ul>

        <h3 className="text-xl lg:text-2xl font-bold mb-3">Audience:</h3>
        <p className="mb-6 text-gray-700">
          This course is ideal for healthcare providers, workplace safety trainers, educators, and anyone passionate about teaching lifesaving skills.
        </p>

        <h3 className="text-xl lg:text-2xl font-bold mb-3">Steps to Become an AHA Instructor</h3>
        <h4 className="text-lg lg:text-xl font-semibold mb-2">1. Complete the Prerequisites</h4>
        <p className="mb-2 text-gray-700">Before enrolling in the instructor course, you must:</p>
        <ul className="list-disc list-inside mb-4 text-gray-700 space-y-2">
          <li>Hold a current, valid AHA Provider certification for the discipline you wish to teach (BLS or Heartsaver®).</li>
          <li>Have an interest in teaching lifesaving skills and a willingness to mentor students.</li>
          <li>Fill out an <a href="/Instructor-Candidate-Application.pdf" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">AHA Instructor Candidate Application</a> and send it to Taylored Instruction (<a href="mailto:info@tayloredinstruction.com" className="text-primary hover:underline">info@tayloredinstruction.com</a>)</li>
        </ul>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">2. Enroll in the AHA Instructor Course</h4>
        <p className="mb-2 text-gray-700">Choose the discipline you want to teach:</p>
        <ul className="list-disc list-inside mb-4 text-gray-700 space-y-2">
          <li><strong>BLS Instructor Course:</strong> Focused on teaching healthcare providers and first responders.</li>
          <li><strong>Heartsaver® Instructor Course:</strong> Focused on CPR, AED, and first aid for the general public and workplaces.</li>
        </ul>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">3. Complete Online Instructor Essentials</h4>
        <p className="mb-4 text-gray-700">
          After registration, you&apos;ll receive access to the AHA Instructor Essentials online module. This self-paced training introduces you to AHA&apos;s teaching philosophy and course administration processes. You must complete this module before attending the in-person session.
        </p>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">4. Attend the In-Person Instructor Training</h4>
        <p className="mb-2 text-gray-700">During the in-person session, you&apos;ll:</p>
        <ul className="list-disc list-inside mb-4 text-gray-700 space-y-2">
          <li>Learn to manage a classroom and conduct hands-on skills sessions.</li>
          <li>Practice teaching and receive feedback from experienced AHA Training Faculty.</li>
          <li>Review course materials and administrative requirements for AHA Instructors.</li>
        </ul>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">5. Complete Monitoring Session</h4>
        <p className="mb-4 text-gray-700">
          After your instructor training, you&apos;ll teach your first class under the supervision of an AHA Training Faculty member. This ensures you are confident and prepared to lead AHA courses independently.
        </p>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">6. Receive Your Instructor Certification</h4>
        <p className="mb-6 text-gray-700">
          Once all steps are complete, you&apos;ll receive your AHA Instructor eCard, valid for two years. You can now teach AHA BLS or Heartsaver® courses as part of a Training Site or Training Center.
        </p>

        <h3 className="text-xl lg:text-2xl font-bold mb-3">Certification Details</h3>
        <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
          <li><strong>Instructor Certification Validity:</strong> 2 years</li>
          <li><strong>Renewal Requirements:</strong> Teach at least four courses and complete an Instructor Renewal session every two years.</li>
        </ul>

        <h3 className="text-xl lg:text-2xl font-bold mb-3">Frequently Asked Questions (FAQ)</h3>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">Who can become an AHA Instructor?</h4>
        <p className="mb-4 text-gray-700">
          Anyone with a current AHA Provider certification and a passion for teaching lifesaving skills can become an AHA Instructor.
        </p>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">What disciplines can I teach as an Instructor?</h4>
        <p className="mb-4 text-gray-700">
          You can choose to teach BLS or Heartsaver® courses, depending on your interest and audience.
        </p>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">What is the cost of the Instructor Course?</h4>
        <p className="mb-4 text-gray-700">
          Pricing varies depending on the training center and location. Contact us for details and upcoming course dates.
        </p>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">What materials will I need as an Instructor?</h4>
        <p className="mb-4 text-gray-700">
          You&apos;ll need an AHA Instructor Manual for your chosen discipline, and access to AHA course materials.
        </p>

        <h4 className="text-lg lg:text-xl font-semibold mb-2">Can I teach independently?</h4>
        <p className="mb-4 text-gray-700">
          Instructors must align with an AHA Training Site or Training Center. This affiliation ensures access to course completion cards and administrative support.
        </p>

      </div>
    </div>
  );
};

export default AhaInstructorTrainingPageContent; 