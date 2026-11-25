import { fetchQuery } from "convex/nextjs";
import type { FunctionReturnType } from "convex/server";
import type { Metadata } from "next";
import { api as registrationApi } from "@/convex/_generated/api";
import { COURSE_CATALOG, type CourseKey } from "@/lib/course-catalog";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { getBreadcrumbSchema } from "@/lib/structuredData";
import { parsePlace } from "@/shared/registration/catalog";

type Offering = NonNullable<
  FunctionReturnType<typeof registrationApi.registration.detail>
>;
type Catalog = FunctionReturnType<
  typeof registrationApi.registration.upcomingClasses
>;
type UpcomingSession = Catalog["sessions"][number];

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const DESCRIPTION_LENGTH = 155;
const TITLE_LENGTH = 60;
const BRAND = " | Taylored Instruction";
const INDEX = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
};

/**
 * The app route group is noindex by default because most of it is account
 * and checkout UI; the public class pages opt back in explicitly.
 */
export function indexable(metadata: Metadata): Metadata {
  return { ...metadata, robots: INDEX };
}

type Meeting = { start: number; end: number; location: string };
/** Meetings in calendar order; staff may enter them in any order. */
function ordered<T extends Meeting>(meetings: T[]) {
  return [...meetings].sort((a, b) => a.start - b.start);
}
/** Whether every, no, or some meetings happen at a physical venue. */
function attendance(meetings: Meeting[]) {
  const virtual = meetings.filter(
    (m) => parsePlace(m.location).name === "Online"
  );
  if (!meetings.length || virtual.length === 0) {
    return "onsite" as const;
  }
  return virtual.length === meetings.length
    ? ("online" as const)
    : ("mixed" as const);
}
const ATTENDANCE_MODE = {
  onsite: "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
  mixed: "https://schema.org/MixedEventAttendanceMode",
};
const COURSE_MODE = { onsite: "Onsite", online: "Online", mixed: "Blended" };

