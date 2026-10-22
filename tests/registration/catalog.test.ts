import { expect, it } from "vitest";
import { COURSE_CATALOG } from "../../lib/course-catalog";
import { snippet } from "../../lib/registration-seo";
import { matchesCourse, parsePlace } from "../../shared/registration/catalog";

it("matches a course by slug, then by title keyword, never through an exclusion", () => {
  const { bls } = COURSE_CATALOG;
  expect(
    matchesCourse({ slug: "aha-bls-provider-2025", title: "x" }, bls)
  ).toBe(true);
  expect(matchesCourse({ slug: "other", title: "AHA BLS Provider" }, bls)).toBe(
    true
  );
  expect(
    matchesCourse({ slug: "other", title: "AHA BLS Instructor" }, bls)
  ).toBe(false);
  expect(
    matchesCourse(
      { slug: "other", title: "BLS Instructor" },
      COURSE_CATALOG["aha-instructor-training"]
    )
  ).toBe(true);
  expect(
    matchesCourse(
      { slug: "other", title: "Lifeguarding Instructor - Blended" },
      COURSE_CATALOG.lifeguarding
    )
  ).toBe(false);
  expect(
    matchesCourse(
      { slug: "other", title: "Lifeguarding Instructor - Blended" },
      COURSE_CATALOG["lifeguarding-instructor"]
    )
  ).toBe(true);
});

it("splits a venue string into a name and a street address", () => {
  expect(
    parsePlace(
      "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682"
    )
  ).toEqual({
    name: "Clark County Family YMCA",
    address: "11324 NE 51st Cir, Vancouver, WA 98682",
  });
  expect(parsePlace("Training center")).toEqual({
    name: "Training center",
    address: "",
  });
  expect(parsePlace("")).toEqual({ name: "Online", address: "" });
});

it("trims a description to a search snippet at a sentence or word boundary", () => {
  expect(snippet("", "fallback")).toBe("fallback");
  expect(snippet("Short.  Text\nhere", "x")).toBe("Short. Text here");
  const long = `${"Train to become an American Red Cross Lifeguarding Instructor. ".repeat(4)}Learn to plan lessons.`;
  const result = snippet(long, "x");
  expect(result.length).toBeLessThanOrEqual(156);
  expect(result.endsWith("…")).toBe(true);
  expect(result).not.toContain("Instructo…");
});

it("emits event, course, and breadcrumb markup for a scheduled class", async () => {
  const { sessionSchemas, sessionMetadata } = await import(
    "../../lib/registration-seo"
  );
  const start = Date.parse("2027-01-09T00:00:00Z");
  const offering = {
    id: "session",
    courseId: "course",
    title: "Lifeguarding Instructor - Blended",
    description: "Train to become an instructor.",
    delivery: "scheduled",
    code: "abc123",
    timeZone: "America/Los_Angeles",
    firstStart: start,
    available: 9,
    state: "open",
    unlisted: false,
    config: {
      tuition: 35_000,
      materials: [
        {
          id: "m",
          materialId: "mat",
          title: "eBook",
          policy: "included",
          cents: 500,
        },
      ],
      questions: [],
      outcomes: [],
      emails: [],
      cutoffMinutes: 0,
    },
    meetings: [
      {
        id: "1",
        start,
        end: start + 3_600_000,
        location: "YMCA: 1 Main St, Vancouver, WA 98682",
      },
      {
        id: "2",
        start: start + 86_400_000,
        end: start + 90_000_000,
        location: "YMCA: 1 Main St, Vancouver, WA 98682",
      },
    ],
  } as unknown as Parameters<typeof sessionSchemas>[0];
  const [event, course, breadcrumb] = sessionSchemas(offering) as Record<
    string,
    unknown
  >[];
  expect(event?.["@type"]).toBe("EducationEvent");
  expect(event?.startDate).toBe("2027-01-09T00:00:00.000Z");
  expect(event?.endDate).toBe(new Date(start + 90_000_000).toISOString());
  expect(event?.location).toMatchObject({
    "@type": "Place",
    name: "YMCA",
    address: { streetAddress: "1 Main St, Vancouver, WA 98682" },
  });
  expect(event?.offers).toMatchObject({
    price: "355.00",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://tayloredinstruction.com/s/abc123",
  });
  expect(course?.["@type"]).toBe("Course");
  expect(breadcrumb?.["@type"]).toBe("BreadcrumbList");
  const metadata = sessionMetadata(offering);
  expect(metadata.title).toContain("Vancouver, WA");
  expect(metadata.robots).toEqual({ index: true, follow: true });
  expect(
    sessionMetadata({ ...offering, unlisted: true, available: 0 }).robots
  ).toEqual({ index: false, follow: true });
  const [soldOut] = sessionSchemas({
    ...offering,
    available: 0,
  }) as unknown as Record<string, { availability: string }>[];
  expect(soldOut?.offers.availability).toBe("https://schema.org/SoldOut");
});
