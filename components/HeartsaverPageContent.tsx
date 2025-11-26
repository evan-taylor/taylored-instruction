"use client";

import Image from "next/image";
import CourseRegistrationButton from "@/components/CourseRegistrationButton";

export default function HeartsaverPageContent() {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="CPR Training Photo"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/CPR-stock-photo-scaled.jpeg"
            style={{ objectFit: "cover", objectPosition: "54% 66%" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              American Heart Association Heartsaver® First Aid CPR AED
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Using prose for typography similar to BLS page */}
        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="mb-4 font-semibold text-3xl">Course Overview</h2>
            <p>
              The American Heart Association (AHA) Heartsaver® courses are
              designed for anyone with little or no medical training who needs
              CPR, AED, and first aid knowledge to meet job, regulatory, or
              personal requirements. This user-friendly course covers essential
              lifesaving skills and is perfect for workplace training or
              personal preparedness. You&apos;ll learn CPR for adults, children,
              and infants, proper AED use, and how to manage common first aid
              scenarios.
            </p>
            <p>
              <strong className="font-semibold">Duration:</strong> Approximately
              4 hours for in-person, or 1-2 hours for blended learning.
            </p>
            <p>
              <strong className="font-semibold">Audience:</strong> Ideal for
              teachers, coaches, daycare providers, construction workers,
              fitness trainers, and anyone who wants to be prepared for an
              emergency.
            </p>
            <CourseRegistrationButton
              buttonText="View Current Offerings"
              courseName="Heartsaver Certification"
              registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/aha-heartsaver-first-aid-cpr-aed-2025"
            />
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">Learning Objectives</h2>
            <p>By the end of this course, participants will be able to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Perform high-quality CPR for adults, children, and infants.
              </li>
              <li>Use an AED effectively and confidently.</li>
              <li>Manage choking emergencies in various age groups.</li>
              <li>
                Provide first aid for common injuries, including cuts, burns,
                sprains, and more.
              </li>
              <li>
                Recognize and respond to medical emergencies like heart attacks,
                strokes, and diabetic episodes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Certification Details
            </h2>
            <p>
              Upon successful completion of the course, participants will
              receive an AHA Heartsaver® certification eCard, valid for two
              years. To pass, participants must demonstrate the required skills
              during hands-on practice and pass a brief knowledge check.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">Course Options</h2>
            <p>We offer the following formats:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="font-semibold">In-person Training:</strong> A
                single, comprehensive session that includes all components of
                the course.
              </li>
              <li>
                <strong className="font-semibold">Blended Learning:</strong>{" "}
                Complete the knowledge portion online at your own pace, followed
                by an in-person skills session to practice and demonstrate what
                you&apos;ve learned.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-3xl">
              Frequently Asked Questions (FAQ)
            </h2>
            {/* Replicating FAQ structure from HTML */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  Who should take a Heartsaver® course?
                </h3>
                <p>
                  Anyone who needs basic CPR, AED, and first aid knowledge,
                  whether for work, school, or personal preparedness. This
                  course is great for people with no prior experience.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  How long does the course take?
                </h3>
                <p>
                  The course typically lasts <strong>4 hours in-person</strong>{" "}
                  or <strong>1-2 hours for blended learning</strong> (with
                  additional online coursework).
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  Are there any prerequisites?
                </h3>
                <p>
                  No prior experience or medical knowledge is required to enroll
                  in a Heartsaver® course.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  What should I bring to the class?
                </h3>
                <p>
                  Bring a valid photo ID, wear comfortable clothing suitable for
                  practice, and if applicable, bring your online completion
                  certificate for blended learning. All training materials will
                  be provided.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">
                  How do I renew my certification?
                </h3>
                <p>
                  Heartsaver® certifications are valid for two years. You can
                  renew by taking another Heartsaver course!
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
