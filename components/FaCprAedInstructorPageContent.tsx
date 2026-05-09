import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function FaCprAedInstructorPageContent() {
  return (
    <ClassPageLayout
      courseName="First Aid/CPR/AED Instructor"
      image={{
        alt: "CPR instructor training session",
        src: "/Cpr-Instructor-Image.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/arc-first-aid-cpr-aed-instructor-r25/"
      resources={[
        { href: "/contact", label: "Request Course Fact Sheet" },
        { href: "/contact", label: "Request Instructor Manual" },
        { href: "/contact", label: "Request Practice Teaching Workbook" },
      ]}
      title="American Red Cross First Aid/CPR/AED Instructor Course"
    >
      <ClassPageSection title="Course Purpose">
        <p>
          The purpose of the American Red Cross FA/CPR/AED Instructor course is
          to train instructor candidates to teach the basic-level American Red
          Cross FA/CPR/AED course.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Prerequisites">
        <p>
          FA/CPR/AED Instructor candidates must possess a current basic-level
          certification in FA/CPR/AED or equivalent.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Length">
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

      <ClassPageSection title="Course Preparation">
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
