import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";
import {
  CERTIFICATION_FACTS,
  FaqSection,
  QuickFacts,
} from "@/components/ServicePageSections";
import { waterSafetyInstructorFAQs } from "@/lib/faqSchema";

const linkClassName = "font-medium text-primary hover:underline";

export default function WaterSafetyInstructorPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="Instructor training"
      course="water-safety-instructor"
      courseName="Water Safety Instructor"
      image={{
        alt: "Swim lesson in a pool",
        src: "/swim-lesson-photo.jpeg",
      }}
      resources={[
        {
          href: "https://www.redcross.org/take-a-class/swimming/water-safety/water-safety-instructor-certification",
          label: "Red Cross swim instructor program",
        },
      ]}
      secondaryActions={[{ href: "/contact", label: "Host this course" }]}
      subtitle="Build the skills to teach swimming and water safety to children and adults through American Red Cross instructor training."
      title="American Red Cross Water Safety Instructor Course"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Red Cross" },
          {
            label: "Format",
            value:
              "Classroom learning, in-water skill work and practice teaching",
          },
          {
            label: "Who it's for",
            value:
              "Strong swimmers, 16 or older, who want to teach swim lessons",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course overview">
        <p>
          Water Safety Instructor (WSI) training prepares candidates to teach
          the Red Cross Swimming and Water Safety program, including Parent and
          Child Aquatics, Preschool Aquatics, Learn-to-Swim Levels 1–6, and
          Adult Swim.
        </p>
        <p>
          Practice planning lessons, demonstrating skills, observing swimmers,
          and giving feedback that helps participants progress.
        </p>
      </ClassPageSection>
      <ClassPageSection title="Before you enroll">
        <p>
          Candidates must be at least 16 by the last day of the course and pass
          the precourse swimming skills session at the start of class. You don't
          need a lifeguard certificate. Contact us before registering if you
          have questions about eligibility or preparation.
        </p>
        <p>
          Come ready to demonstrate front crawl, back crawl, breaststroke,
          elementary backstroke, sidestroke, and butterfly, along with floating
          and treading water in deep water.
        </p>
      </ClassPageSection>
      <ClassPageSection title="What you will learn">
        <ul className="list-disc space-y-2 pl-5">
          <li>Plan safe lessons for different ages and swimming abilities.</li>
          <li>Use Red Cross teaching materials and skill progressions.</li>
          <li>Demonstrate strokes and evaluate participant performance.</li>
          <li>Adapt instruction for swimmers with different learning needs.</li>
          <li>Communicate progress and teach practical water safety skills.</li>
        </ul>
      </ClassPageSection>
      <ClassPageSection title="Training and certification">
        <p>
          Training includes classroom learning, in-water skill development, and
          practice teaching. Each scheduled class will list its meeting times,
          location, and any online preparation requirements.
        </p>
        <p>
          Certification requires successful completion of the precourse session,
          full participation, teaching assignments, and a final written exam
          score of at least 80%. The Water Safety Instructor certificate is
          valid for two years.
        </p>
      </ClassPageSection>
      <ClassPageSection title="Materials and preparation">
        <p>
          Candidates use the Water Safety Instructor’s Manual and Swimming and
          Water Safety manual. Contact us for the materials list and preparation
          instructions before your class.
        </p>
      </ClassPageSection>
      <ClassPageSection title="Practice teaching">
        <p>
          Much of the course is spent teaching. You plan short lessons, teach
          them to other candidates in the water, and get feedback from the
          instructor trainer. You also learn to break each stroke into steps,
          spot common faults and correct them, and keep a group of young
          swimmers safe while you work with one child.
        </p>
        <p>
          Our founder, Evan Taylor, is a Red Cross Water Safety Instructor
          Trainer. Once you certify, you can teach swim lessons through a pool
          or swim program that runs the Red Cross program. Read more in our
          guide to{" "}
          <Link
            className={linkClassName}
            href="/blog/water-safety-instructor-certification"
          >
            Water Safety Instructor certification
          </Link>
          .
        </p>
      </ClassPageSection>
      <ClassPageSection title="Where we teach">
        <p>
          We teach in Vancouver, WA, and serve Camas, Portland, San Luis Obispo
          and the surrounding areas. Each class on the schedule lists its pool
          and session times. Pools and swim schools can host a WSI course for
          their staff; use the Host this course button above to get in touch. If
          you also want to guard, see{" "}
          <Link className={linkClassName} href="/lifeguarding">
            Red Cross Lifeguarding
          </Link>
          .
        </p>
      </ClassPageSection>
      <FaqSection faqs={waterSafetyInstructorFAQs} />
    </ClassPageLayout>
  );
}
