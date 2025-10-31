"use cache";

import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm"; // Placeholder for the form component

// --- Page Metadata ---
export const metadata: Metadata = {
  title:
    "Contact Taylored Instruction | CPR, BLS & Lifeguard Training in Vancouver WA & San Luis Obispo CA",
  description:
    "Contact Taylored Instruction for CPR, BLS, First Aid & Lifeguard training inquiries in Vancouver WA, Clark County & San Luis Obispo CA. Call (360) 207-1844 or email evan@tayloredinstruction.com. Expert safety training support available.",
  keywords: [
    "Contact Taylored Instruction",
    "Taylored Instruction phone number",
    "Taylored Instruction email",
    "CPR training inquiry Vancouver WA",
    "Lifeguard course questions Vancouver WA",
    "Safety training support",
    "Vancouver WA CPR contact",
    "Get in touch Taylored Instruction",
    "BLS course contact",
    "First Aid training contact",
    "Contact CPR instructor Vancouver",
    "San Luis Obispo CPR contact",
    "Clark County CPR inquiry",
    "Schedule CPR training",
    "CPR class registration",
    "Contact Evan Taylor",
    "360-207-1844",
  ],
  openGraph: {
    title:
      "Contact Taylored Instruction | CPR, BLS & Lifeguard Training Support",
    description:
      "Contact us for CPR, BLS, First Aid & Lifeguard training inquiries in Vancouver WA & San Luis Obispo CA. Call (360) 207-1844 or email evan@tayloredinstruction.com.",
    url: "https://tayloredinstruction.com/contact",
    siteName: "Taylored Instruction",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Contact Taylored Instruction - Expert Safety Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Contact Taylored Instruction | CPR, BLS & Lifeguard Training Support",
    description:
      "Contact us for CPR, BLS, First Aid & Lifeguard training inquiries. Serving Vancouver WA & San Luis Obispo CA.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/contact",
  },
};

// --- Page Component ---
export default async function ContactPage() {
  cacheLife("days");
  return (
    <>
      {/* Hero Section with Background Image */}
      <section className="relative flex min-h-[400px] items-center justify-center md:min-h-[500px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="Lifesaving equipment"
            className="brightness-[0.85]"
            fill
            priority
            sizes="100vw"
            src="/life-buoy-1.jpeg"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container relative z-20 mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-black/30 p-8 backdrop-blur-sm md:p-10">
            <h1 className="mb-6 font-bold text-4xl text-white md:text-5xl">
              Contact Us
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/90 leading-relaxed md:text-xl">
              Have a question, or want to learn more? We&apos;re here to help!
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {/* Form Column (2/3 width on desktop) */}
            <div className="md:col-span-2">
              <h2 className="mb-6 font-semibold text-3xl text-text">
                Send Us a Message
              </h2>
              {/* Contact Form Component will go here */}
              <ContactForm />
            </div>

            {/* Contact Info Column (1/3 width on desktop) */}
            <div className="md:col-span-1">
              <h2 className="mb-6 text-center font-semibold text-3xl text-text">
                Contact Information
              </h2>
              <div className="rounded-lg bg-gray-50 p-6 text-center shadow-sm">
                <div className="relative mx-auto mb-4 h-36 w-36 overflow-hidden rounded-full border-4 border-primary shadow-lg">
                  <Image
                    alt="Headshot of Evan Taylor, owner" // Assuming same headshot as About page
                    layout="fill"
                    objectFit="cover"
                    src="/headshot.png"
                  />
                </div>
                <h3 className="mb-1 font-semibold text-text text-xl">
                  Evan Taylor
                </h3>
                <p className="mb-4 text-text-light">
                  Owner, Instructor Trainer
                </p>

                <div className="space-y-3 text-left text-text-light">
                  <p className="flex items-center justify-center">
                    <Phone className="mr-2 text-primary" />
                    <a className="hover:text-primary" href="tel:3602071844">
                      (360) 207-1844
                    </a>
                  </p>
                  <p className="flex items-center justify-center">
                    <Mail className="mr-2 text-primary" />
                    <a
                      className="break-all hover:text-primary"
                      href="mailto:evan@tayloredinstruction.com"
                    >
                      evan@tayloredinstruction.com
                    </a>
                  </p>
                </div>

                <p className="mt-6 text-sm text-text-light">
                  For class registration, please visit our registration portal:
                </p>
                <Link
                  className="mt-2 inline-block font-medium text-primary hover:underline"
                  href="https://www.hovn.app/tayloredinstruction"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Register for Classes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
