import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ChamberBadge } from "@/components/ui/ChamberBadge";

export const AboutSection = () => (
  <section className="bg-background py-16">
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-10 text-center font-bold text-3xl text-text md:text-4xl">
          About Taylored Instruction
        </h2>

        <div className="mb-12 grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <h3 className="mb-4 font-semibold text-2xl text-text">
              What We Do
            </h3>
            <p className="mb-8 text-text-light">
              Taylored Instruction was built upon the core value of teaching
              basic lifesaving skills to all. Whether it be through Swimming
              Lessons, CPR training, or Lifeguarding classes, we want to help
              you help others.
            </p>

            <h3 className="mb-4 font-semibold text-2xl text-text">
              How We Do It
            </h3>
            <p className="mb-8 text-text-light">
              Taylored Instruction provides classes periodically in various
              places in the Vancouver community based on availability and
              demand. We can also travel to your area or business to provide a
              class, provided you have the space and the necessary amount of
              students (typically 5).
            </p>
          </div>
          <div className="md:order-first">
            <Image
              alt="Lifeguards practicing skills"
              className="h-auto w-full rounded-lg shadow-lg"
              height={334}
              src="/lifeguard-training-1.jpeg"
              width={500}
            />
          </div>
        </div>

        <h3 className="mb-4 font-semibold text-2xl text-text">Who We Are</h3>
        <p className="mb-8 text-text-light">
          Taylored Instruction is a small business born in Vancouver, WA, owned
          and operated by Evan Taylor. Evan has been swimming since a young age,
          and began teaching swimming lessons and lifeguarding at age 15. He
          discovered his passion for teaching health and safety classes, and
          became an American Red Cross instructor at age 17.
        </p>

        <div className="mt-12 grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div className="text-center md:text-left">
            <h3 className="mb-4 font-semibold text-2xl text-text">
              Have a question?
            </h3>
            <p className="mb-6 text-text-light">
              Let us know how we can help you by contacting us today!
            </p>
            <Button href="/contact" size="lg" variant="primary">
              Contact Us
            </Button>
          </div>
          <div className="flex justify-center md:justify-end">
            <ChamberBadge />
          </div>
        </div>
      </div>
    </div>
  </section>
);
