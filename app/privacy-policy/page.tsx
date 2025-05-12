import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Taylored Instruction',
  description: 'Learn how Taylored Instruction collects, uses, and safeguards your personal information.',
  keywords: [
    'Taylored Instruction privacy policy',
    'Privacy policy Taylored Instruction',
    'Data privacy Taylored Instruction',
    'Information collection policy',
    'Data usage policy',
    'SMS privacy policy',
    'Website privacy terms',
    'Personal information protection'
  ]
}

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Hero/Title Section */}
      <section className="relative py-16 md:py-24">
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-text">Privacy Policy</h1>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="pb-16 bg-background"> {/* Removed py-16 to avoid double padding with hero */}
        <div className="container mx-auto px-4 max-w-4xl">
          
          <h2 className="text-2xl font-semibold mb-6 text-text">1. Introduction</h2>
          <p>At Taylored Instruction, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, opt-in for SMS notifications, or use our services.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">2. Information We Collect</h2>
          <h3 className="text-xl font-semibold mb-3 text-text">Personal Information</h3>
          <p>We collect personal information you provide to us directly or through account creation, such as:</p>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li>Name (if provided)</li>
            <li>Email address (required for account creation and login)</li>
            <li>Phone number (if provided for SMS notifications or other services)</li>
            <li>User account credentials (managed securely via our authentication provider, Supabase)</li>
            <li>Profile information, such as instructor status (managed within your account)</li>
            <li>Any other information you voluntarily submit through our website or during interactions with our services</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-text mt-4">Automatically Collected Information</h3>
          <p>We may automatically collect certain information about your device and browsing activity, including:</p>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li>IP address</li>
            <li>Browser type</li>
            <li>Access times</li>
            <li>Pages visited and actions taken on our site</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-text mt-4">Media</h3>
          <p>If you upload images or files to our website, please avoid including embedded location data (such as EXIF GPS), as this information may be accessible to others who download the files.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">3. How We Use Your Information</h2>
          <h3 className="text-xl font-semibold mb-3 text-text">To Provide Services</h3>
          <p>We use your information to:</p>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li>Create and manage your user account</li>
            <li>Authenticate you when you log in</li>
            <li>Determine your access level based on your role (e.g., instructor status)</li>
            <li>Enroll you in training courses or provide access to specific resources</li>
            <li>Send updates about our services, account status, or important notices</li>
            <li>Facilitate communication, including responding to inquiries or requests</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-text mt-4">SMS Notifications</h3>
          <p>If you opt-in for SMS notifications, we use your phone number to:</p>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li>Send messages about training opportunities</li>
            <li>Provide important updates and course reminders</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-text mt-4">Improving Our Services</h3>
          <p>We use information to understand how our services are used, improve our offerings, and enhance your experience on our website.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">4. Cookies</h2>
          <p>We use cookies to:</p>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li>Remember your preferences and settings</li>
            <li>Facilitate login and authentication (if applicable)</li>
            <li>Analyze site usage to improve performance</li>
          </ul>
          <p>You can control or delete cookies through your browser settings. Disabling cookies may affect your experience on our website.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">5. Embedded Content and Third-Party Services</h2>
          <p>Our website may include embedded content (such as videos, images, or articles) from other websites. Embedded content behaves as if you visited the source website and may collect data about you, use cookies, and track your interaction. We are not responsible for the privacy practices of these third-party sites.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">6. Sharing and Selling of Information</h2>
          <p>We do not share, sell, rent, or trade your personal information, including your phone number, with third parties for their marketing purposes.</p>
          <p>Your personal information, including email address and profile data, may be accessible to authorized administrators for the purpose of managing instructor status, providing support, or maintaining the service.</p>
          <p>All categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">7. Data Retention</h2>
          <p>We retain your personal information only as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li>Request access to the personal data we hold about you</li>
            <li>Request correction or deletion of your personal data, except where we are required to retain it for administrative, legal, security purposes, or for the basic functioning of your account (e.g., your user ID).</li>
          </ul>
          <p>To exercise these rights, please contact us using the information below.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">9. Data Security</h2>
          <p>We take appropriate measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is completely secure.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">10. Your Choices</h2>
          <ul className="list-disc list-inside mb-4 text-text-light">
            <li><strong>Opt-Out:</strong> You can opt-out of marketing emails or SMS notifications at any time by following unsubscribe instructions or contacting us directly.</li>
            <li><strong>Access and Correction:</strong> Contact us to request access to or correction of your personal information.</li>
          </ul>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">11. Automated Detection</h2>
          <p>We may use automated tools to detect spam or abuse on our website.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">12. Changes to This Privacy Policy</h2>
          <p>We may update this policy periodically. Changes will be posted on this page, and significant updates will be communicated via email or a website notice.</p>

          <h2 className="text-2xl font-semibold mb-6 text-text mt-8">13. Contact Us</h2>
          <p>If you have questions or concerns about this Privacy Policy or our practices, please contact us.</p>
        </div>
      </section>
    </>
  )
} 