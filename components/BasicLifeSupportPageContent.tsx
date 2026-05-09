import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function BasicLifeSupportPageContent() {
  return (
    <ClassPageLayout
      courseName="Basic Life Support"
      image={{
        alt: "Basic Life Support training session",
        src: "/CPR-Training-Stock-Photo-1-scaled.jpeg",
      }}
      registrationUrl="https://www.hovn.app/service-providers/tayloredinstruction/offerings"
      resources={[
        { href: "/contact", label: "Request Course Fact Sheet" },
        { href: "/contact", label: "Request Participant Manual" },
      ]}
      title="American Red Cross Basic Life Support"
    >
      <ClassPageSection title="Course Purpose">
        <p>
          The American Red Cross Basic Life Support (BLS) course provides
          participants with the knowledge and skills they need to assess,
          recognize and care for patients who are experiencing respiratory
          arrest, cardiac arrest, airway obstruction or opioid overdose. When a
          patient experiences a life-threatening emergency, healthcare providers
          need to act swiftly and promptly.
        </p>
        <p>
          The course emphasizes providing high-quality care and integrating
          psychomotor skills with critical thinking and problem solving to
          achieve the best possible patient outcomes.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Prerequisites">
        <p>None.</p>
      </ClassPageSection>

      <ClassPageSection title="Course Length">
        <p>
          Blended Learning: Approximately 2 hours online, 3 hours in-person.
        </p>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
