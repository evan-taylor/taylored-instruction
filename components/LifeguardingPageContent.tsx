"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { Button } from "@/components/ui/Button";

const LifeguardingPageContent: React.FC = () => {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="Lifeguarding training session"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/IMG_1872.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Red Cross Lifeguarding
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* PDF Links */}
        <div className="mb-8 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50" // Extracted from HTML
            href="/Lifeguarding-Fact-Sheet.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            Course Fact Sheet
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm transition-colors hover:bg-gray-50" // Extracted from HTML
            href="/LG-Ebook-Link-r.24.pdf"
            rel="noopener noreferrer"
            target="_blank"
          >
            Ebook Access Instructions
          </Link>
        </div>

        {/* Registration Buttons */}
        <div className="mb-12 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
          <Button
            className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
            href="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-blended"
            size="lg"
            target="_blank"
          >
            Register for Lifeguard Certification
          </Button>
          <Button
            className="shadow-lg transition-shadow duration-200 hover:shadow-xl"
            href="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-recertification-blended"
            size="lg"
            target="_blank"
          >
            Register for Recertification
          </Button>
        </div>

        {/* Course Purpose Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Purpose</h3>
          <p className="mb-4 text-gray-700">
            The primary purpose of the courses in the American Red Cross
            Lifeguarding program is to provide participants with the knowledge
            and skills needed to:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
            <li>Prevent, recognize and respond to aquatic emergencies.</li>
            <li>
              Provide professional-level care for breathing and cardiac
              emergencies, injuries, and sudden illnesses until emergency
              medical services (EMS) professionals take over.
            </li>
          </ul>
        </div>

        {/* Course Prerequisites Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Prerequisites
          </h3>
          <p className="mb-4 text-gray-700">
            To participate in the Lifeguarding (Including Deep Water) course,
            participants must:
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 text-gray-700">
            <li>
              Be at least 15 years old on or before the final scheduled session
              of the Lifeguarding course.
            </li>
            <li>
              Successfully complete the two prerequisite swimming skills
              evaluations:
            </li>
          </ul>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold text-gray-800">
                Prerequisite 1:
              </h4>
              <p className="mb-2 text-gray-700">
                Complete a swim-tread-swim sequence without stopping to rest:
              </p>
              <ul className="list-decimal space-y-1 pl-5 text-gray-700 text-sm">
                <li>
                  Jump into the water and totally submerge, resurface then swim
                  150 yards (3 full, down and back laps in a typical 25 yard
                  pool) using the front crawl, breaststroke or a combination of
                  both. (Swimming on the back or side is not permitted. Swim
                  goggles are allowed)
                </li>
                <li>
                  Maintain position at the surface of the water for 2 minutes by
                  treading water using only the legs
                </li>
                <li>
                  Swim 50 yards (1 full lap) using the front crawl, breaststroke
                  or a combination of both
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-gray-800">
                Prerequisite 2:
              </h4>
              <p className="mb-2 text-gray-700">
                Complete a timed event within 1 minute, 40 seconds:
              </p>
              <ul className="list-decimal space-y-1 pl-5 text-gray-700 text-sm">
                <li>
                  Starting in the water, swim 20 yards. (The face may be in or
                  out of the water. Swim goggles are not allowed).
                </li>
                <li>
                  Submerge to a depth of 7 - 10 feet to retrieve a 10-pound
                  object.
                </li>
                <li>
                  Return to the surface and swim 20 yards on the back to return
                  to the starting point, holding the object at the surface with
                  both hands and keeping the face out at or near the surface.
                </li>
                <li>Exit the water without using a ladder or steps.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Course Length Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">Course Length</h3>
          <p className="text-gray-700">
            Approximately 7 hours online, 25 hours in-person (including breaks)
          </p>
        </div>

        {/* Course Preparation Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Course Preparation
          </h3>
          <p className="mb-4 text-gray-700">
            To prepare for the American Red Cross Lifeguarding course, please
            ensure that you are 100% confident with the prerequisites listed
            above. These will be conducted as soon as the course begins, and you
            will not be able to continue in the course if you are unsuccessful.
            In addition, be certain to complete the eLearning in its entirety
            prior to the first in-person class session. This can take a while,
            so please do not wait until the last minute to do this! The
            eLearning is sent in the confirmation email following registration.
            If you have any questions, please{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="/contact/"
            >
              contact us
            </Link>
            !
          </p>
        </div>

        {/* Interested Section */}
        <div className="mb-8 rounded-lg p-6 shadow-sm">
          <h3 className="mb-3 font-bold text-xl lg:text-2xl">
            Interested in taking a course?
          </h3>
          <p className="text-gray-700">
            Search for open class on our{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="https://www.hovn.app/tayloredinstruction"
              rel="noopener noreferrer"
              target="_blank"
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

export default LifeguardingPageContent;
