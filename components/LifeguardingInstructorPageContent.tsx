"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const LifeguardingInstructorPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative min-h-[500px] md:min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src="/lifeguard-training.jpeg"
            alt="Lifeguarding Instructor course training"
            fill
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
            className="brightness-[0.85]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="relative z-20 container mx-auto px-6 py-20 text-center">
          <div className="bg-black/30 backdrop-blur-sm p-8 md:p-10 rounded-xl max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              American Red Cross Lifeguarding Instructor Course
            </h1>
            <p className="text-white/90 max-w-2xl mx-auto">
              Train to teach Red Cross Lifeguarding courses. Blended learning
              with online and in-person sessions led by an Instructor Trainer.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10 text-center">
          <Button
            href="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-instructor-blended"
            target="_blank"
            size="lg"
          >
            View Upcoming Courses
          </Button>
          <Button href="/contact" size="lg" variant="secondary">
            Host This Course
          </Button>
        </div>

        {/* Overview */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl lg:text-2xl font-bold mb-3">
            Course Overview
          </h2>
          <p className="text-gray-700">
            The Lifeguarding Instructor course prepares instructor candidates to
            teach American Red Cross Lifeguarding courses. Candidates learn to
            plan and deliver effective training sessions, evaluate participant
            skills, and manage course administration using Red Cross program
            materials.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">Prerequisites</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Minimum age of 17 by the last day of the course.</li>
            <li>
              Possess a current basic-level certification in American Red Cross
              Lifeguarding (Including Deep Water) with CPR/AED for Professional
              Rescuers and First Aid.{" "}
              <span className="italic">
                Note: r.17 Lifeguarding certification accepted.
              </span>
            </li>
            <li>
              Obtain instructor and participant course materials before starting
              the course.
            </li>
            <li>
              Successfully complete the online session of the Lifeguarding
              Instructor course prior to the precourse session.
            </li>
            <li>
              Successfully complete the prerequisite skill assessment scenario
              evaluating:
              <ul className="list-[circle] pl-6 mt-2 space-y-1">
                <li>Entry</li>
                <li>Swimming approach</li>
                <li>Surface dive in deep water (7–10 feet)</li>
                <li>Passive submerged rescue</li>
                <li>Rapid extrication (with an assisting rescuer)</li>
                <li>Rapid assessment</li>
                <li>Single-rescuer CPR (3 minutes)</li>
              </ul>
            </li>
          </ul>
        </div>

        {/* Format & Length */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            Course Format and Length
          </h3>
          <p className="mb-3 text-gray-700">
            This is a blended learning course consisting of an online session
            (completed independently) followed by instructor-led classroom and
            in-water sessions.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-3">
            <li>Online session: approximately 2 hours to complete.</li>
            <li>
              In-person sessions (including the precourse): 16 hours of
              instruction time. This does not include breaks or transitions;
              additional time should be scheduled to accommodate those.
            </li>
          </ul>
          <p className="text-gray-700">
            Upon successful completion, participants earn the American Red Cross
            Lifeguarding Instructor certification.
          </p>
        </div>

        {/* Course Materials */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            Course Materials
          </h3>
          <p className="text-gray-700 mb-2">
            Lifeguarding Instructor candidates should obtain and review the
            following r.24 materials before attending:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>
              Lifeguarding Instructor’s Manual{" "}
              <span className="italic">
                (print copy required for in-person sessions)
              </span>
            </li>
            <li>
              Lifeguarding Instructor’s Deck Book{" "}
              <span className="italic">(optional)</span>
            </li>
            <li>Lifeguarding Manual (digital or print)</li>
            <li>
              Lifeguarding course videos{" "}
              <span className="italic">
                (via Red Cross Learning Center download, included in the
                Lifeguarding Course Presentation, or available as a DVD set)
              </span>
            </li>
            <li>
              Lifeguarding Course Presentation for Instructor-Led Training
            </li>
          </ul>
          <p className="text-gray-700 mt-3 text-sm">
            Digital materials and video are available in the Red Cross Learning
            Center. Print materials and kits can be purchased via the Red Cross
            Store.
          </p>
          <p className="text-sm mt-2">
            <a
              href="https://www.redcrosslearningcenter.org/s/instructor-candidate-resources"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Red Cross Learning Center
            </a>{" "}
            ·{" "}
            <a
              href="https://www.redcross.org/store"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Red Cross Store
            </a>
          </p>
        </div>

        {/* What You'll Learn */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            What You Will Learn
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>
              How to teach and evaluate Red Cross Lifeguarding course
              participants
            </li>
            <li>
              Effective demonstration, practice, and feedback strategies for
              in-water skills
            </li>
            <li>
              Using the Instructor Manual, course outlines, and Red Cross
              administrative tools
            </li>
            <li>
              Setting up safe training environments and managing scenarios
            </li>
          </ul>
        </div>

        {/* Who Should Take */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            Who Should Take This Course
          </h3>
          <p className="text-gray-700">
            Experienced lifeguards looking to become instructors at pools,
            aquatic centers, municipalities, universities, camps, and private
            facilities.
          </p>
        </div>

        {/* Successful Completion */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            Successful Completion
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>
              Successfully complete the Lifeguarding Instructor Course online
              session.
            </li>
            <li>
              Successfully complete the prerequisite skill assessment scenario.
            </li>
            <li>
              Successfully complete the skill practice and polish session,
              demonstrating instructor-level competency in:
              <ul className="list-[circle] pl-6 mt-2 space-y-1">
                <li>Entries and approaches</li>
                <li>Active rescues at the surface</li>
                <li>Passive rescues at the surface</li>
                <li>
                  Passive submerged rescues in shallow, moderate-depth and deep
                  water
                </li>
                <li>Feet-first and head-first surface dives in deep water</li>
                <li>Rapid extrication using a backboard</li>
                <li>Putting on gloves with wet hands</li>
                <li>Two-rescuer CPR with AED for an adult</li>
                <li>Surveillance and rotation procedures</li>
                <li>
                  Spinal motion restriction and extrication in shallow water
                </li>
                <li>Multiple-Rescuer Team Response Scenarios</li>
              </ul>
            </li>
            <li>
              Attend the entire course and actively participate in all class
              sessions and activities.
            </li>
            <li>
              Successfully complete teaching assignments (small group activities
              and practice teaching assignments I and II).
            </li>
            <li>
              Demonstrate instructor-level skill competency in all skills.
            </li>
            <li>Pass the final written exam with a minimum score of 80%.</li>
          </ul>
        </div>

        {/* Certification & Recertification */}
        <div className="p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            Certification & Recertification
          </h3>
          <p className="text-gray-700 mb-2">
            Candidates who successfully complete the course are issued the
            American Red Cross Lifeguarding Instructor certificate, valid for 2
            years.
          </p>
          <p className="text-gray-700 mb-2">
            To maintain certification, instructors must successfully complete
            the Lifeguarding Instructor Recertification blended learning course
            within the 2-year certification period. If expired, instructors are
            eligible to participate in recertification for up to 1 year past
            expiration; this grace period does not extend certification and
            instructors may not teach during this time.
          </p>
          <p className="text-gray-700 text-sm">
            Courses must be led by an American Red Cross Lifeguarding Instructor
            Trainer.
          </p>
        </div>

        {/* Callouts */}
        <div className="p-6 rounded-lg shadow-sm mb-10">
          <h3 className="text-xl lg:text-2xl font-bold mb-3">
            Ready to Get Started?
          </h3>
          <p className="mb-4 text-gray-700">
            Check our current offerings or contact us to host a course at your
            facility. We regularly schedule classes in Vancouver, WA and San
            Luis Obispo, CA, and can travel for group trainings.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              href="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-instructor-blended"
              target="_blank"
              size="lg"
            >
              View Schedule
            </Button>
            <Button href="/contact" size="lg" variant="secondary">
              Contact Us
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Note: Course content and requirements follow the American Red Cross
          Lifeguarding Instructor program guidelines.
        </p>
      </div>
    </div>
  );
};

export default LifeguardingInstructorPageContent;
