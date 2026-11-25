import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page Not Found | Taylored Instruction",
};

const services = [
  { href: "/bls", label: "AHA BLS certification" },
  { href: "/basic-life-support", label: "Red Cross BLS certification" },
  { href: "/first-aid-cpr-aed", label: "First Aid/CPR/AED certification" },
  { href: "/heartsaver", label: "AHA Heartsaver First Aid CPR AED" },
  { href: "/lifeguarding", label: "Red Cross Lifeguarding" },
  { href: "/corporate-training", label: "Corporate CPR training" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-12 sm:px-6">
      <Link href="/">
        <Image
          alt="Taylored Instruction home"
          className="h-auto max-h-[64px] w-auto"
          height={64}
          src="/horizontal-logo-black.png"
          width={220}
        />
      </Link>
      <main className="mx-auto mt-16 max-w-lg text-center">
        <p className="font-medium text-primary text-xs uppercase tracking-wide">
          404
        </p>
        <h1 className="mt-2 font-bold text-2xl text-slate-900 lg:text-3xl">
          We couldn’t find that page
        </h1>
        <p className="mt-3 text-slate-600">
          The link may be old or mistyped. Find a class, pick a course below, or
          get in touch.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/classes">Find a class</Button>
          <Button href="/contact" variant="secondary">
            Contact us
          </Button>
        </div>
        <h2 className="mt-12 font-semibold text-lg text-slate-900">
          Popular courses
        </h2>
        <ul className="mt-3 space-y-2">
          {services.map((service) => (
            <li key={service.href}>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={service.href}
              >
                {service.label}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
