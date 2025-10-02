import {
  Award,
  BadgeCheck,
  Building,
  Calendar,
  CheckCircle,
  LifeBuoy,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title:
    "Corporate CPR Training Vancouver WA & San Luis Obispo CA | Workplace Safety Certification",
  description:
    "Professional on-site corporate CPR, BLS & First Aid training in Vancouver WA, Clark County & San Luis Obispo CA. AHA & Red Cross certified workplace safety training for businesses, schools & organizations. OSHA compliant. Flexible scheduling. Group discounts available.",
  keywords: [
    "Corporate CPR training Vancouver WA",
    "Workplace CPR certification",
    "Business CPR classes",
    "School CPR training",
    "Organization CPR training",
    "On-site CPR training",
    "Group CPR training",
    "AHA corporate training",
    "Red Cross corporate training",
    "OSHA compliance CPR",
    "Employee CPR certification",
    "Team CPR training Vancouver WA",
    "Taylored Instruction corporate",
    "Vancouver WA corporate CPR",
    "Corporate BLS training",
    "Workplace First Aid training",
    "Company CPR certification",
    "Business safety training",
    "Corporate CPR San Luis Obispo",
    "On-site training Clark County",
    "Corporate training Portland OR",
    "Group CPR classes Vancouver",
    "Employee safety training",
    "Workplace emergency response",
  ],
  openGraph: {
    title:
      "Corporate CPR Training Vancouver WA & San Luis Obispo CA | Workplace Safety",
    description:
      "Professional on-site corporate CPR, BLS & First Aid training. AHA & Red Cross certified. Serving businesses, schools & organizations in Vancouver WA & San Luis Obispo CA.",
    url: "https://tayloredinstruction.com/corporate-training",
    siteName: "Taylored Instruction",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Corporate CPR Training - Taylored Instruction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Corporate CPR Training Vancouver WA & San Luis Obispo CA | Workplace Safety",
    description:
      "Professional on-site corporate CPR, BLS & First Aid training. AHA & Red Cross certified.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/corporate-training",
  },
};

