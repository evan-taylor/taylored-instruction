import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cache } from "react";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { courseMetadata, courseSchemas } from "@/lib/registration-seo";
import { generateJSONLD } from "@/lib/structuredData";

type Props = { params: Promise<{ slug: string }> };

const courseFor = cache(async (slug: string) => {
  const offering = await fetchQuery(api.registration.detail, { slug }).catch(
    () => null
  );
  const sessions = offering
    ? await fetchQuery(api.registration.upcomingClasses, {
        slugs: [slug],
        keywords: [],
      })
        .then((data) => data.sessions)
        .catch(() => [])
    : [];
  return { offering, sessions };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { offering, sessions } = await courseFor(slug);
  if (!offering) {
    return {
      title: "Course details | Taylored Instruction",
      robots: { index: false, follow: true },
    };
  }
  return courseMetadata(offering, sessions, slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { offering, sessions } = await courseFor(slug);
  return (
    <>
      {offering
        ? courseSchemas(offering, sessions, slug).map((schema, index) => (
            <script
              dangerouslySetInnerHTML={generateJSONLD(schema)}
              // biome-ignore lint/suspicious/noArrayIndexKey: static list of distinct schema types
              key={index}
              type="application/ld+json"
            />
          ))
        : null}
      <RegistrationDetail slug={slug} />
    </>
  );
}
