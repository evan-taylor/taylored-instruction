"use client";

import Image from "next/image";
import type React from "react";
import { Button } from "@/components/ui/Button";

const LifeguardingInstructorPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="Lifeguarding Instructor course training"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/lifeguard-training.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Red Cross Lifeguarding Instructor Course
            </h1>
            <p className="mx-auto max-w-2xl text-white/90">
              Train to teach Red Cross Lifeguarding courses. Blended learning
              with online and in-person sessions led by an Instructor Trainer.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Quick Actions */}
        <div className="mb-10 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <Button
            className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
            href="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-instructor-blended"
            size="lg"
            target="_blank"
          >
            View Upcoming Courses
          </Button>
          <Button
            className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
            href="/contact"
            size="lg"
            variant="secondary"
          >
            Host This Course
          </Button>
        </div>

        {/* Overview */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h2 className="mb-3 font-bold text-xl lg:text-2xl">
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
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Prerequisites</h3>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
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
              <ul className="mt-2 list-[circle] space-y-1 pl-6">
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
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Format and Length
          </h3>
          <p className="mb-3 text-gray-700">
            This is a blended learning course consisting of an online session
            (completed independently) followed by instructor-led classroom and
            in-water sessions.
          </p>
          <ul className="mb-3 list-disc space-y-2 pl-5 text-gray-700">
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
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Materials
          </h3>
          <p className="mb-2 text-gray-700">
            Lifeguarding Instructor candidates should obtain and review the
            following r.24 materials before attending:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
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
          <p className="mt-3 text-gray-700 text-sm">
            Digital materials and video are available in the Red Cross Learning
            Center. Print materials and kits can be purchased via the Red Cross
            Store.
          </p>
          <p className="mt-2 text-sm">
            <a
              className="font-medium text-primary hover:underline"
              href="https://www.redcrosslearningcenter.org/s/instructor-candidate-resources"
              rel="noopener noreferrer"
              target="_blank"
            >
              Red Cross Learning Center
            </a>{" "}
            ·{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="https://www.redcross.org/store"
              rel="noopener noreferrer"
              target="_blank"
            >
              Red Cross Store
            </a>
          </p>
        </div>

        {/* What You'll Learn */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            What You Will Learn
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
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
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Who Should Take This Course
          </h3>
          <p className="text-gray-700">
            Experienced lifeguards looking to become instructors at pools,
            aquatic centers, municipalities, universities, camps, and private
            facilities.
          </p>
        </div>

        {/* Successful Completion */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Successful Completion
          </h3>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
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
              <ul className="mt-2 list-[circle] space-y-1 pl-6">
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
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Certification & Recertification
          </h3>
          <p className="mb-2 text-gray-700">
            Candidates who successfully complete the course are issued the
            American Red Cross Lifeguarding Instructor certificate, valid for 2
            years.
          </p>
          <p className="mb-2 text-gray-700">
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
        <div className="mb-10 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Ready to Get Started?
          </h3>
          <p className="mb-4 text-gray-700">
            Check our current offerings or contact us to host a course at your
            facility. We regularly schedule classes in Vancouver, WA and San
            Luis Obispo, CA, and can travel for group trainings.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
              href="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-instructor-blended"
              size="lg"
              target="_blank"
            >
              View Schedule
            </Button>
            <Button
              className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
              href="/contact"
              size="lg"
              variant="secondary"
            >
              Contact Us
            </Button>
          </div>
        </div>

        <p className="text-gray-500 text-xs">
          Note: Course content and requirements follow the American Red Cross
          Lifeguarding Instructor program guidelines.
        </p>
      </div>
    </div>
  );
};

export default LifeguardingInstructorPageContent;