/** First sentence or two of a course description, sized for a search snippet. */
export function snippet(text: string, fallback: string) {
  const flat = text.replace(/\s+/gu, " ").trim();
  if (!flat) {
    return fallback;
  }
  if (flat.length <= DESCRIPTION_LENGTH) {
    return flat;
  }
  const cut = flat.slice(0, DESCRIPTION_LENGTH);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, stop > 60 ? stop : DESCRIPTION_LENGTH).trimEnd()}…`;
}

function clip(text: string, max: number) {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * The first head + tail that fits a search result title; otherwise the head is
 * shortened so the last tail (the details that make the page unique) survives.
 */
function pageTitle(head: string, tails: string[]) {
  const fit = tails.find(
    (candidate) => head.length + candidate.length <= TITLE_LENGTH
  );
  if (fit !== undefined) {
    return head + fit;
  }
  const tail = tails.at(-1) ?? "";
  return clip(head, TITLE_LENGTH - tail.length) + tail;
}

function cityOf(location: string) {
  const { address } = parsePlace(location);
  const parts = address.split(",").map((p) => p.trim());
  // "11324 NE 51st Cir, Vancouver, WA 98682" → "Vancouver, WA"
  if (parts.length >= 3) {
    const state = parts.at(-1)?.split(" ")[0] ?? "";
    return `${parts.at(-2)}${state ? `, ${state}` : ""}`;
  }
  return parts.at(-1) ?? "";
}

function tuitionDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function shortDate(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(ms));
}

function longDate(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(ms));
}

function placeSchema(location: string) {
  const { name, address } = parsePlace(location);
  if (!address && name === "Online") {
    return { "@type": "VirtualLocation", url: `${SITE_URL}/classes` };
  }
  return {
    "@type": "Place",
    name,
    ...(address
      ? { address: { "@type": "PostalAddress", streetAddress: address } }
      : {}),
  };
}

/**
 * `open` is whether registration is accepting seats at all; a class past its
 * cutoff still reports seats but must not be advertised as purchasable.
 */
function offerSchema(
  url: string,
  cents: number,
  available: number | undefined,
  open = true
) {
  return {
    "@type": "Offer",
    url,
    price: tuitionDollars(cents),
    priceCurrency: "USD",
    availability:
      open && available !== 0
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
    validFrom: new Date().toISOString().slice(0, 10),
    category: "Primary",
  };
}

/** Base price for one seat on an offering: tuition plus required materials. */
function seatPrice(config: Offering["config"]) {
  return (
    config.tuition +
    config.materials
      .filter((m) => m.policy !== "optional")
      .reduce((sum, m) => sum + m.cents, 0)
  );
}

/**
 * A description unique to one class: its date, venue, and city lead, and the
 * course description fills the rest of the snippet.
 */
function sessionDescription(offering: Offering) {
  const first = ordered(offering.meetings).at(0);
  const { name } = parsePlace(first?.location ?? "");
  const city = first ? cityOf(first.location) : "";
  const date = offering.firstStart
    ? ` on ${longDate(offering.firstStart, offering.timeZone)}`
    : "";
  const venue = name === "Online" ? " online" : ` at ${name}`;
  const where = first ? `${venue}${city ? ` in ${city}` : ""}` : "";
  return snippet(
    `${offering.title}${date}${where}. ${offering.description}`,
    offering.title
  );
}

/** Search-friendly metadata for one scheduled class. */
export function sessionMetadata(offering: Offering): Metadata {
  const path = `/s/${offering.code ?? ""}`;
  const first = ordered(offering.meetings).at(0);
  const city = first ? cityOf(first.location) : "";
  const day = offering.firstStart
    ? shortDate(offering.firstStart, offering.timeZone)
    : "";
  const details = [city, day]
    .filter(Boolean)
    .map((part) => ` · ${part}`)
    .join("");
  const base = buildPageMetadata({
    title: pageTitle(offering.title, [`${details}${BRAND}`, details]),
    description: sessionDescription(offering),
    path,
    ogType: "website",
    keywords: [offering.title, city ? `${offering.title} ${city}` : ""].filter(
      Boolean
    ),
    image: {
      title: offering.title,
      eyebrow: [day, city].filter(Boolean).join(" · "),
    },
  });
  const listed = offering.state !== "canceled" && !offering.unlisted;
  return listed
    ? indexable(base)
    : { ...base, robots: { index: false, follow: true } };
}

/**
 * Event and Course markup for one scheduled class. Both are emitted: Google's
 * course carousel reads Course + CourseInstance, and event search reads
 * EducationEvent.
 */
export function sessionSchemas(offering: Offering) {
  const url = `${SITE_URL}/s/${offering.code ?? ""}`;
  const meetings = ordered(offering.meetings);
  const first = meetings.at(0);
  const last = meetings.at(-1);
  const price = seatPrice(offering.config);
  const offers = offerSchema(
    url,
    price,
    offering.available,
    offering.state === "open"
  );
  const location = first ? placeSchema(first.location) : placeSchema("");
  const mode = attendance(meetings);
  const event = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    "@id": `${url}#event`,
    name: offering.title,
    description: sessionDescription(offering),
    url,
    startDate: first ? new Date(first.start).toISOString() : undefined,
    endDate: last ? new Date(last.end).toISOString() : undefined,
    eventStatus:
      offering.state === "canceled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: ATTENDANCE_MODE[mode],
    location,
    organizer: { "@id": ORGANIZATION_ID },
    performer: { "@id": ORGANIZATION_ID },
    offers,
    subEvent: meetings.map((m) => ({
      "@type": "EducationEvent",
      name: offering.title,
      startDate: new Date(m.start).toISOString(),
      endDate: new Date(m.end).toISOString(),
      location: placeSchema(m.location),
    })),
  };
  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${url}#course`,
    name: offering.title,
    description: snippet(offering.description, offering.title),
    provider: { "@id": ORGANIZATION_ID },
    offers,
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        name: offering.title,
        courseMode: COURSE_MODE[mode],
        startDate: first ? new Date(first.start).toISOString() : undefined,
        endDate: last ? new Date(last.end).toISOString() : undefined,
        location,
        offers,
        courseSchedule: {
          "@type": "Schedule",
          repeatCount: meetings.length,
          startDate: first
            ? new Date(first.start).toISOString().slice(0, 10)
            : undefined,
          endDate: last
            ? new Date(last.end).toISOString().slice(0, 10)
            : undefined,
        },
      },
    ],
  };
  const breadcrumb = getBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "Classes", url: `${SITE_URL}/classes` },
    { name: offering.title, url },
  ]);
  return [event, course, breadcrumb];
}

