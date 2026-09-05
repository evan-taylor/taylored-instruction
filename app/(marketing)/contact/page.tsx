"use cache";

import { Mail, Phone } from "lucide-react";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm"; // Placeholder for the form component
import { buildPageMetadata } from "@/lib/seo";
import {
  generateJSONLD,
  getBreadcrumbSchema,
  getContactPageSchema,
  getServiceSchema,
} from "@/lib/structuredData";

const pageTitle =
  "Contact Taylored Instruction | CPR, BLS, First Aid & Lifeguard Training";
const pageDescription =
  "Contact Taylored Instruction for CPR, BLS, First Aid, Lifeguard, and AED training in Vancouver WA and San Luis Obispo CA. Call (360) 685-8199.";

// --- Page Metadata ---
export const metadata = buildPageMetadata({
  description: pageDescription,
  image: {
    description:
      "Call or email Taylored Instruction for CPR, BLS, First Aid, and Lifeguard classes",
    title: "Contact Taylored Instruction",
  },
  keywords: [
    "contact CPR instructor Vancouver WA",
    "CPR class scheduling Vancouver WA",
    "BLS training contact Clark County WA",
    "first aid course registration support",
    "lifeguard training contact San Luis Obispo CA",
    "corporate CPR training quote",
    "AED consultation contact",
    "call Taylored Instruction",
  ],
  path: "/contact",
  title: pageTitle,
});

// --- Page Component ---
export default async function ContactPage() {
  cacheLife("days");
  const contactPageSchema = {
    ...getContactPageSchema(),
    description: pageDescription,
    name: pageTitle,
  };
  const contactServiceSchema = getServiceSchema({
    areaServed: [
      "Clark County, WA",
      "Portland Metro, OR",
      "San Luis Obispo County, CA",
    ],
    description:
      "Course consultation, scheduling support, and custom training quotes for CPR, BLS, First Aid, Lifeguarding, and AED programs.",
    name: "CPR and Safety Training Consultation",
    path: "/contact",
    serviceType: "Training Consultation",
  });
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Contact", url: "https://tayloredinstruction.com/contact" },
  ]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={generateJSONLD(contactPageSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(contactServiceSchema)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
        type="application/ld+json"
      />
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
                    <a className="hover:text-primary" href="tel:3606858199">
                      (360) 685-8199
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
