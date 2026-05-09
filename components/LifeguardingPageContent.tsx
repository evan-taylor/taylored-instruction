import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";

export default function LifeguardingPageContent() {
  return (
    <ClassPageLayout
      courseName="Lifeguarding"
      image={{
        alt: "Lifeguarding training session",
        position: "center 42%",
        src: "/lifeguard-training.jpeg",
      }}
      registrationUrl="https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-blended"
      resources={[
        { href: "/contact", label: "Request Course Fact Sheet" },
        { href: "/contact", label: "Request eBook Access Instructions" },
      ]}
      secondaryActions={[
        {
          href: "https://www.hovn.app/tayloredinstruction/courses/arc-lifeguarding-recertification-blended",
          label: "View Recertification Courses",
        },
      ]}
      title="American Red Cross Lifeguarding"
    >
      <ClassPageSection title="Course Purpose">
        <p>
          The primary purpose of the American Red Cross Lifeguarding program is
          to provide participants with the knowledge and skills needed to
          prevent, recognize and respond to aquatic emergencies.
        </p>
        <p>
          Participants also learn to provide professional-level care for
          breathing and cardiac emergencies, injuries, and sudden illnesses
          until emergency medical services professionals take over.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Prerequisites">
        <p>
          To participate in the Lifeguarding Including Deep Water course,
          participants must be at least 15 years old on or before the final
          scheduled session and successfully complete two prerequisite swimming
          skills evaluations.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Swim-Tread-Swim Sequence
            </h3>
            <p className="mb-2 text-sm">
              Complete this sequence within 1 minute, 40 seconds:
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                Jump into the water, fully submerge, resurface, then swim 150
                yards using front crawl, breaststroke, or a combination of both.
              </li>
              <li>
                Maintain position at the surface for 2 minutes by treading water
                using only the legs.
              </li>
              <li>
                Swim 50 yards using front crawl, breaststroke, or a combination
                of both.
              </li>
            </ol>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-950 text-lg">
              Timed Brick Event
            </h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Starting in the water, swim 20 yards.</li>
              <li>
                Submerge to a depth of 7-10 feet to retrieve a 10-pound object.
              </li>
              <li>
                Return to the surface and swim 20 yards on the back while
                holding the object at the surface with both hands.
              </li>
              <li>Exit the water without using a ladder or steps.</li>
            </ol>
          </div>
        </div>
      </ClassPageSection>

      <ClassPageSection title="Course Length">
        <p>
          Approximately 7 hours online, 25 hours in-person, including breaks.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course Preparation">
        <p>
          Make sure you are confident with the prerequisites before class. These
          evaluations are conducted as soon as the course begins, and
          participants cannot continue if they are unsuccessful.
        </p>
        <p>
          Complete the eLearning before the first in-person class session. The
          eLearning is sent in the confirmation email after registration. If you
          have questions, please{" "}
          <Link
            className="font-medium text-primary hover:underline"
            href="/contact"
          >
            contact us
          </Link>
          .
        </p>
      </ClassPageSection>
    </ClassPageLayout>
  );
}