export default function CorporateTrainingPage() {
  return (
    <>
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
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl lg:text-6xl">
              Corporate CPR Training
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/90 leading-relaxed md:text-xl">
              Empower your team with lifesaving skills. Designed for businesses,
              schools, and organizations, our training sessions equip your staff
              with the knowledge and confidence to respond to medical
              emergencies effectively.
            </p>
            <div className="mt-8">
              <Link href="#options">
                <Button className="mr-4 shadow-lg" size="lg" variant="primary">
                  View Training Options
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  size="lg"
                  variant="outline"
                >
                  Contact Us
                </Button>
              </Link>
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
                Why Choose Corporate CPR Training?
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                Professional training that adapts to your organization&apos;s
                unique needs and schedule.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-md transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle size={28} />
                </div>
                <h3 className="mb-3 font-semibold text-xl">
                  Increase Workplace Safety
                </h3>
                <p className="text-text-light">
                  Prepare your staff to handle emergencies with confidence.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-md transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BadgeCheck size={28} />
                </div>
                <h3 className="mb-3 font-semibold text-xl">
                  Meet Compliance Standards
                </h3>
                <p className="text-text-light">
                  Ensure your workplace meets OSHA and industry-specific safety
                  requirements.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-md transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calendar size={28} />
                </div>
                <h3 className="mb-3 font-semibold text-xl">
                  Flexible and Convenient
                </h3>
                <p className="text-text-light">
                  We bring the training to your location or host it at a nearby
                  facility.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-md transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LifeBuoy size={28} />
                </div>
                <h3 className="mb-3 font-semibold text-xl">
                  Customized Training
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
                Training Options
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                We offer a range of courses to meet your needs, from basic
                workplace training to healthcare provider certifications.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Course Cards - Reverted to original design */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Heartsaver CPR & AED (AHA)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, workplace teams
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content Focus:</strong> Adult,
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

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Heartsaver First Aid CPR AED (AHA)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, workplace teams
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content Focus:</strong> CPR,
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

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Basic Life Support (BLS) (AHA)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> Healthcare
                  providers, first responders
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content Focus:</strong>{" "}
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

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Adult and Pediatric First Aid/CPR/AED – Blended Learning (Red
                  Cross)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, workplace teams
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content Focus:</strong> CPR,
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

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Adult & Pediatric CPR/AED (Red Cross)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> General
                  employees, daycare providers
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content Focus:</strong> CPR and
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

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                <h3 className="mb-4 font-semibold text-2xl text-primary">
                  Adult CPR/AED (Red Cross)
                </h3>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Audience:</strong> Office
                  settings, low-risk workplaces
                </p>
                <p className="mb-2 text-text-light">
                  <strong className="text-text">Content Focus:</strong> Adult
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
                Key Differences Between AHA and Red Cross
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                Both organizations offer high-quality training with some
                differences in approach and certification recognition.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
              <div className="grid grid-cols-3 border-gray-200 border-b">
                <div className="border-gray-200 border-r p-5 font-bold text-lg">
                  Feature
                </div>
                <div className="border-gray-200 border-r p-5 text-center font-bold text-lg text-primary">
                  American Heart Association
                </div>
                <div className="p-5 text-center font-bold text-lg text-red-600">
                  American Red Cross
                </div>
              </div>

              <div className="grid grid-cols-3 border-gray-200 border-b">
                <div className="border-gray-200 border-r bg-gray-50 p-5 font-medium">
                  Focus
                </div>
                <div className="border-gray-200 border-r p-5">
                  Healthcare providers and workplace teams
                </div>
                <div className="p-5">
                  Workplace teams, general public, childcare
                </div>
              </div>

              <div className="grid grid-cols-3 border-gray-200 border-b">
                <div className="border-gray-200 border-r bg-gray-50 p-5 font-medium">
                  Flexibility
                </div>
                <div className="border-gray-200 border-r p-5">
                  Blended and in-person options
                </div>
                <div className="p-5">Blended and in-person options</div>
              </div>

              <div className="grid grid-cols-3 border-gray-200 border-b">
                <div className="border-gray-200 border-r bg-gray-50 p-5 font-medium">
                  Recognition
                </div>
                <div className="border-gray-200 border-r p-5">
                  Recognized globally, especially in healthcare
                </div>
                <div className="p-5">
                  Widely recognized across industries in the U.S.
                </div>
              </div>

              <div className="grid grid-cols-3 border-gray-200 border-b">
                <div className="border-gray-200 border-r bg-gray-50 p-5 font-medium">
                  Skill Practice
                </div>
                <div className="border-gray-200 border-r p-5">
                  High emphasis on hands-on practice
                </div>
                <div className="p-5">
                  Balance of lecture and hands-on training
                </div>
              </div>

              <div className="grid grid-cols-3">
                <div className="border-gray-200 border-r bg-gray-50 p-5 font-medium">
                  Renewal
                </div>
                <div className="border-gray-200 border-r p-5">
                  Every 2 years with hands-on session
                </div>
                <div className="p-5">Every 2 years with hands-on session</div>
              </div>
            </div>
          </div>

          {/* Two Feature Sections - Better visual layout */}
          <div className="mb-20 grid gap-10 md:grid-cols-2">
            {/* Customization */}
            <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-md md:p-10">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building size={30} />
              </div>
              <h2 className="mb-4 font-bold text-2xl md:text-3xl">
                Customization for Your Workplace
              </h2>
              <p className="mb-6 text-text-light">
                We understand that every workplace is unique. That&apos;s why we
                offer:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-primary">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-text-light">
                    <strong>Scenario-Based Training:</strong> Tailored to your
                    industry (e.g., construction, childcare, office settings).
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-primary">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-text-light">
                    <strong>Flexible Group Sizes:</strong> Train small teams or
                    large groups—our courses accommodate your needs.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-primary">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-text-light">
                    <strong>Convenient Scheduling:</strong> Sessions can be
                    scheduled during work hours, weekends, or after hours.
                  </span>
                </li>
              </ul>
            </div>

            {/* What's Included */}
            <div className="rounded-xl bg-primary p-8 text-white shadow-md md:p-10">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white">
                <Award size={30} />
              </div>
              <h2 className="mb-4 font-bold text-2xl md:text-3xl">
                What&apos;s Included in Our Training?
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-white">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-white/90">
                    <strong>Expert instruction</strong> from certified
                    professionals.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-white">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-white/90">
                    <strong>Hands-on practice</strong> with state-of-the-art
                    equipment.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-white">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-white/90">
                    <strong>All course materials</strong> and participant
                    manuals.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mt-1 mr-3 text-white">
                    <CheckCircle size={18} />
                  </span>
                  <span className="text-white/90">
                    <strong>Certification cards</strong> valid for 2 years upon
                    successful completion.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* FAQ - Better accordion style */}
          <div className="mb-16 md:mb-24">
            <div className="mb-10 text-center">
              <h2 className="mb-4 font-bold text-3xl md:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-text-light">
                Get answers to common questions about our corporate training
                programs.
              </p>
            </div>
            <div className="mx-auto max-w-3xl divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="p-6 transition-colors hover:bg-gray-50">
                <h4 className="flex items-center font-semibold text-text text-xl">
                  <span className="mr-3 text-primary">
                    <Users size={20} />
                  </span>
                  How many people can be trained at once?
                </h4>
                <p className="mt-3 pl-8 text-text-light">
                  Depending on the course, we can train groups of up to 20
                  participants in a single session. For larger groups,
                  we&apos;ll divide sessions to ensure quality instruction.
                </p>
              </div>

              <div className="p-6 transition-colors hover:bg-gray-50">
                <h4 className="flex items-center font-semibold text-text text-xl">
                  <span className="mr-3 text-primary">
                    <LifeBuoy size={20} />
                  </span>
                  Do we need any equipment for the training?
                </h4>
                <p className="mt-3 pl-8 text-text-light">
                  No, we&apos;ll bring everything needed, including manikins,
                  AED trainers, and course materials.
                </p>
              </div>

              <div className="p-6 transition-colors hover:bg-gray-50">
                <h4 className="flex items-center font-semibold text-text text-xl">
                  <span className="mr-3 text-primary">
                    <Calendar size={20} />
                  </span>
                  What is the cost of corporate training?
                </h4>
                <p className="mt-3 pl-8 text-text-light">
                  Pricing depends on group size, course type, and location.
                  Contact us for a customized quote.
                </p>
              </div>

              <div className="p-6 transition-colors hover:bg-gray-50">
                <h4 className="flex items-center font-semibold text-text text-xl">
                  <span className="mr-3 text-primary">
                    <Building size={20} />
                  </span>
                  Can the training be tailored to our industry?
                </h4>
                <p className="mt-3 pl-8 text-text-light">
                  Yes! We&apos;ll incorporate scenarios relevant to your
                  workplace to maximize engagement.
                </p>
              </div>
            </div>
          </div>

          {/* CTA - More engaging design */}
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-800 p-10 text-center text-white shadow-xl md:p-16">
            <h2 className="mb-6 font-bold text-3xl md:text-4xl">
              Ready to Train Your Team?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Contact us today to schedule a session or learn more about our
              Corporate CPR Training options. Let&apos;s create a safer
              workplace together!
            </p>
            <Link href="/contact">
              <Button
                className="bg-white px-8 py-6 text-lg text-primary shadow-lg hover:bg-white/90"
                size="lg"
                variant="primary"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
