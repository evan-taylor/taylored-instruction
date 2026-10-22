import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { courseSchemas, indexable, snippet } from "@/lib/registration-seo";
import { buildPageMetadata } from "@/lib/seo";
import { generateJSONLD } from "@/lib/structuredData";

type Props = { params: Promise<{ slug: string }> };

async function offeringFor(slug: string) {
  return await fetchQuery(api.registration.detail, { slug }).catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offering = await offeringFor(slug);
  if (!offering) {
    return {
      title: "Course details | Taylored Instruction",
      robots: { index: false, follow: true },
    };
  }
  const description = snippet(
    offering.description,
    `${offering.title} with Taylored Instruction. See upcoming dates and full pricing, then register online.`
  );
  return indexable(
    buildPageMetadata({
      title: `${offering.title} | Classes & Registration | Taylored Instruction`,
      description,
      path: `/courses/${slug}`,
      keywords: [offering.title],
      image: { title: offering.title, description },
    })
  );
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const offering = await offeringFor(slug);
  const sessions = offering
    ? await fetchQuery(api.registration.upcomingClasses, {
        slugs: [slug],
        keywords: [],
      })
        .then((data) => data.sessions)
        .catch(() => [])
    : [];
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
