import { fetchQuery, preloadedQueryResult, preloadQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cache } from "react";
import { RegistrationDetail } from "@/components/registration/public";
import { api } from "@/convex/_generated/api";
import { courseMetadata, courseSchemas } from "@/lib/registration-seo";
import { generateJSONLD } from "@/lib/structuredData";

/** Blocks on Convex so crawlers get the schedule in the first HTML response. */
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

const courseFor = cache(async (slug: string) => {
  const preloaded = await preloadQuery(api.registration.detail, { slug });
  const offering = preloadedQueryResult(preloaded);
  if (!offering) {
    return { preloaded, offering, sessions: [], courseSessions: undefined };
  }
  const [sessions, courseSessions] = await Promise.all([
    fetchQuery(api.registration.upcomingClasses, {
      slugs: [slug],
      keywords: [],
    })
      .then((data) => data.sessions)
      .catch(() => []),
    offering.delivery === "scheduled"
      ? fetchQuery(api.registration.publicCourseSessions, {
          courseId: offering.courseId,
        }).catch(() => undefined)
      : undefined,
  ]);
  return { preloaded, offering, sessions, courseSessions };
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
  const { preloaded, offering, sessions, courseSessions } =
    await courseFor(slug);
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
      <RegistrationDetail preloaded={preloaded} sessions={courseSessions} />
    </>
  );
}