/** Course instances for a template page or a marketing page, from live sessions. */
export function courseInstances(sessions: UpcomingSession[]) {
  return sessions.map((s) => {
    const url = `${SITE_URL}/s/${s.code}`;
    const meetings = ordered(s.meetings);
    const first = meetings.at(0);
    return {
      "@type": "CourseInstance",
      name: s.title,
      courseMode: COURSE_MODE[attendance(meetings)],
      startDate: new Date(s.firstStart).toISOString(),
      endDate: new Date(s.lastEnd).toISOString(),
      location: placeSchema(first?.location ?? ""),
      offers: offerSchema(url, s.price, s.available),
      url,
    };
  });
}

/** Course markup for a template page with every upcoming date attached. */
export function courseSchemas(
  offering: Offering,
  sessions: UpcomingSession[],
  slug: string
) {
  const url = `${SITE_URL}/courses/${slug}`;
  const price = seatPrice(offering.config);
  // An empty hasCourseInstance is invalid markup; a course with no open
  // public dates simply omits it until one is scheduled.
  const instances =
    offering.delivery === "self-paced"
      ? [
          {
            "@type": "CourseInstance",
            name: offering.title,
            courseMode: "Online",
            offers: offerSchema(url, price, undefined),
          },
        ]
      : courseInstances(sessions);
  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${url}#course`,
    name: offering.title,
    description: snippet(offering.description, offering.title),
    url,
    provider: { "@id": ORGANIZATION_ID },
    offers: offerSchema(url, price, undefined),
    ...(instances.length ? { hasCourseInstance: instances } : {}),
  };
  const breadcrumb = getBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "Classes", url: `${SITE_URL}/classes` },
    { name: offering.title, url },
  ]);
  return [course, breadcrumb];
}

/** Search-friendly metadata for a course page, placed in its next class's city. */
export function courseMetadata(
  offering: Offering,
  sessions: UpcomingSession[],
  slug: string
): Metadata {
  const first = sessions.at(0)?.meetings.at(0);
  const city = first ? cityOf(first.location) : "";
  const local = city ? [` in ${city}${BRAND}`, ` in ${city}`] : [];
  return indexable(
    buildPageMetadata({
      title: pageTitle(offering.title, [...local, BRAND, ""]),
      description: snippet(
        offering.description,
        `${offering.title} with Taylored Instruction. See upcoming dates and full pricing, then register online.`
      ),
      path: `/courses/${slug}`,
      keywords: [offering.title],
      image: { title: offering.title, eyebrow: "Classes & registration" },
    })
  );
}

/**
 * Attaches live dates and the current price to a marketing page's static
 * Course markup. Falls back to the static schema when the backend is away.
 */
export async function withLiveInstances<T extends { offers?: unknown }>(
  schema: T,
  key: CourseKey
): Promise<T> {
  const match = COURSE_CATALOG[key];
  try {
    const data = await fetchQuery(
      registrationApi.registration.upcomingClasses,
      {
        slugs: [...match.slugs],
        keywords: [...match.keywords],
        exclude: match.exclude ? [...match.exclude] : undefined,
      }
    );
    const course = data.courses.at(0);
    if (!course) {
      return schema;
    }
    const url = `${SITE_URL}/courses/${course.slug}`;
    return {
      ...schema,
      url,
      offers: offerSchema(url, course.price, undefined),
      ...(data.sessions.length
        ? { hasCourseInstance: courseInstances(data.sessions) }
        : {}),
    };
  } catch {
    return schema;
  }
}
