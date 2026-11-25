import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";
import {
  CERTIFICATION_FACTS,
  FaqSection,
  QuickFacts,
} from "@/components/ServicePageSections";
import { lifeguardFAQs } from "@/lib/faqSchema";

const linkClassName = "font-medium text-primary hover:underline";

export default function LifeguardingPageContent() {
  return (
    <ClassPageLayout
      course="lifeguarding"
      courseName="Lifeguarding"
      image={{
        alt: "Lifeguarding training session",
        position: "center 42%",
        src: "/lifeguard-training.jpeg",
      }}
      resources={[
        { href: "/contact", label: "Request course fact sheet" },
        { href: "/contact", label: "Request eBook access instructions" },
      ]}
      secondaryActions={[
        {
          href: "/classes?q=recertification",
          label: "View recertification courses",
        },
      ]}
      title="American Red Cross Lifeguarding"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Red Cross" },
          {
            label: "Format",
            value:
              "Blended: eLearning, then in-person classroom and in-water sessions",
          },
          {
            label: "Who it's for",
            value:
              "Anyone 15 or older who wants to work as a pool or aquatic facility lifeguard",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course purpose">
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

      <ClassPageSection title="Course prerequisites">
        <p>
          To participate in the Lifeguarding Including Deep Water course,
          participants must be at least 15 years old on or before the final
          scheduled session and successfully complete two prerequisite swimming
          skills evaluations.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold text-lg text-slate-950">
              Swim-tread-swim sequence
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
            <h3 className="mb-2 font-semibold text-lg text-slate-950">
              Timed brick event
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

      <ClassPageSection title="What you learn">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Surveillance: scanning your zone and spotting a swimmer in trouble
          </li>
          <li>
            Entries, approaches and rescues for active and passive victims in
            shallow and deep water
          </li>
          <li>
            Caring for a possible head, neck or spinal injury in the water
          </li>
          <li>Removing a victim from the water with a backboard</li>
          <li>
            CPR/AED for Professional Rescuers, including bag-valve-mask
            ventilation and two-rescuer CPR
          </li>
          <li>First aid for injuries and sudden illness on the pool deck</li>
        </ul>
        <p>
          You spend much of the course in the water, practicing rescues on other
          students and working through emergency scenarios as a team. Passing
          requires showing each skill to your instructor and passing the written
          exams.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course length">
        <p>
          Lifeguarding runs over several in-person sessions after the eLearning.
          Session dates and times vary by class, so check the listing on the
          schedule before you register and plan to attend every session.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course preparation">
        <p>
          Make sure you are confident with the prerequisites before class. These
          evaluations are conducted as soon as the course begins, and
          participants cannot continue if they are unsuccessful.
        </p>
        <p>
          Complete the eLearning before the first in-person class session. The
          eLearning is sent in the confirmation email after registration. If you
          have questions, please{" "}
          <Link className={linkClassName} href="/contact">
            contact us
          </Link>
          .
        </p>
      </ClassPageSection>

      <ClassPageSection title="Certification and recertification">
        <p>
          When you pass, you get Red Cross Lifeguarding, CPR/AED for
          Professional Rescuers and First Aid certificates the same day. All
          three are valid for 2 years. If your certificate is still current, you
          can take a shorter recertification course instead of the full course.
          Our guide to{" "}
          <Link
            className={linkClassName}
            href="/blog/lifeguard-recertification-requirements"
          >
            lifeguard recertification requirements
          </Link>{" "}
          covers the details.
        </p>
        <p>
          Want to teach lifeguarding later? Lifeguards 17 and older can take the{" "}
          <Link className={linkClassName} href="/lifeguarding-instructor">
            Red Cross Lifeguarding Instructor course
          </Link>
          .
        </p>
      </ClassPageSection>

      <ClassPageSection title="Where we teach">
        <p>
          We run lifeguarding classes in Vancouver, WA, and serve Camas,
          Portland, San Luis Obispo and the surrounding areas. Each class on the
          schedule lists its pool. Aquatic facilities that need to certify a
          staff group can{" "}
          <Link className={linkClassName} href="/group-training">
            request group training
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={lifeguardFAQs} />
    </ClassPageLayout>
  );
}
