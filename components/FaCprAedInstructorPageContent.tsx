import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

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
      <ClassPageSection title="Course purpose">
        <p>
          The purpose of the American Red Cross FA/CPR/AED Instructor course is
          to train instructor candidates to teach the basic-level American Red
          Cross FA/CPR/AED course.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course prerequisites">
        <p>
          FA/CPR/AED Instructor candidates must possess a current basic-level
          certification in FA/CPR/AED or equivalent.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course length">
        <p>
          The FA/CPR/AED Instructor Course is offered in a blended learning
          format that includes:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            FA/CPR/AED Instructor Course online session, designed to be
            completed in approximately 2 hours.
          </li>
          <li>
            FA/CPR/AED Instructor Course in-person session, designed to be
            completed in approximately 8 hours.
          </li>
        </ul>
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
            className="font-medium text-primary hover:underline"
            href="https://www.redcrosslearningcenter.org/s/candidate-resources-first-aid-cpr-aed-21"
            rel="noopener noreferrer"
            target="_blank"
          >
            Red Cross Learning Center
          </Link>
          .
        </p>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
