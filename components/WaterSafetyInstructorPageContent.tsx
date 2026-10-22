import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function WaterSafetyInstructorPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="Instructor training"
      course="water-safety-instructor"
      courseName="Water Safety Instructor"
      image={{
        alt: "Swim lesson in a pool",
        src: "/swim-lesson-photo.jpeg",
      }}
      resources={[
        {
          href: "https://www.redcross.org/take-a-class/swimming/water-safety/water-safety-instructor-certification",
          label: "Red Cross swim instructor program",
        },
      ]}
      secondaryActions={[{ href: "/contact", label: "Host this course" }]}
      subtitle="Build the skills to teach swimming and water safety to children and adults through American Red Cross instructor training."
      title="American Red Cross Water Safety Instructor Course"
    >
      <ClassPageSection title="Course overview">
        <p>
          Water Safety Instructor (WSI) training prepares candidates to teach
          the Red Cross Swimming and Water Safety program, including Parent and
          Child Aquatics, Preschool Aquatics, Learn-to-Swim Levels 1–6, and
          Adult Swim.
        </p>
        <p>
          Practice planning lessons, demonstrating skills, observing swimmers,
          and giving feedback that helps participants progress.
        </p>
      </ClassPageSection>
      <ClassPageSection title="Before you enroll">
        <p>
          Candidates must meet Red Cross age and swimming prerequisites and
          successfully complete the precourse assessment. Contact us before
          registering to confirm eligibility and preparation requirements.
        </p>
        <p>
          Come ready to demonstrate front crawl, back crawl, breaststroke,
          elementary backstroke, sidestroke, and butterfly, along with floating
          and treading water in deep water.
        </p>
      </ClassPageSection>
      <ClassPageSection title="What you will learn">
        <ul className="list-disc space-y-2 pl-5">
          <li>Plan safe lessons for different ages and swimming abilities.</li>
          <li>Use Red Cross teaching materials and skill progressions.</li>
          <li>Demonstrate strokes and evaluate participant performance.</li>
          <li>Adapt instruction for swimmers with different learning needs.</li>
          <li>Communicate progress and teach practical water safety skills.</li>
        </ul>
      </ClassPageSection>
      <ClassPageSection title="Training and certification">
        <p>
          Training includes classroom learning, in-water skill development, and
          practice teaching. Each scheduled class will list its meeting times,
          location, and any online preparation requirements.
        </p>
        <p>
          Certification requires successful completion of the precourse session,
          full participation, teaching assignments, and a final written exam
          score of at least 80%. The Water Safety Instructor certificate is
          valid for two years.
        </p>
      </ClassPageSection>
      <ClassPageSection title="Materials and preparation">
        <p>
          Candidates use the Water Safety Instructor’s Manual and Swimming and
          Water Safety manual. Contact us for the materials list and preparation
          instructions before your class.
        </p>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
