import type { Metadata } from "next";
import Link from "next/link";
import { ClassPageSection } from "@/components/ClassPageLayout";
import { GroupTrainingRequest } from "@/components/registration/group-request";
import {
  FaqSection,
  type QuickFact,
  QuickFacts,
} from "@/components/ServicePageSections";
import { getFAQSchema, groupTrainingFAQs } from "@/lib/faqSchema";
import { indexable } from "@/lib/registration-seo";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
} from "@/lib/structuredData";

const pageDescription =
  "Request CPR, BLS, first aid, or lifeguarding training for your team. On-site or at our Vancouver, WA facility, with volume pricing and invoice billing.";

export const metadata: Metadata = indexable(
  buildPageMetadata({
    title: "Request Group Training | Taylored Instruction",
    description: pageDescription,
    path: "/group-training",
    image: {
      title: "Group CPR & lifeguard training for your team",
      eyebrow: "On-site or at our facility",
    },
  })
);

const linkClassName = "font-medium text-primary hover:underline";

const GROUP_FACTS: QuickFact[] = [
  {
    label: "Certifying bodies",
    value: "American Heart Association or American Red Cross",
  },
  {
    label: "Format",
    value:
      "On-site at your workplace or at our Vancouver facility, in person or blended",
  },
  {
    label: "Who it's for",
    value:
      "Employers, clinics, schools, daycares, pools and any team that needs staff certified together",
  },
  { label: "Cards", value: "Valid for 2 years, issued as same-day eCards" },
  {
    label: "Service area",
    value: "Vancouver, Camas, Portland, San Luis Obispo and surrounding areas",
  },
  {
    label: "Pricing",
    value: "A quote based on your group size, course and location",
  },
];

const serviceSchema = getServiceSchema({
  name: "Group CPR, BLS, First Aid and Lifeguard Training",
  description: pageDescription,
  path: "/group-training",
  serviceType: "Group Safety Certification Training",
  areaServed: [
    "Vancouver, WA",
    "Camas, WA",
    "Portland, OR",
    "San Luis Obispo, CA",
  ],
  audienceType: "Employers, schools, clinics, and aquatic facilities",
});

const breadcrumbSchema = getBreadcrumbSchema([
  { name: "Home", url: SITE_URL },
  { name: "Group Training", url: `${SITE_URL}/group-training` },
]);

export default function Page() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(serviceSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(
          getFAQSchema(groupTrainingFAQs)
        )}
        type="application/ld+json"
      />
      <GroupTrainingRequest />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-14 sm:px-6 lg:px-8">
        <QuickFacts facts={GROUP_FACTS} />

        <ClassPageSection title="How group training works">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Send the request form above with your course, headcount and
              preferred dates.
            </li>
            <li>
              We reply within one business day with dates, a quote and a plan.
            </li>
            <li>
              For blended courses, your staff finish the online part on their
              own time before the session.
            </li>
            <li>
              We run the class at your site or ours and bring manikins, AED
              trainers and materials.
            </li>
            <li>
              Everyone who passes gets an AHA or Red Cross eCard the same day.
            </li>
          </ol>
        </ClassPageSection>

        <ClassPageSection title="Choosing a course for your team">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Healthcare and dental teams:</strong>{" "}
              <Link className={linkClassName} href="/bls">
                AHA BLS
              </Link>{" "}
              or{" "}
              <Link className={linkClassName} href="/basic-life-support">
                Red Cross BLS
              </Link>
              .
            </li>
            <li>
              <strong>Offices, schools, daycares and job sites:</strong>{" "}
              <Link className={linkClassName} href="/heartsaver">
                AHA Heartsaver
              </Link>{" "}
              or{" "}
              <Link className={linkClassName} href="/first-aid-cpr-aed">
                Red Cross First Aid/CPR/AED
              </Link>
              .
            </li>
            <li>
              <strong>Pools and aquatic facilities:</strong>{" "}
              <Link className={linkClassName} href="/lifeguarding">
                Red Cross Lifeguarding
              </Link>
              , plus{" "}
              <Link className={linkClassName} href="/lifeguarding-instructor">
                Lifeguarding Instructor
              </Link>{" "}
              if you want to certify guards in-house.
            </li>
          </ul>
          <p>
            Larger employers with ongoing needs should also see{" "}
            <Link className={linkClassName} href="/corporate-training">
              corporate CPR training
            </Link>
            . For budgeting, read our guide to{" "}
            <Link
              className={linkClassName}
              href="/blog/group-cpr-training-for-companies"
            >
              group CPR training for companies
            </Link>
            .
          </p>
        </ClassPageSection>

        <FaqSection faqs={groupTrainingFAQs} />
      </div>
    </>
  );
}
