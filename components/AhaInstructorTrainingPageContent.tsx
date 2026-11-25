import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";
import {
  CERTIFICATION_FACTS,
  FaqSection,
  QuickFacts,
} from "@/components/ServicePageSections";
import { ahaInstructorFAQs } from "@/lib/faqSchema";

const linkClassName = "font-medium text-primary hover:underline";

export default function AhaInstructorTrainingPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="Instructor training"
      course="aha-instructor-training"
      courseName="AHA Instructor Training"
      image={{
        alt: "CPR instructor training session",
        src: "/Cpr-Instructor-Image.jpeg",
      }}
      subtitle="Build the skills to teach AHA BLS or Heartsaver courses in your community, workplace, or organization."
      title="American Heart Association Instructor Training"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Heart Association" },
          {
            label: "Format",
            value:
              "Online Instructor Essentials, an in-person course, then a monitored class",
          },
          {
            label: "Who it's for",
            value:
              "Current AHA BLS or Heartsaver providers who want to teach that course",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course overview">
        <p>
          The AHA Instructor Course trains individuals to effectively teach BLS
          or Heartsaver courses. Through online and in-person training, you will
          learn instructional techniques, gain hands-on experience, and receive
          mentorship to support your success as a certified AHA Instructor.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Format and audience">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Format:</strong> Online Instructor Essentials, an in-person
            instructor course, then a monitored first class. Session dates and
            times vary, so check the listing on the schedule.
          </li>
          <li>
            <strong>Audience:</strong> Healthcare providers, workplace safety
            trainers, educators, and anyone passionate about teaching lifesaving
            skills.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Steps to become an AHA instructor">
        <ol className="list-decimal space-y-4 pl-5">
          <li>
            <strong>Complete the prerequisites.</strong> Hold a current AHA
            Provider certification for the discipline you wish to teach and
            request an AHA Instructor Candidate Application through our contact
            form.
          </li>
          <li>
            <strong>Enroll in the AHA Instructor Course.</strong> Choose the
            discipline you want to teach: BLS Instructor or Heartsaver
            Instructor.
          </li>
          <li>
            <strong>Complete Online Instructor Essentials.</strong> This
            self-paced module introduces AHA teaching philosophy and course
            administration processes.
          </li>
          <li>
            <strong>Attend the in-person instructor training.</strong> Practice
            teaching, review course materials, and receive feedback from
            experienced AHA Training Faculty.
          </li>
          <li>
            <strong>Complete a monitoring session.</strong> Teach your first
            class under supervision so you are prepared to lead courses
            independently.
          </li>
          <li>
            <strong>Receive your instructor certification.</strong> Once all
            steps are complete, you will receive your AHA Instructor eCard,
            valid for two years.
          </li>
        </ol>
      </ClassPageSection>

      <ClassPageSection title="Certification details">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Instructor certification validity:</strong> 2 years.
          </li>
          <li>
            <strong>Renewal requirements:</strong> Teach at least four courses
            and complete an Instructor Renewal session every two years.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="What the in-person course covers">
        <p>
          You already know the skills, so the course is about teaching them. You
          learn how AHA courses are structured, how to run the
          practice-while-watching video format, how to coach students and
          correct technique, and how to run skills tests and remediation the AHA
          way. You practice teaching segments to the group and get feedback from
          Training Faculty. You also learn course administration: rosters,
          issuing eCards, and keeping equipment and materials current.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Teaching through a Training Site">
        <p>
          Every AHA instructor teaches through an AHA Training Center or
          Training Site, which issues cards and handles quality assurance.
          Taylored Instruction is an AHA Training Site through the Resuscitation
          Group, and our founder, Evan Taylor, is AHA Training Faculty. New
          instructors can{" "}
          <Link className={linkClassName} href="/alignment">
            align with Taylored Instruction
          </Link>{" "}
          to teach in their workplace or community.
        </p>
        <p>
          We teach in Vancouver, WA, and serve Camas, Portland, San Luis Obispo
          and the surrounding areas. Not sure which provider course you need
          first? See{" "}
          <Link className={linkClassName} href="/bls">
            AHA BLS
          </Link>{" "}
          or{" "}
          <Link className={linkClassName} href="/heartsaver">
            Heartsaver
          </Link>
          . If you'd rather teach Red Cross courses, see the{" "}
          <Link className={linkClassName} href="/fa-cpr-aed-instructor">
            Red Cross First Aid/CPR/AED Instructor course
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={ahaInstructorFAQs} />
    </ClassPageLayout>
  );
}
