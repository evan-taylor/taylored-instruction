import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AED Distribution | Taylored Instruction",
  description:
    "Taylored Instruction is an authorized distributor of leading AED brands. Contact us for a quote or to place an order for your organization.",
  keywords: [
    "AED distributor",
    "Automated External Defibrillator",
    "AED sales",
    "Buy AED",
    "AED for business",
    "AED for school",
    "Lifesaving equipment",
    "Taylored Instruction AED",
    "Vancouver AED",
    "Vancouver WA AED distributor",
    "Vancouver AED sales",
    "Vancouver AED for sale",
    "Vancouver AED for business",
    "Vancouver AED for school",
  ],
};

export default function AedPage() {
  return (
    <>
      {/* Hero Section with Background Image (matching contact page style) */}
      <section className="relative flex min-h-[400px] items-center justify-center md:min-h-[500px]">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <Image
            alt="Lifesaving equipment" // Using same image as contact page
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
              AED Sales & Distribution
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/90 leading-relaxed md:text-xl">
              Equip your organization with life-saving AEDs. Taylored
              Instruction is your authorized local distributor for leading
              brands.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-6 text-center font-semibold text-2xl text-text md:text-3xl">
            Why Choose Taylored Instruction for Your AED Needs?
          </h2>

          <div className="mb-12 grid items-center gap-8 md:grid-cols-2">
            <div>
              <ul className="list-inside list-disc space-y-3 text-lg text-text-light">
                <li>
                  <span className="font-semibold text-text">
                    Expert Guidance:
                  </span>{" "}
                  We help you select the right AED model for your specific
                  environment and needs.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Trusted Brands:
                  </span>{" "}
                  Access to reliable and user-friendly AEDs from industry
                  leaders.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Competitive Pricing:
                  </span>{" "}
                  Get affordable pricing on devices and accessories.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Comprehensive Support:
                  </span>{" "}
                  We offer setup assistance and can integrate AED training with
                  our existing CPR and First Aid courses.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Regulatory Compliance:
                  </span>{" "}
                  Ensure your organization meets local and state requirements
                  for AED placement and maintenance.
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <Image
                alt="ZOLL AED Device"
                className="h-auto max-w-full rounded-lg"
                height={400}
                src="/Zoll-AED-Image.png"
                width={400}
              />
            </div>
          </div>

          <h2 className="mb-8 text-center font-semibold text-2xl text-text md:text-3xl">
            Ready to Enhance Safety with an AED?
          </h2>
          <p className="mx-auto mb-8 max-w-3xl text-center text-lg text-text-light">
            Investing in an AED is a critical step towards protecting your
            employees, customers, or community members. Sudden Cardiac Arrest
            can happen anywhere, and having an AED readily available can
            significantly increase survival chances.
          </p>

          {/* Call to Action Section */}
          <div className="rounded-lg bg-muted p-8 text-center shadow">
            <h3 className="mb-4 font-semibold text-text text-xl md:text-2xl">
              Get a Quote or Place Your Order Today!
            </h3>
            <p className="mb-6 text-text-light">
              Our team is ready to assist you with product selection, pricing,
              and any questions you may have. Contact us to discuss your AED
              needs.
            </p>
            <Button href="/contact" size="lg" variant="primary">
              Contact Us for AEDs
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
