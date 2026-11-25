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
import { ahaBlsFAQs } from "@/lib/faqSchema";
import {
  AHA_VS_RED_CROSS_BLS,
  BLS_VS_CPR,
  COURSE_FORMATS,
} from "@/lib/service-comparisons";

const linkClassName = "font-medium text-primary hover:underline";

export default function BlsPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="American Heart Association"
      course="bls"
      courseName="AHA BLS"
      image={{
        alt: "CPR training session",
        position: "20% 51%",
        src: "/CPR-Training-Stock-Photo-1-scaled.jpeg",
      }}
      subtitle="The American Heart Association BLS Provider course for nurses, medical and dental staff, EMTs and healthcare students, in the classroom or as HeartCode BLS."
      title="AHA BLS Certification (American Heart Association)"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Heart Association" },
          {
            label: "Format",
            value:
              "In-person classroom, or HeartCode BLS (online part plus an in-person skills session)",
          },
          {
            label: "Who it's for",
            value:
              "Healthcare providers, first responders and students in clinical programs",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course overview">
        <p>
          AHA BLS (Basic Life Support) is the CPR certification most hospitals,
          clinics and nursing programs ask for. It is written for healthcare
          providers and first responders, though anyone can take it. You learn
          high-quality CPR for adults, children and infants, how to use an AED,
          how to give breaths with a bag-mask device, and how to work as part of
          a team during a resuscitation.
        </p>
        <p>
          This page covers the American Heart Association course. If your
          employer accepts Red Cross certification instead, see{" "}
          <Link className={linkClassName} href="/basic-life-support">
            Red Cross Basic Life Support
          </Link>
          . The two courses teach nearly the same skills, and the comparison
          below shows where they differ.
        </p>
      </ClassPageSection>

      <ClassPageSection title="What happens in class">
        <p>
          Most of the class is hands-on practice with manikins. A typical class
          runs in this order:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Short video segments on the chain of survival, scene safety and
            recognizing cardiac arrest.
          </li>
          <li>
            Adult CPR practice with a feedback device that shows your
            compression depth and rate as you work.
          </li>
          <li>
            AED use with trainer units, then two-rescuer CPR with a bag-mask
            device.
          </li>
          <li>
            Child and infant CPR, including two-thumb compressions for infants.
          </li>
          <li>Choking relief for adults, children and infants.</li>
          <li>
            Team scenarios where you rotate through compressor, airway and AED
            roles.
          </li>
          <li>The skills test and a written exam.</li>
        </ol>
      </ClassPageSection>

      <ClassPageSection title="Skills check and your card">
        <p>
          To pass, you show adult and infant CPR to the AHA standard in front of
          an instructor and pass the written exam. Your AHA BLS Provider eCard
          arrives the same day, and it is valid for 2 years.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Renewing your BLS">
        <p>
          AHA cards list a recommended renewal date 2 years after your class.
          Book a renewal before that date so you have no gap in coverage.
          Renewing students often choose HeartCode BLS: do the online part when
          it suits you, then come in for a shorter skills session. Our guide to{" "}
          <Link
            className={linkClassName}
            href="/blog/how-to-renew-bls-certification"
          >
            renewing BLS certification
          </Link>{" "}
          walks through the options.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Who needs AHA BLS">
        <ul className="list-disc space-y-2 pl-5">
          <li>Nurses, CNAs and medical assistants</li>
          <li>Dentists, hygienists and dental assistants</li>
          <li>EMTs, firefighters and other first responders</li>
          <li>Nursing, medical, dental and allied health students</li>
          <li>Pharmacists, therapists and clinic staff</li>
        </ul>
        <p>
          If you don't work in healthcare, you probably need a workplace CPR
          course instead, such as{" "}
          <Link className={linkClassName} href="/heartsaver">
            AHA Heartsaver
          </Link>
          .
        </p>
      </ClassPageSection>

      <ComparisonTable comparison={AHA_VS_RED_CROSS_BLS} />
      <ComparisonTable comparison={BLS_VS_CPR} />
      <ComparisonTable comparison={COURSE_FORMATS} />

      <ClassPageSection title="Where we teach">
        <p>
          We teach AHA BLS in Vancouver, WA, and serve Camas, Portland, San Luis
          Obispo and the surrounding areas. Each class on the schedule lists its
          exact location. For a clinic or office, we can run BLS on-site for
          your staff through{" "}
          <Link className={linkClassName} href="/group-training">
            group training
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={ahaBlsFAQs} />
    </ClassPageLayout>
  );
}
