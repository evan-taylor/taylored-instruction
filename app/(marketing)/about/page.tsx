"use cache";

import { Mail, Phone } from "lucide-react"; // Import icons
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button"; // Import the Button component
import { ChamberBadge } from "@/components/ui/ChamberBadge";
import { generateOgImageUrl } from "@/lib/utils";

const ogImageUrl = generateOgImageUrl({
  title: "About Taylored Instruction",
  description: "Expert CPR, BLS & Lifeguard Training",
});

// --- Page Metadata ---
export const metadata: Metadata = {
  title:
    "About Taylored Instruction | Expert CPR, BLS & Lifeguard Training in Vancouver WA & San Luis Obispo CA",
  description:
    "Meet Evan Taylor and learn about Taylored Instruction's mission to teach lifesaving skills. American Red Cross Licensed Training Provider, AHA Training Site & HSI Training Center. Expert CPR, BLS, First Aid & Lifeguard training in Vancouver, WA, Clark County & San Luis Obispo, CA.",
  keywords: [
    "About Taylored Instruction",
    "Evan Taylor CPR instructor",
    "Lifesaving skills training Vancouver WA",
    "CPR classes San Luis Obispo",
    "Red Cross Licensed Training Provider",
    "AHA Training Site Vancouver WA",
    "HSI Training Center",
    "Water Safety Instructor Vancouver WA",
    "Adaptive swim lessons",
    "Taylored Instruction mission",
    "CPR training Clark County",
    "Red Cross Instructor Trainer",
    "AHA BLS Instructor Vancouver",
    "CPR instructor Vancouver WA",
    "Lifeguard instructor Vancouver",
    "About us CPR training",
    "Vancouver WA safety training company",
    "SLO CPR instructor",
  ],
  openGraph: {
    title: "About Taylored Instruction | Expert CPR, BLS & Lifeguard Training",
    description:
      "Meet Evan Taylor and learn about Taylored Instruction's mission to teach lifesaving skills in Vancouver, WA and San Luis Obispo, CA. Red Cross & AHA certified.",
    url: "https://tayloredinstruction.com/about",
    siteName: "Taylored Instruction",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "About Taylored Instruction - Lifesaving Training Experts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Taylored Instruction | Expert CPR, BLS & Lifeguard Training",
    description:
      "Meet Evan Taylor and learn about our mission to teach lifesaving skills in Vancouver, WA and San Luis Obispo, CA.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/about",
  },
};

