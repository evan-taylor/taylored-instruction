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
import { redCrossBlsFAQs } from "@/lib/faqSchema";
import { AHA_VS_RED_CROSS_BLS, BLS_VS_CPR } from "@/lib/service-comparisons";

const linkClassName = "font-medium text-primary hover:underline";

export default function BasicLifeSupportPageContent() {
  return (
    <ClassPageLayout
      badgeLabel="American Red Cross"
      course="basic-life-support"
      courseName="Red Cross BLS"
      image={{
        alt: "Basic Life Support training session",
        src: "/CPR-Training-Stock-Photo-1-scaled.jpeg",
      }}
      resources={[
        { href: "/contact", label: "Request course fact sheet" },
        { href: "/contact", label: "Request participant manual" },
      ]}
      subtitle="The American Red Cross Basic Life Support course for healthcare providers, taught as blended learning with an in-person skills session."
      title="Red Cross Basic Life Support (BLS) Certification"
    >
      <QuickFacts
        facts={[
          { label: "Certifying body", value: "American Red Cross" },
          {
            label: "Format",
            value:
              "Blended learning: online part, then an in-person skills session",
          },
          {
            label: "Who it's for",
            value:
              "Healthcare providers, first responders and students whose employer or program accepts Red Cross BLS",
          },
          ...CERTIFICATION_FACTS,
        ]}
      />

      <ClassPageSection title="Course purpose">
        <p>
          The American Red Cross Basic Life Support (BLS) course teaches you to
          assess, recognize and care for patients in respiratory arrest, cardiac
          arrest, airway obstruction or opioid overdose. It focuses on
          high-quality care and on pairing hands-on skills with quick decisions,
          the way a healthcare team works during a real emergency.
        </p>
        <p>
          This page covers the Red Cross course. If your hospital, clinic or
          school asks for American Heart Association certification, book{" "}
          <Link className={linkClassName} href="/bls">
            AHA BLS
          </Link>{" "}
          instead. The comparison below shows how the two differ.
        </p>
      </ClassPageSection>

      <ClassPageSection title="How the blended course works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Register for a class on the schedule. Each listing shows the date,
            time and location of its skills session.
          </li>
          <li>
            Finish the online part at your own pace before your session. It
            covers assessment, CPR, AED use, airway management and team roles.
          </li>
          <li>
            At the in-person session you practice on adult, child and infant
            manikins: compressions, bag-valve-mask ventilation, AED use, choking
            care and team resuscitation scenarios.
          </li>
          <li>
            An instructor checks each skill. When you pass, you get your Red
            Cross digital certificate the same day.
          </li>
        </ol>
        <p>
          Course length depends on the format and the class, so check the
          listing on the schedule for exact start and end times.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Course prerequisites">
        <p>
          None. Anyone can take Red Cross BLS, though the course is written for
          people who work or train in healthcare.
        </p>
      </ClassPageSection>

      <ClassPageSection title="Who takes Red Cross BLS">
        <p>
          Nurses, CNAs, medical and dental staff, EMTs and healthcare students
          take this course when their employer or program accepts Red Cross BLS.
          Before you book, check which card your workplace needs. If it names
          the American Heart Association, our{" "}
          <Link className={linkClassName} href="/bls">
            AHA BLS course
          </Link>{" "}
          is the right one. If your job isn't in healthcare, see{" "}
          <Link className={linkClassName} href="/first-aid-cpr-aed">
            Red Cross First Aid/CPR/AED
          </Link>
          .
        </p>
      </ClassPageSection>

      <ClassPageSection title="Renewal">
        <p>
          Red Cross BLS certification is valid for 2 years. Renew before your
          certificate expires so you don't have a gap at work. Our guide on{" "}
          <Link
            className={linkClassName}
            href="/blog/bls-recertification-online-vs-in-person"
          >
            BLS recertification online vs in person
          </Link>{" "}
          explains which renewal formats employers accept.
        </p>
      </ClassPageSection>

      <ComparisonTable comparison={AHA_VS_RED_CROSS_BLS} />
      <ComparisonTable comparison={BLS_VS_CPR} />

      <ClassPageSection title="Where we teach">
        <p>
          We teach in Vancouver, WA, and serve Camas, Portland, San Luis Obispo
          and the surrounding areas. Each class on the schedule lists its exact
          location. Clinics and offices can book a private session through{" "}
          <Link className={linkClassName} href="/group-training">
            group training
          </Link>
          .
        </p>
      </ClassPageSection>

      <FaqSection faqs={redCrossBlsFAQs} />
    </ClassPageLayout>
  );
}
