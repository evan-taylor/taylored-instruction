import Link from "next/link";
import ClassPageLayout, {
  ClassPageSection,
} from "@/components/ClassPageLayout";
import {
  CERTIFICATION_FACTS,
  ComparisonTable,
  FaqSection,
  QuickFacts,
} from "@/components/ServicePageSections";
import { heartsaverFAQs } from "@/lib/faqSchema";
import { BLS_VS_CPR, COURSE_FORMATS } from "@/lib/service-comparisons";

const linkClassName = "font-medium text-primary hover:underline";

export default function HeartsaverPageContent() {
  return (
    <ClassPageLayout
      course="heartsaver"
      courseName="Heartsaver Certification"
      image={{
        alt: "CPR training class",
        position: "54% 66%",
        src: "/CPR-stock-photo-scaled.jpeg",
      }}
      title="American Heart Association Heartsaver First Aid CPR AED"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Heart Association" },
          {
            label: "Format",
            value:
              "In-person classroom, or blended (online part plus an in-person skills session)",
          },
          {
            label: "Who it's for",
            value:
              "Anyone without medical training who needs CPR, AED or first aid certification for work or school",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course overview">
        <p>
          The American Heart Association Heartsaver courses are for anyone with
          little or no medical training who needs CPR, AED and first aid skills
          to meet a job, regulatory or personal requirement. Heartsaver First
          Aid CPR AED covers all three. Heartsaver CPR AED covers CPR and AED
          use only, so check which one your employer asks for.
        </p>
        <p>
          <strong>Audience:</strong> Teachers, coaches, daycare providers,
          construction workers, fitness trainers, and anyone who wants to be
          prepared for an emergency.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Learning objectives">
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

      <ClassPageSection title="What happens in class">
        <p>
          Heartsaver follows the AHA's practice-while-watching format. A short
          video shows a skill, then you do it on a manikin while the instructor
          coaches you. You practice adult, child and infant CPR, use an AED
          trainer, and work through choking care. In the first aid portion you
          practice controlling bleeding, applying a tourniquet and splinting,
          and you talk through what to do for a heart attack, stroke, seizure,
          allergic reaction or diabetic emergency.
        </p>
        <p>
          The class assumes no background, so it starts with the basics: how to
          check that a scene is safe, when to call 911, and how to tell whether
          someone is breathing normally.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Certification details">
        <p>
          To pass, you demonstrate the required skills to your instructor and
          pass a brief knowledge check. You get your AHA Heartsaver eCard the
          same day, and it is valid for 2 years. Renew before it expires by
          taking the course again, in person or blended.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course options">
        <p>We offer the following formats:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>In-person training:</strong> A single, comprehensive session
            that includes all components of the course.
          </li>
          <li>
            <strong>Blended learning:</strong> Complete the knowledge portion
            online at your own pace, followed by an in-person skills session to
            practice and demonstrate what you&apos;ve learned.
          </li>
        </ul>
        <p>
          Class length depends on the format and course version, so check the
          listing on the schedule for exact start and end times.
        </p>
      </ClassPageSection>

      <ComparisonTable comparison={BLS_VS_CPR} />
      <ComparisonTable comparison={COURSE_FORMATS} />

      <ClassPageSection title="Heartsaver or Red Cross?">
        <p>
          Heartsaver and{" "}
          <Link className={linkClassName} href="/first-aid-cpr-aed">
            Red Cross First Aid/CPR/AED
          </Link>{" "}
          cover similar skills. Take the one your employer or licensing agency
          names. If they accept either, pick the date and location that suit
          you. If you work in healthcare, you need{" "}
          <Link className={linkClassName} href="/bls">
            AHA BLS
          </Link>{" "}
          instead.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Where we teach">
        <p>
          We teach Heartsaver in Vancouver, WA, and serve Camas, Portland, San
          Luis Obispo and the surrounding areas. Each class on the schedule
          lists its exact location. Schools, daycares and businesses can book a
          private class at their site through{" "}
          <Link className={linkClassName} href="/group-training">
            group training
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={heartsaverFAQs} />
    </ClassPageLayout>
  );
}