// --- Page Component ---
export default async function AboutPage() {
  cacheLife("days");
  return (
    <>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[500px] items-center justify-center md:min-h-[550px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="CPR training in action"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/Vancouver-Washington-Stock-Photo-scaled.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              About Taylored Instruction
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/90 leading-relaxed md:text-xl">
              Dedicated to providing high-quality, accessible lifesaving skills
              training to the Vancouver, WA community and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Two-column Main Content Layout for Desktop */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left Column */}
            <div>
              {/* Where did we come from? Section */}
              <div className="mb-12 rounded-lg bg-white p-8">
                <h2 className="mb-6 font-semibold text-3xl text-text">
                  Where Did We Come From?
                </h2>
                <p className="mb-6 text-text-light">
                  Taylored Instruction was founded in 2023 by Evan Taylor. We
                  are based in Vancouver, Washington. Evan has been teaching
                  swimming lessons since 2020 and has been a certified American
                  Red Cross Instructor since 2023, and a First Aid/CPR/AED
                  Instructor Trainer since 2024. He has taught swimming lessons
                  to all ages and skill levels and teaches American Red Cross
                  Lifeguarding, CPR, and First Aid classes.
                </p>
                <p className="text-text-light">
                  Evan goes to school in San Luis Obispo, CA, so we teach
                  classes seasonally on the Central Coast.{" "}
                  <Link
                    className="text-primary hover:underline"
                    href="/contact"
                  >
                    Get in touch
                  </Link>{" "}
                  with us to learn more!
                </p>
              </div>

              {/* Meet Our Instructors Section */}
              <div className="mb-12 rounded-lg bg-white p-8">
                <h2 className="mb-6 text-center font-semibold text-3xl text-text">
                  Meet Our Instructors
                </h2>
                <div className="text-center">
                  <div className="relative mx-auto mb-4 h-40 w-40 overflow-hidden rounded-full border-4 border-primary shadow-lg">
                    <Image
                      alt="Headshot of Evan Taylor, owner"
                      fill
                      sizes="100vw"
                      src="/headshot.png"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <h3 className="mb-1 font-semibold text-text text-xl">
                    Evan Taylor
                  </h3>
                  <p className="mb-3 text-text-light">
                    Owner, Instructor Trainer
                  </p>
                  <div className="flex justify-center space-x-4">
                    <a
                      aria-label="Email Evan Taylor"
                      className="text-gray-500 transition-colors duration-200 hover:text-primary"
                      href="mailto:evan@tayloredinstruction.com"
                    >
                      <Mail size={20} />
                    </a>
                    <a
                      aria-label="Call Evan Taylor"
                      className="text-gray-500 transition-colors duration-200 hover:text-primary"
                      href="tel:3602071844"
                    >
                      <Phone size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Our Mission Section */}
              <div className="mb-12 rounded-lg bg-white p-8">
                <h2 className="mb-4 font-semibold text-3xl text-text">
                  Our Mission
                </h2>
                <p className="text-lg text-text-light">
                  Our mission is to teach lifesaving skills to all, with the
                  hope that we can save a life. We are dedicated to providing
                  the highest quality swimming lessons, lifeguard training, and
                  CPR training to our community in order to empower people of
                  all ages and give them the skills necessary to save lives.
                </p>
              </div>

              {/* What We Teach Section */}
              <div className="mb-12 rounded-lg bg-white p-8">
                <h2 className="mb-6 font-semibold text-3xl text-text">
                  What We Teach
                </h2>
                <p className="mb-4 text-text-light">
                  Our instructors hold the following certifications:
                </p>
                <ul className="mb-6 list-inside list-disc space-y-2 text-text-light">
                  <li>American Red Cross Lifeguard Instructor</li>
                  <li>
                    American Heart Association Basic Life Support Instructor
                  </li>
                  <li>
                    American Red Cross First Aid/CPR/AED Instructor Trainer
                  </li>
                  <li>American Red Cross Water Safety Instructor™</li>
                  <li>American Red Cross Basic Life Support Instructor</li>
                  <li>
                    American Red Cross Babysitter&apos;s Training Instructor
                  </li>
                  <li>Swim Angelfish® Adaptive Swim Whisperer</li>
                </ul>
                <p className="text-text-light">
                  We are an authorized American Red Cross Licensed Training
                  Provider, American Heart Association Training Site (Aligned
                  with Resuscitation Group), and HSI Training Center.
                </p>
              </div>
            </div>
          </div>

          {/* Logos Section - Full Width */}
          <div className="mt-8 mb-16">
            <div className="mx-auto grid max-w-4xl grid-cols-1 items-center justify-items-center gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
              <div className="flex w-full max-w-[370px] justify-center rounded-lg bg-white p-4 sm:w-auto">
                <Image
                  alt="American Red Cross Licensed Training Provider"
                  className="h-auto w-full object-contain"
                  height={156}
                  src="/licensed-training-provider.jpeg"
                  width={369}
                />
              </div>
              <div className="flex w-full max-w-[220px] flex-col items-center rounded-lg bg-white p-4 sm:w-auto">
                <Image
                  alt="Resuscitation Group Logo (AHA TC Alignment)"
                  className="h-auto w-full object-contain"
                  height={180}
                  src="/TS_English_CMYK_rk-2020.png"
                  width={180}
                />
                <p className="mt-2 text-center text-text-light text-xs">
                  Aligned with Resuscitation Group in Vancouver, WA USA
                </p>
              </div>
              <div className="flex w-full max-w-[410px] justify-center rounded-lg bg-white p-4 sm:w-auto">
                <Image
                  alt="HSI Approved Training Center"
                  className="h-auto w-full object-contain"
                  height={127}
                  src="/HSI_Approved-Training-Center-TC_Horizontal.png"
                  width={408}
                />
              </div>
              <div className="flex w-full max-w-[370px] justify-center rounded-lg bg-white p-4 sm:w-auto">
                <ChamberBadge />
              </div>
            </div>
          </div>

          {/* Final CTA - Full Width */}
          <div className="border-gray-200 border-t pt-12 text-center">
            <h3 className="mb-4 font-semibold text-2xl text-text">
              Interested in something else?
            </h3>
            <p className="mb-6 text-text-light">
              Let us know how we can help you by contacting us today!
            </p>
            <Link href="/contact">
              <Button size="lg" variant="primary">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
