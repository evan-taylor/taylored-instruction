import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function AhaInstructorTrainingPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="Instructor Training"
      courseName="AHA Instructor Training"
      image={{
        alt: "CPR instructor training session",
        src: "/Cpr-Instructor-Image.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/aha-bls-instructor-2025/"
      subtitle="Build the skills to teach AHA BLS or Heartsaver courses in your community, workplace, or organization."
      title="American Heart Association Instructor Training"
    >
      <ClassPageSection title="Course Overview">
        <p>
          The AHA Instructor Course trains individuals to effectively teach BLS
          or Heartsaver courses. Through online and in-person training, you will
          learn instructional techniques, gain hands-on experience, and receive
          mentorship to support your success as a certified AHA Instructor.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Duration and Audience">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Blended Learning:</strong> 2 hours online, 8 hours
            in-person, excluding monitoring.
          </li>
          <li>
            <strong>Total Commitment:</strong> Approximately 12 hours, including
            teaching your first course.
          </li>
          <li>
            <strong>Audience:</strong> Healthcare providers, workplace safety
            trainers, educators, and anyone passionate about teaching lifesaving
            skills.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Steps to Become an AHA Instructor">
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

      <ClassPageSection title="Certification Details">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Instructor Certification Validity:</strong> 2 years.
          </li>
          <li>
            <strong>Renewal Requirements:</strong> Teach at least four courses
            and complete an Instructor Renewal session every two years.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Frequently Asked Questions">
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Who can become an AHA Instructor?
            </h3>
            <p>
              Anyone with a current AHA Provider certification and a passion for
              teaching lifesaving skills can become an AHA Instructor.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              What disciplines can I teach?
            </h3>
            <p>
              You can choose to teach BLS or Heartsaver courses, depending on
              your interest and audience.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Can I teach independently?
            </h3>
            <p>
              Instructors must align with an AHA Training Site or Training
              Center. This affiliation ensures access to course completion cards
              and administrative support.
            </p>
          </div>
        </div>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
