import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";
import {
  CERTIFICATION_FACTS,
  FaqSection,
  QuickFacts,
} from "@/components/ServicePageSections";
import { faCprAedInstructorFAQs } from "@/lib/faqSchema";

const linkClassName = "font-medium text-primary hover:underline";

export default function FaCprAedInstructorPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="Instructor training"
      course="fa-cpr-aed-instructor"
      courseName="First Aid/CPR/AED Instructor"
      image={{
        alt: "CPR instructor training session",
        src: "/Cpr-Instructor-Image.jpeg",
      }}
      resources={[
        { href: "/contact", label: "Request course fact sheet" },
        { href: "/contact", label: "Request instructor manual" },
        { href: "/contact", label: "Request practice teaching workbook" },
      ]}
      title="American Red Cross First Aid/CPR/AED Instructor Course"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Red Cross" },
          {
            label: "Format",
            value: "Blended: online session, then an in-person session",
          },
          {
            label: "Who it's for",
            value:
              "People 17 or older with a current First Aid/CPR/AED certificate who want to teach it",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course purpose">
        <p>
          The purpose of the American Red Cross FA/CPR/AED Instructor course is
          to train instructor candidates to teach the basic-level American Red
          Cross FA/CPR/AED course.
        </p>
        <p>
          The course suits HR and safety staff who want to certify their own
          coworkers, teachers and coaches, fitness trainers, and anyone who
          wants to teach CPR and first aid in their community.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course prerequisites">
        <p>
          FA/CPR/AED Instructor candidates must be at least 17 by the last day
          of the course and possess a current basic-level certification in
          FA/CPR/AED or equivalent.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course format">
        <p>
          The FA/CPR/AED Instructor Course is offered in a blended learning
          format: an online session you complete first, then an in-person
          session. Session dates and times vary by class, so check the listing
          on the schedule.
        </p>
      </ClassPageSection>

      <ClassPageSection title="What happens in the in-person session">
        <p>
          The in-person session is about teaching, not relearning CPR. You
          practice running skill sessions, giving clear corrective feedback, and
          checking skills against Red Cross standards. You also complete
          practice teaching assignments in front of the group, learn how to set
          up a classroom and manage equipment, and learn the paperwork side:
          rosters, course records and issuing certificates.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course preparation">
        <p>
          To prepare for the American Red Cross First Aid/CPR/AED Instructor
          course, make sure you have strong familiarity with the base skills
          taught in the Red Cross CPR curriculum. Instructor candidates should
          be confident performing these skills for others so they can teach them
          clearly.
        </p>
        <p>
          Each participant must have a copy of the American Red Cross First
          Aid/CPR/AED Instructor&apos;s Manual. You can request a manual copy
          using the link at the top of this page, or purchase one from the Red
          Cross store.
        </p>
        <p>
          You may view all instructor candidate resources on the{" "}
          <Link
            className={linkClassName}
            href="https://www.redcrosslearningcenter.org/s/candidate-resources-first-aid-cpr-aed-21"
            rel="noopener noreferrer"
            target="_blank"
          >
            Red Cross Learning Center
          </Link>
          .
        </p>
      </ClassPageSection>

      <ClassPageSection title="After you certify">
        <p>
          Your instructor certification is valid for 2 years. To issue Red Cross
          certificates, you teach through a Red Cross Training Provider.
          Taylored Instruction is a Red Cross Licensed Training Provider, and
          new instructors can{" "}
          <Link className={linkClassName} href="/alignment">
            align with us
          </Link>
          . Our founder, Evan Taylor, is a Red Cross First Aid/CPR/AED
          Instructor Trainer. For a broader look at the path, read{" "}
          <Link
            className={linkClassName}
            href="/blog/how-to-become-cpr-instructor"
          >
            how to become a CPR instructor
          </Link>
          .
        </p>
        <p>
          We teach in Vancouver, WA, and serve Camas, Portland, San Luis Obispo
          and the surrounding areas. If you want to teach American Heart
          Association courses instead, see{" "}
          <Link className={linkClassName} href="/aha-instructor-training">
            AHA instructor training
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={faCprAedInstructorFAQs} />
    </ClassPageLayout>
  );
}
