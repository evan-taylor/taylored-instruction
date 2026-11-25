import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import CityLandingPage from "@/components/locations/CityLandingPage";
import { api } from "@/convex/_generated/api";
import { COURSE_CATALOG } from "@/lib/course-catalog";
import {
  findLocation,
  LOCATIONS,
  locationName,
  locationPath,
  locationSchemas,
  sessionsIn,
} from "@/lib/locations";
import { buildPageMetadata } from "@/lib/seo";
import { generateJSONLD } from "@/lib/structuredData";

type CityPageProps = {
  params: Promise<{ city: string }>;
};

const matches = Object.values(COURSE_CATALOG);

/** Every public class on the marketing catalog, or null when the backend is away. */
async function upcomingSessions() {
  try {
    const data = await fetchQuery(api.registration.upcomingClasses, {
      slugs: [...new Set(matches.flatMap((match) => match.slugs))],
      keywords: [...new Set(matches.flatMap((match) => match.keywords))],
    });
    return data.sessions;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return LOCATIONS.map((location) => ({ city: location.slug }));
}

export async function generateMetadata(
  props: CityPageProps
): Promise<Metadata> {
  const { city } = await props.params;
  const location = findLocation(city);
  if (!location) {
    return buildPageMetadata({
      title: "Location Not Found | Taylored Instruction",
      description: "This Taylored Instruction location page does not exist.",
      path: "/classes",
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: location.title,
    description: location.description,
    path: locationPath(location),
    image: {
      title: location.heading,
      eyebrow: locationName(location),
    },
    keywords: [
      `CPR classes ${locationName(location)}`,
      `BLS certification ${locationName(location)}`,
      `first aid training ${locationName(location)}`,
      `lifeguard certification ${locationName(location)}`,
    ],
  });
}

export default async function CityPage(props: CityPageProps) {
  "use cache";
  cacheLife("hours");
  const { city } = await props.params;
  const location = findLocation(city);
  if (!location) {
    notFound();
  }

  const sessions = await upcomingSessions();
  const local = sessions ? sessionsIn(location, sessions) : [];
  const nearby =
    sessions && local.length === 0
      ? LOCATIONS.filter((other) => location.nearby.includes(other.slug))
          .flatMap((other) => sessionsIn(other, sessions))
          .sort((a, b) => a.firstStart - b.firstStart)
      : [];

  return (
    <>
      {locationSchemas(location).map((schema) => (
        <script
          dangerouslySetInnerHTML={generateJSONLD(schema)}
          key={schema["@type"]}
          type="application/ld+json"
        />
      ))}
      <CityLandingPage
        location={location}
        nearby={nearby}
        others={LOCATIONS.filter((other) => other.slug !== location.slug)}
        sessions={sessions === null ? null : local}
      />
    </>
  );
}
