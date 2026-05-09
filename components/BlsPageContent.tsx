import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function BlsPageContent() {
  return (
    <ClassPageLayout
      courseName="BLS Certification"
      image={{
        alt: "CPR training session",
        position: "20% 51%",
        src: "/CPR-Training-Stock-Photo-1-scaled.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/aha-bls-provider-2025/"
      title="American Heart Association Basic Life Support"
    >
      <ClassPageSection title="Course Overview">
        <p>
          Our American Heart Association (AHA) Basic Life Support (BLS) course
          is designed for healthcare professionals and first responders, though
          anyone is welcome. You&apos;ll learn high-quality CPR for adults,
          children, and infants, how to use an AED effectively, and essential
          skills for recognizing and responding to life-threatening emergencies.
        </p>
        <p>
          <strong>Duration:</strong> Approximately 4 hours for in-person, or 2
          hours for blended learning.
        </p>
        <p>
          <strong>Audience:</strong> Healthcare providers, first responders, and
          anyone required to have BLS certification as part of their job or
          studies.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Learning Objectives">
        <p>By the end of this course, participants will be able to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Perform high-quality CPR for adults, children, and infants.</li>
          <li>Use an AED effectively and promptly.</li>
          <li>Relieve choking in various age groups.</li>
          <li>Recognize life-threatening emergencies and take action.</li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Certification Details">
        <p>
          Upon successful completion, participants will receive an AHA BLS
          Provider eCard, valid for two years. To pass, attendees must
          demonstrate their skills and pass a written test.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Options">
        <p>We offer:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>In-person Training:</strong> Complete all course components
            in one session.
          </li>
          <li>
            <strong>Blended Learning:</strong> Complete part of the course
            online at your own pace, followed by an in-person skills session.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Frequently Asked Questions">
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Who needs a BLS certification?
            </h3>
            <p>
              BLS certification is essential for healthcare providers, nursing
              and medical students, first responders, and anyone needing basic
              life support knowledge for their career or studies.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              How long is the course?
            </h3>
            <p>
              The in-person course typically takes around 4 hours, including
              breaks and hands-on skills practice.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Are there any prerequisites?
            </h3>
            <p>
              There are no prerequisites to take this course. Prior CPR
              knowledge can be helpful but is not required.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              What do I need to bring?
            </h3>
            <p>
              Please bring a valid photo ID, comfortable clothing for practice
              sessions, and your completion certificate if taking a blended
              learning class. All course materials will be provided.
            </p>
          </div>
        </div>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
