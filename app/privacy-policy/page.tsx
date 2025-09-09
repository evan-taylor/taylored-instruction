import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Taylored Instruction",
  description:
    "Learn how Taylored Instruction collects, uses, and safeguards your personal information.",
  keywords: [
    "Taylored Instruction privacy policy",
    "Privacy policy Taylored Instruction",
    "Data privacy Taylored Instruction",
    "Information collection policy",
    "Data usage policy",
    "SMS privacy policy",
    "Website privacy terms",
    "Personal information protection",
  ],
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Hero/Title Section */}
      <section className="relative py-16 md:py-24">
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mb-4 font-bold text-3xl text-text md:text-4xl">
            Privacy Policy
          </h1>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-background pb-16">
        {" "}
        {/* Removed py-16 to avoid double padding with hero */}
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-6 font-semibold text-2xl text-text">
            1. Introduction
          </h2>
          <p>
            At Taylored Instruction, we are committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, and
            safeguard your information when you visit our website, opt-in for
            SMS notifications, or use our services.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            2. Information We Collect
          </h2>
          <h3 className="mb-3 font-semibold text-text text-xl">
            Personal Information
          </h3>
          <p>
            We collect personal information you provide to us directly or
            through account creation, such as:
          </p>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>Name (if provided)</li>
            <li>Email address (required for account creation and login)</li>
            <li>
              Phone number (if provided for SMS notifications or other services)
            </li>
            <li>
              User account credentials (managed securely via our authentication
              provider, Supabase)
            </li>
            <li>
              Profile information, such as instructor status (managed within
              your account)
            </li>
            <li>
              Any other information you voluntarily submit through our website
              or during interactions with our services
            </li>
          </ul>

          <h3 className="mt-4 mb-3 font-semibold text-text text-xl">
            Automatically Collected Information
          </h3>
          <p>
            We may automatically collect certain information about your device
            and browsing activity, including:
          </p>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>IP address</li>
            <li>Browser type</li>
            <li>Access times</li>
            <li>Pages visited and actions taken on our site</li>
          </ul>

          <h3 className="mt-4 mb-3 font-semibold text-text text-xl">Media</h3>
          <p>
            If you upload images or files to our website, please avoid including
            embedded location data (such as EXIF GPS), as this information may
            be accessible to others who download the files.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            3. How We Use Your Information
          </h2>
          <h3 className="mb-3 font-semibold text-text text-xl">
            To Provide Services
          </h3>
          <p>We use your information to:</p>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>Create and manage your user account</li>
            <li>Authenticate you when you log in</li>
            <li>
              Determine your access level based on your role (e.g., instructor
              status)
            </li>
            <li>
              Enroll you in training courses or provide access to specific
              resources
            </li>
            <li>
              Send updates about our services, account status, or important
              notices
            </li>
            <li>
              Facilitate communication, including responding to inquiries or
              requests
            </li>
          </ul>

          <h3 className="mt-4 mb-3 font-semibold text-text text-xl">
            SMS Notifications
          </h3>
          <p>
            If you opt in to receive SMS messages from us, you will receive
            account alerts and promotional messages. Consent is not a condition
            of purchase. Message frequency varies. Message and data rates may
            apply. We may also send you messages about training opportunities
            and important updates.
          </p>
          <p className="mb-4">
            To stop receiving messages, text <strong>STOP</strong> or{" "}
            <strong>UNSUBSCRIBE</strong>. For help, text <strong>HELP</strong>.
            You can also contact us at 360-685-8199 or
            <a
              className="text-primary hover:underline"
              href="mailto:info@tayloredinstruction.com"
            >
              info@tayloredinstruction.com
            </a>
            . Mobile opt-in information is never shared with third parties.
          </p>

          <h3 className="mt-4 mb-3 font-semibold text-text text-xl">
            Improving Our Services
          </h3>
          <p>
            We use information to understand how our services are used, improve
            our offerings, and enhance your experience on our website.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            4. Cookies
          </h2>
          <p>We use cookies to:</p>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>Remember your preferences and settings</li>
            <li>Facilitate login and authentication (if applicable)</li>
            <li>Analyze site usage to improve performance</li>
          </ul>
          <p>
            You can control or delete cookies through your browser settings.
            Disabling cookies may affect your experience on our website.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            5. Embedded Content and Third-Party Services
          </h2>
          <p>
            Our website may include embedded content (such as videos, images, or
            articles) from other websites. Embedded content behaves as if you
            visited the source website and may collect data about you, use
            cookies, and track your interaction. We are not responsible for the
            privacy practices of these third-party sites.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            6. Sharing and Selling of Information
          </h2>
          <p>
            We do not share, sell, rent, or trade your personal information,
            including your phone number, with third parties for their marketing
            purposes.
          </p>
          <p>
            No mobile information will be shared with third parties/affiliates
            for marketing/promotional purposes.
          </p>
          <p>
            Your personal information, including email address and profile data,
            may be accessible to authorized administrators for the purpose of
            managing instructor status, providing support, or maintaining the
            service.
          </p>
          <p>
            All categories exclude text messaging originator opt-in data and
            consent; this information will not be shared with any third parties.
          </p>

          <h3 className="mt-4 mb-3 font-semibold text-text text-xl">
            Data Sharing
          </h3>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>
              Customer data is not shared with 3rd parties for promotional or
              marketing purposes.
            </li>
            <li>
              Mobile opt-in and consent are never shared with anyone for any
              purpose. Any information sharing that may be mentioned elsewhere
              in this policy excludes mobile opt-in data.
            </li>
          </ul>

          <h3 className="mt-4 mb-3 font-semibold text-text text-xl">
            Messaging Terms and Conditions
          </h3>
          <p>
            By providing your phone number and agreeing to receive texts, you
            consent to receive text messages from Taylored Instruction, from
            360-685-8199 regarding account notification and customer care.
            Consent is not a condition of purchase. You will receive account
            alerts and promotional messages. Message frequency varies. Message
            &amp; data rates may apply. You can reply STOP to unsubscribe at any
            time or HELP for assistance. You can also contact us at 360-685-8199
            or{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:info@tayloredinstruction.com"
            >
              info@tayloredinstruction.com
            </a>
            . Mobile opt-in information is never shared with third parties.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            7. Data Transfer Policy
          </h2>
          <p>
            We do not transfer your personal information to any external
            organizations under any circumstances, even with your consent.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            8. Data Retention
          </h2>
          <p>
            We retain your personal information only as long as necessary to
            fulfill the purposes outlined in this policy, unless a longer
            retention period is required or permitted by law.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            9. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>Request access to the personal data we hold about you</li>
            <li>
              Request correction or deletion of your personal data, except where
              we are required to retain it for administrative, legal, security
              purposes, or for the basic functioning of your account (e.g., your
              user ID).
            </li>
          </ul>
          <p>
            To exercise these rights, please contact us using the information
            below.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            10. Data Security
          </h2>
          <p>
            We take appropriate measures to protect your information from
            unauthorized access, alteration, disclosure, or destruction.
            However, no method of transmission over the internet or electronic
            storage is completely secure.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            11. Your Choices
          </h2>
          <ul className="mb-4 list-inside list-disc text-text-light">
            <li>
              <strong>Opt-Out:</strong> You can opt-out of marketing emails or
              SMS notifications at any time by replying <strong>STOP</strong> or{" "}
              <strong>UNSUBSCRIBE</strong> to any message or contacting us
              directly. For help, reply <strong>HELP</strong>.
            </li>
            <li>
              <strong>Access and Correction:</strong> Contact us to request
              access to or correction of your personal information.
            </li>
          </ul>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            12. Automated Detection
          </h2>
          <p>
            We may use automated tools to detect spam or abuse on our website.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            13. Changes to This Privacy Policy
          </h2>
          <p>
            We may update this policy periodically. Changes will be posted on
            this page, and significant updates will be communicated via email or
            a website notice.
          </p>

          <h2 className="mt-8 mb-6 font-semibold text-2xl text-text">
            14. Contact Us
          </h2>
          <p>
            If you have questions or concerns about this Privacy Policy or our
            practices, please contact us.
          </p>
        </div>
      </section>
    </>
  );
}
