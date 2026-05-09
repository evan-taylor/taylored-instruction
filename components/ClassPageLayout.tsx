import { ArrowUpRight, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import CourseRegistrationButton from "@/components/CourseRegistrationButton";
import { Button } from "@/components/ui/Button";

type HeroImage = {
  alt: string;
  position?: string;
  src: string;
};

type ResourceLink = {
  href: string;
  label: string;
};

type SecondaryAction = {
  href: string;
  label: string;
  variant?: "secondary" | "outline";
};

type ClassPageLayoutProps = {
  children: ReactNode;
  courseName: string;
  image: HeroImage;
  registrationUrl: string;
  resources?: ResourceLink[];
  secondaryActions?: SecondaryAction[];
  subtitle?: string;
  title: string;
};

type ClassPageSectionProps = {
  children: ReactNode;
  title: string;
};

export function ClassPageSection({ children, title }: ClassPageSectionProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-4 font-bold text-2xl text-gray-950">{title}</h2>
      <div className="space-y-4 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function ClassPageLayout({
  children,
  courseName,
  image,
  registrationUrl,
  resources = [],
  secondaryActions = [],
  subtitle,
  title,
}: ClassPageLayoutProps) {
  return (
    <div className="bg-white">
      <section className="relative flex min-h-[430px] items-end overflow-hidden md:min-h-[500px]">
        <Image
          alt={image.alt}
          className="brightness-[0.72]"
          fill
          priority
          sizes="100vw"
          src={image.src}
          style={{
            objectFit: "cover",
            objectPosition: image.position ?? "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="mb-4 font-semibold text-sm text-white/80 uppercase tracking-[0.18em]">
              Certification Course
            </p>
            <h1 className="mb-0 max-w-4xl text-balance font-bold text-4xl text-white leading-tight md:text-6xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-5 max-w-3xl text-lg text-white/90 leading-8">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="-mt-14 relative z-20 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xl md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="mb-2 font-bold text-gray-950 text-xl">
                Find an upcoming class
              </h2>
              <p className="mb-0 text-gray-600">
                View current dates, locations, and registration details on Hovn.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:justify-end">
              <CourseRegistrationButton
                buttonClassName="h-12 px-5 py-0 text-base"
                buttonText="View Current Offerings"
                className="mb-0"
                courseName={courseName}
                registrationUrl={registrationUrl}
                size="md"
              />
              {secondaryActions.map((action) => (
                <Button
                  className="h-12 w-full whitespace-nowrap px-5 py-0 text-base sm:w-auto"
                  href={action.href}
                  key={action.label}
                  rel={
                    action.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  size="lg"
                  target={action.href.startsWith("http") ? "_blank" : undefined}
                  variant={action.variant ?? "secondary"}
                >
                  {action.label}
                  {action.href.startsWith("http") ? (
                    <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
                  ) : null}
                </Button>
              ))}
            </div>
          </div>

          {resources.length > 0 ? (
            <div className="mt-5 flex flex-col gap-3 border-gray-200 border-t pt-5 sm:flex-row sm:flex-wrap">
              {resources.map((resource) => (
                <Link
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-50"
                  href={resource.href}
                  key={resource.label}
                >
                  <FileText aria-hidden="true" className="mr-2 size-4" />
                  {resource.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}
