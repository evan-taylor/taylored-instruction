import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function HeartsaverPageContent() {
  return (
    <ClassPageLayout
      courseName="Heartsaver Certification"
      image={{
        alt: "CPR training class",
        position: "54% 66%",
        src: "/CPR-stock-photo-scaled.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/aha-heartsaver-first-aid-cpr-aed-2025"
      title="American Heart Association Heartsaver First Aid CPR AED"
    >
      <ClassPageSection title="Course Overview">
        <p>
          The American Heart Association Heartsaver courses are designed for
          anyone with little or no medical training who needs CPR, AED, and
          first aid knowledge to meet job, regulatory, or personal requirements.
          This course covers essential lifesaving skills for workplace training
          or personal preparedness.
        </p>
        <p>
          <strong>Duration:</strong> Approximately 4 hours for in-person, or 1-2
          hours for blended learning.
        </p>
        <p>
          <strong>Audience:</strong> Teachers, coaches, daycare providers,
          construction workers, fitness trainers, and anyone who wants to be
          prepared for an emergency.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Learning Objectives">
        <p>By the end of this course, participants will be able to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Perform high-quality CPR for adults, children, and infants.</li>
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
      </ClassPageSection>

      <ClassPageSection title="Certification Details">
        <p>
          Upon successful completion of the course, participants will receive an
          AHA Heartsaver certification eCard, valid for two years. To pass,
          participants must demonstrate the required skills during hands-on
          practice and pass a brief knowledge check.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Options">
        <p>We offer the following formats:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>In-person Training:</strong> A single, comprehensive session
            that includes all components of the course.
          </li>
          <li>
            <strong>Blended Learning:</strong> Complete the knowledge portion
            online at your own pace, followed by an in-person skills session to
            practice and demonstrate what you&apos;ve learned.
          </li>
        </ul>
      </ClassPageSection>

      <ClassPageSection title="Frequently Asked Questions">
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Who should take a Heartsaver course?
            </h3>
            <p>
              Anyone who needs basic CPR, AED, and first aid knowledge, whether
              for work, school, or personal preparedness. This course is great
              for people with no prior experience.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              How long does the course take?
            </h3>
            <p>
              The course typically lasts 4 hours in-person or 1-2 hours for
              blended learning with additional online coursework.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Are there any prerequisites?
            </h3>
            <p>
              No prior experience or medical knowledge is required to enroll in
              a Heartsaver course.
            </p>
          </div>
        </div>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
