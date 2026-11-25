import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import {
  courseMetadata,
  courseSchemas,
  sessionMetadata,
  sessionSchemas,
} from "../../lib/registration-seo";

const modules = import.meta.glob("../../convex/**/*.ts");
const DAY = 86_400_000;
const CLIPPED_RECERT = /… · Vancouver, WA · [A-Z][a-z]{2} \d{1,2}$/u;
const CAMAS_TITLE = /^Lifeguarding - Blended · Camas, WA · /u;
const CAMAS_DESCRIPTION =
  /^Lifeguarding - Blended on \w+day, \w+ \d{1,2}, \d{4} at Gold's Gym Camas in Camas, WA\. Flexible/u;
const FIXED_LENGTH = /"(duration|timeRequired|courseWorkload)"/u;
const VENUES = [
  "Gold's Gym Camas: 2950 NW 38th Ave, Camas, WA 98607",
  "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682",
];
const settings = {
  tuition: 30_000,
  materials: [],
  questions: [],
  outcomes: [],
  emails: [],
  cutoffMinutes: 0,
};

async function catalog(sessionCount: number) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const instructor = await ctx.db.insert("users", {
      email: "teacher@example.test",
      emailVerificationTime: Date.now(),
    });
    const courseId = await ctx.db.insert("registrationCourses", {
      slug: "lifeguarding-blended",
      title: "Lifeguarding - Blended",
      description:
        "Flexible blended learning format combining online learning with in-person skills sessions for lifeguard certification.",
      delivery: "scheduled",
      publication: "published",
      settings,
      enrollmentOpen: true,
      revision: 1,
    });
    await Promise.all(
      VENUES.slice(0, sessionCount).map((venue, index) => {
        const start = Date.now() + (index + 2) * DAY;
        return ctx.db.insert("registrationSessions", {
          courseId,
          title: "Lifeguarding - Blended",
          code: `code-${index}`,
          publication: "published",
          visibility: "public",
          state: "open",
          capacity: 10,
          reserved: 2,
          timeZone: "America/Los_Angeles",
          meetings: [
            {
              id: "first",
              start,
              end: start + 3_600_000,
              location: venue,
              instructions: "",
              sequence: 0,
            },
          ],
          firstStart: start,
          lastEnd: start + 3_600_000,
          overrides: {},
          revision: 1,
          instructors: [instructor],
          offerMinutes: 1440,
        });
      })
    );
  });
  const offering = await t.query(api.registration.detail, {
    slug: "lifeguarding-blended",
  });
  const { sessions } = await t.query(api.registration.upcomingClasses, {
    slugs: ["lifeguarding-blended"],
    keywords: [],
  });
  if (!offering) {
    throw new Error("Fixture course is not published");
  }
  return { t, offering, sessions };
}

it("attaches every open public session to the course page's Course markup", async () => {
  const { offering, sessions } = await catalog(2);
  const [course] = courseSchemas(
    offering,
    sessions,
    "lifeguarding-blended"
  ) as Record<string, unknown>[];
  expect(course?.hasCourseInstance).toMatchObject([
    {
      "@type": "CourseInstance",
      courseMode: "Onsite",
      location: { name: "Gold's Gym Camas" },
      offers: {
        url: "https://tayloredinstruction.com/s/code-0",
        price: "300.00",
        availability: "https://schema.org/InStock",
      },
    },
    { location: { name: "Clark County Family YMCA" } },
  ]);
});

it("gives the course page each upcoming class's venue and price", async () => {
  const { t, offering } = await catalog(2);
  const sessions = await t.query(api.registration.publicCourseSessions, {
    courseId: offering.courseId,
  });
  expect(sessions).toMatchObject([
    { code: "code-0", location: VENUES[0], price: 30_000, available: 8 },
    { code: "code-1", location: VENUES[1], price: 30_000 },
  ]);
});

