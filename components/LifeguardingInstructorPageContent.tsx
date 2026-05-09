import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function LifeguardingInstructorPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="Instructor Training"
      courseName="Lifeguarding Instructor"
      image={{
        alt: "Lifeguarding instructor course training",
        src: "/lifeguard-training.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-instructor-blended"
      secondaryActions={[{ href: "/contact", label: "Host This Course" }]}
      subtitle="Train to teach Red Cross Lifeguarding courses through blended online and in-person sessions led by an Instructor Trainer."
      title="American Red Cross Lifeguarding Instructor Course"
    >
      <ClassPageSection title="Course Overview">
        <p>
          The Lifeguarding Instructor course prepares instructor candidates to
          teach American Red Cross Lifeguarding courses. Candidates learn to
          plan and deliver effective training sessions, evaluate participant
          skills, and manage course administration using Red Cross program
          materials.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Prerequisites">
        <ul className="list-disc space-y-2 pl-5">
          <li>Minimum age of 17 by the last day of the course.</li>
          <li>
            Possess a current basic-level certification in American Red Cross
            Lifeguarding Including Deep Water with CPR/AED for Professional
            Rescuers and First Aid.
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
            Successfully complete the prerequisite skill assessment scenario.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Course Format and Length">
        <p>
          This is a blended learning course consisting of an online session
          completed independently, followed by instructor-led classroom and
          in-water sessions.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Online session: approximately 2 hours to complete.</li>
          <li>
            In-person sessions, including the precourse, include 16 hours of
            instruction time. This does not include breaks or transitions.
          </li>
        </ul>
        <p>
          Upon successful completion, participants earn the American Red Cross
          Lifeguarding Instructor certification.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Materials">
        <p>
          Lifeguarding Instructor candidates should obtain and review the
          following r.24 materials before attending:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Lifeguarding Instructor&apos;s Manual.</li>
          <li>Lifeguarding Instructor&apos;s Deck Book.</li>
          <li>Lifeguarding Manual, digital or print.</li>
          <li>Lifeguarding course videos.</li>
          <li>Lifeguarding Course Presentation for Instructor-Led Training.</li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="What You Will Learn">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            How to teach and evaluate Red Cross Lifeguarding course
            participants.
          </li>
          <li>
            Effective demonstration, practice, and feedback strategies for
            in-water skills.
          </li>
          <li>
            How to use the Instructor Manual, course outlines, and Red Cross
            administrative tools.
          </li>
          <li>
            How to set up safe training environments and manage scenarios.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Successful Completion">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Complete the Lifeguarding Instructor Course online session and
            prerequisite skill assessment scenario.
          </li>
          <li>
            Complete skill practice and polish sessions while demonstrating
            instructor-level competency.
          </li>
          <li>
            Attend the entire course and actively participate in all class
            sessions and activities.
          </li>
          <li>
            Successfully complete teaching assignments and pass the final
            written exam with a minimum score of 80%.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Certification and Recertification">
        <p>
          Candidates who successfully complete the course are issued the
          American Red Cross Lifeguarding Instructor certificate, valid for 2
          years.
        </p>
        <p>
          To maintain certification, instructors must complete the Lifeguarding
          Instructor Recertification blended learning course within the 2-year
          certification period. If expired, instructors are eligible to
          participate in recertification for up to 1 year past expiration, but
          this grace period does not extend certification.
        </p>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
