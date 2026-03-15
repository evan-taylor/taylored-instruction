"use cache";

import { cacheLife } from "next/cache";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

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
  image: {
    title: "Terms and Conditions",
    description: "Course booking, refund, and policy terms",
  },
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
            Taylored Instruction – Terms and Conditions for Course Bookings
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
            Cancellation and Refund Policy
          </h2>
          <h3 className="mb-3 font-semibold text-text text-xl">
            Reschedule and Refund Policy
          </h3>
          <p>
            At Taylored Instruction, we do not offer refunds for course
            registrations. Instead, we provide the flexibility to reschedule
            your registration. Please review the following guidelines:
          </p>

          <h4 className="mb-2 font-semibold text-lg text-text">
            Rescheduling Policy
          </h4>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>
              Rescheduling requests made <strong>7 or more days</strong> before
              the scheduled start date will incur no additional charges.
            </li>
            <li>
              Rescheduling requests made <strong>less than 7 days</strong>{" "}
              before the scheduled start date will incur a $20 administrative
              fee.
            </li>
          </ul>

          <h4 className="mb-2 font-semibold text-lg text-text">
            Refund Exceptions
          </h4>
          <p>
            Refunds are only provided if no courses of the type you registered
            for are forecasted to be available within the next 3 months. In such
            cases, a refund will be issued minus a $20 administrative fee.
          </p>

          <h3 className="mt-8 mb-3 font-semibold text-text text-xl">
            eLearning Policy
          </h3>
          <p>
            Blended learning courses require completion of eLearning modules
            prior to the in-person session. Failure to complete the eLearning
            will prevent participation in the course. Refunds are not available
            in these cases, but we encourage you to contact us for assistance if
            you anticipate delays in completing the required materials.
          </p>

          <h3 className="mt-8 mb-3 font-semibold text-text text-xl">
            Prerequisites
          </h3>
          <p>
            Some of our courses may have prerequisites. Please review the course
            description carefully when you sign up for a course. We are not able
            to offer a refund in the event that you are not able to complete the
            course due to not meeting the prerequisites. If you have any
            questions about the prerequisites, please contact us at{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:info@tayloredinstruction.com"
            >
              info@tayloredinstruction.com
            </a>
            .
          </p>
          <h3 className="mt-8 mb-3 font-semibold text-text text-xl">
            Late Arrivals
          </h3>
          <p>
            All of our courses begin on time and promptly. If you arrive more
            than 10 minutes late to your course, you will have already missed
            content, and may not be eligible to participate. In such a case, you
            may reschedule your registration for a fee of $20.
          </p>
          <p>
            In exceptional cases, refunds or adjustments may be considered at
            Taylored Instruction&apos;s sole discretion. Please contact us for
            individual review.
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Return and Refund Policy for Online Shop
          </h2>
          <h3 className="mb-3 font-semibold text-text text-xl">
            Digital Goods
          </h3>
          <p>
            All digital goods, including eBooks, course access codes, and
            eCards, are not eligible for a refund once they have been delivered.
            Please review product details carefully before purchase.
          </p>

          <h3 className="mb-3 font-semibold text-text text-xl">
            Physical Goods
          </h3>
          <p>
            Physical goods are eligible for a refund within 30 days of purchase,
            provided they are returned in their original, unopened packaging. To
            initiate a return, please contact us with your order details at{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:info@tayloredinstruction.com"
            >
              info@tayloredinstruction.com
            </a>
            . Return shipping costs may apply and are the responsibility of the
            customer unless the product is defective or incorrect. Refunds will
            be processed once the returned item is received and inspected.
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Messaging Terms and Conditions
          </h2>

          <p>
            By providing your phone number and agreeing to receive texts, you
            consent to receive promotional and account-related SMS messages from
            Taylored Instruction at 360-685-8199. You will receive account
            alerts and promotional messages. Message frequency varies, but you
            can expect up to 4 messages per month. Message and data rates may
            apply. Consent is not a condition of purchase.
          </p>
          <p>
            To stop receiving messages, text <strong>STOP</strong>. For help,
            text <strong>HELP</strong>.
          </p>

          <h2 className="mt-12 mb-6 font-semibold text-2xl text-text">
            Agreement, Waiver, and Release of Liability
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
            Media Consent
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
              href="mailto:info@tayloredinstruction.com"
            >
              info@tayloredinstruction.com
            </a>{" "}
            before proceeding with your booking. Thank you for choosing Taylored
            Instruction LLC for your training needs!
          </p>
        </div>
      </section>
    </>
  );
}