it("takes class dates from the session's meetings and states no fixed length", async () => {
  const { t, offering, sessions } = await catalog(1);
  const session = await t.query(api.registration.detail, { code: "code-0" });
  if (!session) {
    throw new Error("Fixture session is not published");
  }
  const meeting = session.meetings.at(0);
  if (!meeting) {
    throw new Error("Fixture session has no meetings");
  }
  const start = new Date(meeting.start).toISOString();
  const end = new Date(meeting.end).toISOString();
  const [event, course] = sessionSchemas(session) as Record<string, unknown>[];
  expect(event).toMatchObject({ startDate: start, endDate: end });
  expect(course?.hasCourseInstance).toMatchObject([
    { startDate: start, endDate: end },
  ]);
  const [template] = courseSchemas(
    offering,
    sessions,
    "lifeguarding-blended"
  ) as Record<string, unknown>[];
  expect(template?.hasCourseInstance).toMatchObject([
    { startDate: start, endDate: end },
  ]);
  expect(JSON.stringify([event, course, template])).not.toMatch(FIXED_LENGTH);
});

it("omits hasCourseInstance rather than emitting an empty list when nothing is scheduled", async () => {
  const { offering, sessions } = await catalog(0);
  expect(sessions).toEqual([]);
  const [course] = courseSchemas(
    offering,
    sessions,
    "lifeguarding-blended"
  ) as Record<string, unknown>[];
  expect(course).not.toHaveProperty("hasCourseInstance");
});

it("keeps course titles within 60 characters and places them in the next class's city", async () => {
  const { offering, sessions } = await catalog(1);
  const metadata = courseMetadata(offering, sessions, "lifeguarding-blended");
  expect(metadata.title).toBe(
    "Lifeguarding - Blended in Camas, WA | Taylored Instruction"
  );
  expect(metadata.openGraph?.images).toMatchObject([
    { url: expect.stringContaining("/api/og?") },
  ]);
  const long = courseMetadata(
    {
      ...offering,
      title: "Lifeguarding Instructor/Instructor Trainer Recertification",
    },
    sessions,
    "recert"
  );
  expect(String(long.title).length).toBeLessThanOrEqual(60);
  expect(long.title).toBe(
    "Lifeguarding Instructor/Instructor Trainer Recertification"
  );
  const unscheduled = courseMetadata(offering, [], "lifeguarding-blended");
  expect(unscheduled.title).toBe(
    "Lifeguarding - Blended | Taylored Instruction"
  );
});

it("gives each session a short title and a description naming its date, venue, and city", async () => {
  const { t } = await catalog(2);
  const [camas, vancouver] = await Promise.all(
    ["code-0", "code-1"].map((code) =>
      t.query(api.registration.detail, { code })
    )
  );
  if (!(camas && vancouver)) {
    throw new Error("Fixture sessions are not published");
  }
  for (const offering of [
    camas,
    vancouver,
    {
      ...camas,
      title: "Lifeguarding Instructor/Instructor Trainer Recertification",
    },
  ]) {
    const metadata = sessionMetadata(offering);
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(metadata.openGraph?.images).toMatchObject([
      { url: expect.stringContaining("/api/og?") },
    ]);
  }
  const recert = sessionMetadata({
    ...vancouver,
    title: "Lifeguarding Instructor/Instructor Trainer Recertification",
  });
  expect(recert.title).toMatch(CLIPPED_RECERT);
  const first = sessionMetadata(camas);
  const second = sessionMetadata(vancouver);
  expect(first.title).toMatch(CAMAS_TITLE);
  expect(first.description).toMatch(CAMAS_DESCRIPTION);
  expect(second.description).toContain("at Clark County Family YMCA");
  expect(first.description).not.toBe(second.description);
  expect(String(first.description).length).toBeLessThanOrEqual(156);
  const [event] = sessionSchemas(camas) as Record<string, unknown>[];
  expect(event?.description).toBe(first.description);
});
