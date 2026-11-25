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
import { firstAidFAQs } from "@/lib/faqSchema";
import { BLS_VS_CPR, COURSE_FORMATS } from "@/lib/service-comparisons";

const linkClassName = "font-medium text-primary hover:underline";

export default function FirstAidCprAedPageContent() {
  return (
    <ClassPageLayout
      course="first-aid-cpr-aed"
      courseName="First Aid/CPR/AED"
      image={{
        alt: "First Aid CPR AED training session",
        src: "/CPR-Training-Image.jpeg",
      }}
      resources={[
        { href: "/contact", label: "Request course fact sheet" },
        { href: "/contact", label: "Request eBook access instructions" },
      ]}
      title="American Red Cross First Aid/CPR/AED"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Red Cross" },
          {
            label: "Format",
            value:
              "In-person classroom, or blended (online part plus an in-person skills session)",
          },
          {
            label: "Who it's for",
            value:
              "Workplace responders, teachers, childcare staff, coaches and anyone who wants to be ready for an emergency",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course purpose">
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

      <ClassPageSection title="What you practice">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Checking an ill or injured person and deciding when to call 911
          </li>
          <li>
            CPR and AED use, with child and infant CPR in pediatric classes
          </li>
          <li>Choking care for a conscious person</li>
          <li>Controlling severe bleeding, including tourniquet use</li>
          <li>
            Burns, sprains, fractures, and sudden illness such as a heart
            attack, stroke, seizure, diabetic emergency or allergic reaction
          </li>
        </ul>
        <p>
          Most of class time goes to hands-on practice with manikins, AED
          trainers and first aid supplies. You also work through short
          scenarios, so you practice deciding what to do as well as how to do
          it.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course prerequisites">
        <p>
          There are no prerequisites for the core courses within the First
          Aid/CPR/AED r.21 program.
        </p>
        <p>
          <strong>Skill boost prerequisites:</strong> Participants must have a
          valid and current certification in First Aid, including FA/CPR/AED,
          Lifeguarding, EMR, RTE, or equivalent training, to take an optional
          Skill Boost. Participants may also add skill boosts onto a First
          Aid/CPR/AED course.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course length and certification">
        <p>
          Course length depends on the format and the class, so check the
          listing on the schedule for exact start and end times. Blended
          students finish the online part before the in-person session.
        </p>
        <p>
          When you pass, you get a Red Cross digital certificate the same day.
          It is valid for 2 years. Renew before it expires to keep your
          certification current for work.
        </p>
      </ClassPageSection>

      <ComparisonTable comparison={BLS_VS_CPR} />
      <ComparisonTable comparison={COURSE_FORMATS} />

      <ClassPageSection title="Red Cross or AHA Heartsaver?">
        <p>
          This course and{" "}
          <Link className={linkClassName} href="/heartsaver">
            AHA Heartsaver First Aid CPR AED
          </Link>{" "}
          do the same job. Take the one your employer or licensing agency names,
          or either one if they don't specify. Healthcare workers need{" "}
          <Link className={linkClassName} href="/basic-life-support">
            BLS
          </Link>{" "}
          instead. For more help choosing, read{" "}
          <Link
            className={linkClassName}
            href="/blog/first-aid-certification-online-vs-in-person"
          >
            first aid certification online vs in person
          </Link>
          .
        </p>
      </ClassPageSection>

      <ClassPageSection title="Where we teach">
        <p>
          We teach in Vancouver, WA, and serve Camas, Portland, San Luis Obispo
          and the surrounding areas. Each class on the schedule lists its exact
          location. Employers can book a private class for their team through{" "}
          <Link className={linkClassName} href="/group-training">
            group training
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={firstAidFAQs} />
    </ClassPageLayout>
  );
}
