import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function FirstAidCprAedPageContent() {
  return (
    <ClassPageLayout
      courseName="First Aid/CPR/AED"
      image={{
        alt: "First Aid CPR AED training session",
        src: "/CPR-Training-Image.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/certifications/arc-adult-and-pediatric-first-aid-cpr-aed-bl-r25/"
      resources={[
        { href: "/contact", label: "Request Course Fact Sheet" },
        { href: "/contact", label: "Request eBook Access Instructions" },
      ]}
      title="American Red Cross First Aid/CPR/AED"
    >
      <ClassPageSection title="Course Purpose">
        <p>
          The American Red Cross First Aid/CPR/AED r.21 program is designed to
          help participants recognize and respond appropriately to cardiac,
          breathing and first aid emergencies.
        </p>
        <p>
          The courses in this program teach participants the knowledge and
          skills needed to give immediate care to an injured or ill person when
          minutes matter, and to decide whether advanced medical care is needed.
          This program offers First Aid, CPR and AED courses in traditional
          classroom or blended learning formats, plus optional skill boosts for
          specific training needs.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Prerequisites">
        <p>
          There are no prerequisites for the core courses within the First
          Aid/CPR/AED r.21 program.
        </p>
        <p>
          <strong>Skill Boost Prerequisites:</strong> Participants must have a
          valid and current certification in First Aid, including FA/CPR/AED,
          Lifeguarding, EMR, RTE, or equivalent training, to take an optional
          Skill Boost. Participants may also add skill boosts onto a First
          Aid/CPR/AED course.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Length">
        <p>Approximately 2 hours online, 3 hours in-person.</p>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
