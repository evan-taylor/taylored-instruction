"use cache";

import { cacheLife } from "next/cache";
import Link from "next/link";
import { CancellationPolicyDocument } from "@/components/cancellation-policy-document";
import { BUSINESS } from "@/lib/business";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";
import { CURRENT_CANCELLATION_POLICY } from "@/shared/cancellation-policy";

const pageTitle = "Terms and Conditions | Taylored Instruction";
const pageDescription =
  "Read terms and conditions for course bookings, rescheduling, refunds, liability, and media consent at Taylored Instruction LLC.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/terms",
  keywords: [
    "Taylored Instruction terms and conditions",
    "CPR class cancellation policy",
    "CPR course rescheduling policy",
    "training liability waiver terms",
  ],
  image: { title: "Terms and Conditions" },
});

export default async function TermsPage() {
  cacheLife("days");
  const webPageSchema = getWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    path: "/terms",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Terms", url: "https://tayloredinstruction.com/terms" },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      {/* Hero/Title Section */}
      <section className="relative py-16 md:py-24">
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mb-4 font-bold text-3xl text-text md:text-4xl">
            Terms and conditions for course bookings
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-text md:text-xl">
            By booking a course with Taylored Instruction LLC, you agree to the
            following Terms and Conditions, which include our
            cancellation/refund policy, liability waiver, and media consent.
            These terms are designed to ensure transparency and a mutual
            understanding of responsibilities. Please read carefully before
            booking.
          </p>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-6 font-semibold text-2xl text-text">
            Cancellation and refund policy
          </h2>
          <div className="text-text-light leading-relaxed">
            <CancellationPolicyDocument policy={CURRENT_CANCELLATION_POLICY} />
          </div>
          <p className="mt-4 text-sm text-text-light">
            Version {CURRENT_CANCELLATION_POLICY.version}.{" "}
            <Link
              className="text-primary hover:underline"
              href={`/cancellation-policy/v/${CURRENT_CANCELLATION_POLICY.version}`}
            >
              Permanent link to this version
            </Link>
            .
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Return and refund policy for the online shop
          </h2>
          <h3 className="mb-3 font-semibold text-text text-xl">
            Digital goods
          </h3>
          <p>
            All digital goods, including eBooks, course access codes, and
            eCards, are not eligible for a refund once they have been delivered.
            Please review product details carefully before purchase.
          </p>

          <h3 className="mb-3 font-semibold text-text text-xl">
            Physical goods
          </h3>
          <p>
            Physical goods are eligible for a refund within 30 days of purchase,
            provided they are returned in their original, unopened packaging. To
            initiate a return, please contact us with your order details at{" "}
            <a
              className="text-primary hover:underline"
              href={`mailto:${BUSINESS.email}`}
            >
              {BUSINESS.email}
            </a>
            . Return shipping costs may apply and are the responsibility of the
            customer unless the product is defective or incorrect. Refunds will
            be processed once the returned item is received and inspected.
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Messaging terms and conditions
          </h2>

          <p>
            By providing your phone number and agreeing to receive texts, you
            consent to receive account-related SMS messages from Taylored
            Instruction at {BUSINESS.phone.display}. Message frequency varies.
            Message and data rates may apply. Consent is not a condition of
            purchase.
          </p>
          <p>
            To stop receiving messages, text <strong>STOP</strong>. For help,
            text <strong>HELP</strong>.
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Agreement, waiver, and release of liability
          </h2>
          <p>
            By enrolling in a course or program with Taylored Instruction LLC,
            you acknowledge and agree to the following terms. Participation in
            Taylored Instruction&apos;s training courses, including CPR, First
            Aid, and any other programs, involves inherent risks, which may
            include but are not limited to physical injury or stress. By
            choosing to participate, you voluntarily assume all risks associated
            with these activities.
          </p>
          <p>
            You agree to waive, release, and discharge Taylored Instruction LLC,
            its instructors, agents, employees, and affiliates from any and all
            claims or liability for personal injury, illness, property damage,
            or death arising out of or related to participation in our courses,
            whether caused by negligence or otherwise. Additionally, you agree
            to indemnify and hold harmless Taylored Instruction LLC, its
            instructors, agents, employees, and affiliates from any loss,
            liability, damage, or cost incurred as a result of your
            participation or the participation of a minor for whom you are
            responsible.
          </p>
          <p>
            You affirm that you, or the participant for whom you are
            responsible, are in good physical condition and capable of safely
            participating in the selected course or program. You understand and
            agree that participation in a Taylored Instruction program does not
            guarantee mastery of the skills taught or certification if course
            requirements are not met.
          </p>
          <p>
            By completing your registration or booking, you confirm that you
            have read, understood, and voluntarily agree to these Terms and
            Conditions, including this waiver and release of liability. You
            acknowledge that this agreement constitutes a legally binding
            contract between Taylored Instruction LLC and yourself.
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Media consent
          </h2>
          <p>
            By booking a course with Taylored Instruction LLC, you grant us
            permission to take photos or videos during the training session that
            may include you or your group. These photos or videos may be used
            for promotional purposes, including but not limited to posts on our
            website, social media platforms, and other marketing materials.
          </p>
          <p>
            If you do not wish to appear in photos or videos, you must notify
            the instructor in writing before the start of the course. We respect
            all privacy requests and will ensure no media featuring you is used
            if you opt out.
          </p>

          <p className="mt-8">
            If you have any questions about these terms, please contact us at{" "}
            <a
              className="text-primary hover:underline"
              href={`mailto:${BUSINESS.email}`}
            >
              {BUSINESS.email}
            </a>{" "}
            before proceeding with your booking. Thank you for choosing Taylored
            Instruction LLC for your training needs!
          </p>
        </div>
      </section>
    </>
  );
}
