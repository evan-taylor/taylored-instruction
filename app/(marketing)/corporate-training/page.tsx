"use cache";

import { cacheLife } from "next/cache";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Corporate CPR Training | Vancouver WA & San Luis Obispo CA Workplace Safety";
const pageDescription =
  "On-site corporate CPR, BLS, and First Aid training for businesses, schools, and organizations in Vancouver WA, Clark County, Portland metro, and San Luis Obispo CA.";

export const metadata = buildPageMetadata({
  description: pageDescription,
  image: {
    description:
      "On-site workplace CPR, BLS, and First Aid certification for teams",
    title: "Corporate CPR Training",
  },
  keywords: [
    "corporate CPR training Vancouver WA",
    "on-site CPR and first aid training",
    "workplace BLS training program",
    "OSHA workplace emergency training",
    "employee CPR certification classes",
    "group CPR classes Clark County WA",
    "corporate CPR training San Luis Obispo",
    "business emergency response training",
  ],
  path: "/corporate-training",
  title: pageTitle,
});

export default async function CorporateTrainingPage() {
  cacheLife("days");
  const webPageSchema = getWebPageSchema({
    description: pageDescription,
    name: pageTitle,
    path: "/corporate-training",
  });
  const serviceSchema = getServiceSchema({
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    audienceType: "Employers, Schools, and Organizations",
    description:
      "Custom workplace safety training for employee teams, including CPR, BLS, and First Aid certification delivered on-site.",
    name: "Corporate CPR, BLS, and First Aid Training",
    path: "/corporate-training",
    serviceType: "On-site Workplace Safety Training",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    {
      name: "Corporate Training",
      url: "https://tayloredinstruction.com/corporate-training",
    },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(webPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(serviceSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
      {/* Hero Section - Improved with better image handling and text styling */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[600px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="Team learning CPR in a corporate setting"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/CPR-Training-Image.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-linear-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl lg:text-6xl">
              Corporate CPR training
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/90 leading-relaxed md:text-xl">
              Empower your team with lifesaving skills. Designed for businesses,
              schools, and organizations, our training sessions equip your staff
              with the knowledge and confidence to respond to medical
              emergencies effectively.
            </p>
            <div className="mt-8">
              <Button className="mr-4" href="#options" size="lg">
                See training options
              </Button>
              <Button
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                href="/contact"
                size="lg"
                variant="outline"
              >
                Contact us
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section - Better organized with visual elements */}
      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto max-w-6xl px-4 text-text">
          {/* Why Choose Corporate CPR Training? - Added icons and better layout */}
          <div className="mb-16 md:mb-24">
            <div className="mb-10 text-center">
              <h2 className="mb-4 font-bold text-3xl md:text-4xl">
                Why choose corporate CPR training?
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                Professional training that adapts to your organization&apos;s
                unique needs and schedule.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-3 font-semibold text-xl">
                  Increase workplace safety
                </h3>
                <p className="text-text-light">
                  Prepare your staff to handle emergencies with confidence.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-3 font-semibold text-xl">
                  Meet compliance standards
                </h3>
                <p className="text-text-light">
                  Ensure your workplace meets OSHA and industry-specific safety
                  requirements.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-3 font-semibold text-xl">
                  Flexible and convenient
                </h3>
                <p className="text-text-light">
                  We bring the training to your location or host it at a nearby
                  facility.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-3 font-semibold text-xl">
                  Customized training
                </h3>
                <p className="text-text-light">
                  Select courses that fit your organization&apos;s specific
                  needs and scenarios.
                </p>
              </div>
            </div>
          </div>

          {/* Training Options - Improved card design */}
          <div className="mb-20 scroll-mt-24 md:mb-28" id="options">
            <div className="mb-10 text-center">
              <h2 className="mb-4 font-bold text-3xl md:text-4xl">
                Training options
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                We offer a range of courses to meet your needs, from basic
                workplace training to healthcare provider certifications.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Course Cards - Reverted to original design */}
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Heartsaver CPR & AED (AHA)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, workplace teams
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content focus:</strong> Adult,
                  child, and infant CPR, AED use
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Certification:</strong> Valid
                  for 2 years
                </p>
                <p className="text-text-light">
                  <strong className="text-text">Duration:</strong> 4-5 hours
                  (in-person)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Heartsaver First Aid CPR AED (AHA)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, workplace teams
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content focus:</strong> CPR,
                  AED, and first aid for injuries
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Certification:</strong> Valid
                  for 2 years
                </p>
                <p className="text-text-light">
                  <strong className="text-text">Duration:</strong> 5-6 hours
                  (in-person)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Basic Life Support (BLS) (AHA)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> Healthcare
                  providers, first responders
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content focus:</strong>{" "}
                  High-performance CPR, AED, and choking
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Certification:</strong> Valid
                  for 2 years
                </p>
                <p className="text-text-light">
                  <strong className="text-text">Duration:</strong> 4 hours
                  (in-person)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Adult and Pediatric First Aid/CPR/AED – Blended Learning (Red
                  Cross)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, workplace teams
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content focus:</strong> CPR,
                  AED, and first aid for injuries
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Certification:</strong> Valid
                  for 2 years
                </p>
                <p className="text-text-light">
                  <strong className="text-text">Duration:</strong> 2-3 hours
                  (in-person)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Adult & Pediatric CPR/AED (Red Cross)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, daycare providers
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content focus:</strong> CPR and
                  AED use for adults and children
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Certification:</strong> Valid
                  for 2 years
                </p>
                <p className="text-text-light">
                  <strong className="text-text">Duration:</strong> 4-5 hours
                  (in-person or blended)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Adult CPR/AED (Red Cross)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> Office
                  settings, low-risk workplaces
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content focus:</strong> Adult
                  CPR and AED use
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Certification:</strong> Valid
                  for 2 years
                </p>
                <p className="text-text-light">
                  <strong className="text-text">Duration:</strong> 2-3 hours
                  (in-person)
                </p>
              </div>
            </div>
          </div>

          {/* Key Differences - Improved comparison section */}
          <div className="mb-20 md:mb-28">
            <div className="mb-12 text-center">
              <h2 className="mb-4 font-bold text-3xl md:text-4xl">
                Key differences between AHA and Red Cross
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                Both organizations offer high-quality training with some
                differences in approach and certification recognition.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-3 border-slate-200 border-b">
                <div className="border-slate-200 border-r p-5 font-bold text-lg">
                  Feature
                </div>
                <div className="border-slate-200 border-r p-5 text-center font-bold text-lg text-primary">
                  American Heart Association
                </div>
                <div className="p-5 text-center font-bold text-lg text-red-600">
                  American Red Cross
                </div>
              </div>

              <div className="grid grid-cols-3 border-slate-200 border-b">
                <div className="border-slate-200 border-r bg-slate-50 p-5 font-medium">
                  Focus
                </div>
                <div className="border-slate-200 border-r p-5">
                  Healthcare providers and workplace teams
                </div>
                <div className="p-5">
                  Workplace teams, general public, childcare
                </div>
              </div>

              <div className="grid grid-cols-3 border-slate-200 border-b">
                <div className="border-slate-200 border-r bg-slate-50 p-5 font-medium">
                  Flexibility
                </div>
                <div className="border-slate-200 border-r p-5">
                  Blended and in-person options
                </div>
                <div className="p-5">Blended and in-person options</div>
              </div>

              <div className="grid grid-cols-3 border-slate-200 border-b">
                <div className="border-slate-200 border-r bg-slate-50 p-5 font-medium">
                  Recognition
                </div>
                <div className="border-slate-200 border-r p-5">
                  Recognized globally, especially in healthcare
                </div>
                <div className="p-5">
                  Widely recognized across industries in the U.S.
                </div>
              </div>

              <div className="grid grid-cols-3 border-slate-200 border-b">
                <div className="border-slate-200 border-r bg-slate-50 p-5 font-medium">
                  Skill practice
                </div>
                <div className="border-slate-200 border-r p-5">
                  High emphasis on hands-on practice
                </div>
                <div className="p-5">
                  Balance of lecture and hands-on training
                </div>
              </div>

              <div className="grid grid-cols-3">
                <div className="border-slate-200 border-r bg-slate-50 p-5 font-medium">
                  Renewal
                </div>
                <div className="border-slate-200 border-r p-5">
                  Every 2 years with hands-on session
                </div>
                <div className="p-5">Every 2 years with hands-on session</div>
              </div>
            </div>
          </div>

          {/* Two Feature Sections - Better visual layout */}
          <div className="mb-20 grid gap-10 md:grid-cols-2">
            {/* Customization */}
            <div className="rounded-xl border border-slate-200 bg-white p-8 md:p-10">
              <h2 className="mb-4 font-bold text-2xl md:text-3xl">
                Customization for your workplace
              </h2>
              <p className="mb-6 text-text-light">
                We understand that every workplace is unique. That&apos;s why we
                offer:
              </p>
              <ul className="list-disc space-y-3 pl-5">
                <li className="text-text-light">
                  <strong>Scenario-based training:</strong> Tailored to your
                  industry (e.g., construction, childcare, office settings).
                </li>
                <li className="text-text-light">
                  <strong>Flexible group sizes:</strong> Train small teams or
                  large groups—our courses accommodate your needs.
                </li>
                <li className="text-text-light">
                  <strong>Convenient scheduling:</strong> Sessions can be
                  scheduled during work hours, weekends, or after hours.
                </li>
              </ul>
            </div>

            {/* What's Included */}
            <div className="rounded-xl bg-primary p-8 text-white md:p-10">
              <h2 className="mb-4 font-bold text-2xl md:text-3xl">
                What&apos;s included in our training?
              </h2>
              <ul className="list-disc space-y-3 pl-5">
                <li className="text-white/90">
                  <strong>Expert instruction</strong> from certified
                  professionals.
                </li>
                <li className="text-white/90">
                  <strong>Hands-on practice</strong> with state-of-the-art
                  equipment.
                </li>
                <li className="text-white/90">
                  <strong>All course materials</strong> and participant manuals.
                </li>
                <li className="text-white/90">
                  <strong>Certification cards</strong> valid for 2 years upon
                  successful completion.
                </li>
              </ul>
            </div>
          </div>

          {/* FAQ - Better accordion style */}
          <div className="mb-16 md:mb-24">
            <div className="mb-10 text-center">
              <h2 className="mb-4 font-bold text-3xl md:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                Get answers to common questions about our corporate training
                programs.
              </p>
            </div>
            <div className="mx-auto max-w-3xl divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="p-6">
                <h4 className="font-semibold text-text text-xl">
                  How many people can be trained at once?
                </h4>
                <p className="mt-3 text-text-light">
                  Depending on the course, we can train groups of up to 20
                  participants in a single session. For larger groups,
                  we&apos;ll divide sessions to ensure quality instruction.
                </p>
              </div>

              <div className="p-6">
                <h4 className="font-semibold text-text text-xl">
                  Do we need any equipment for the training?
                </h4>
                <p className="mt-3 text-text-light">
                  No, we&apos;ll bring everything needed, including manikins,
                  AED trainers, and course materials.
                </p>
              </div>

              <div className="p-6">
                <h4 className="font-semibold text-text text-xl">
                  What is the cost of corporate training?
                </h4>
                <p className="mt-3 text-text-light">
                  Pricing depends on group size, course type, and location.
                  Contact us for a customized quote.
                </p>
              </div>

              <div className="p-6">
                <h4 className="font-semibold text-text text-xl">
                  Can the training be tailored to our industry?
                </h4>
                <p className="mt-3 text-text-light">
                  Yes! We&apos;ll incorporate scenarios relevant to your
                  workplace to maximize engagement.
                </p>
              </div>
            </div>
          </div>

          {/* CTA - More engaging design */}
          <div className="rounded-xl bg-primary p-10 text-center text-white md:p-16">
            <h2 className="mb-6 font-bold text-3xl md:text-4xl">
              Ready to train your team?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Contact us today to schedule a session or learn more about our
              Corporate CPR Training options. Let&apos;s create a safer
              workplace together!
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                className="bg-white px-8 py-6 text-lg text-primary hover:bg-white/90"
                href="/group-training"
                size="lg"
                variant="primary"
              >
                Request group training
              </Button>
              <Button
                className="border-white/40 bg-transparent px-8 py-6 text-lg text-white hover:bg-white/10 hover:text-white"
                href="/contact"
                size="lg"
                variant="outline"
              >
                Contact us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
