import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  ClassDiscovery,
  type DiscoveryFirstPage,
  RegistrationDetail,
} from "../../components/registration/public";
import { classListSchema } from "../../lib/registration-seo";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
  usePaginatedQuery: () => ({
    results: [],
    status: "LoadingFirstPage",
    loadMore: vi.fn(),
  }),
  usePreloadedQuery: (preloaded: { value: unknown }) => preloaded.value,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

type DetailProps = Parameters<typeof RegistrationDetail>[0];
type Preloaded = DetailProps["preloaded"];
type CourseSessions = NonNullable<DetailProps["sessions"]>;

const START = Date.parse("2027-01-09T17:00:00Z");
const VENUE =
  "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682";
const LOADING = "Loading classes…";
const HEADING = /<h1[^>]*>Lifeguarding - Blended<\/h1>/u;
const session = {
  id: "session",
  courseId: "course",
  title: "Lifeguarding - Blended",
  description: "Blended lifeguard certification.",
  delivery: "scheduled",
  code: "abc123",
  timeZone: "America/Los_Angeles",
  firstStart: START,
  available: 7,
  state: "open",
  unlisted: false,
  config: {
    tuition: 30_000,
    materials: [],
    questions: [],
    outcomes: [],
    emails: [],
    cutoffMinutes: 0,
  },
  meetings: [
    { id: "1", start: START, end: START + 3_600_000, location: VENUE },
  ],
} as unknown as DiscoveryFirstPage["page"][number];

/** Stands in for preloadQuery's result; the mocked hook unwraps it. */
const preload = (value: unknown) => ({ value }) as unknown as Preloaded;

it("renders the first page of classes before the live query answers", () => {
  const html = renderToStaticMarkup(
    <ClassDiscovery initial={{ search: "", page: [session] }} />
  );
  expect(html).toContain("<h1");
  expect(html).toContain("Lifeguarding - Blended");
  expect(html).toContain(VENUE);
  expect(html).toContain("$300.00 per attendee");
  expect(html).toContain("7 seats left");
  expect(html).toContain('href="/s/abc123"');
  expect(html).not.toContain(LOADING);
});

it("does not show a server page rendered for a different search", () => {
  const html = renderToStaticMarkup(
    <ClassDiscovery initial={{ search: "bls", page: [session] }} />
  );
  expect(html).toContain(LOADING);
  expect(html).not.toContain(VENUE);
});

it("renders a course page with its upcoming dates, venue, price, and seats", () => {
  const sessions: CourseSessions = [
    {
      code: "abc123",
      title: "Lifeguarding - Blended",
      start: START,
      timeZone: "America/Los_Angeles",
      available: 7,
      location: VENUE,
      price: 30_000,
    },
  ];
  const html = renderToStaticMarkup(
    <RegistrationDetail
      preloaded={preload({ ...session, id: "course", code: undefined })}
      sessions={sessions}
    />
  );
  expect(html).toMatch(HEADING);
  expect(html).toContain("Blended lifeguard certification.");
  expect(html).toContain("Sat, Jan 9");
  expect(html).toContain(VENUE);
  expect(html).toContain("$300.00 per attendee");
  expect(html).toContain("7 seats left");
  expect(html).not.toContain(LOADING);
});

it("renders a class page's title and schedule from preloaded data", () => {
  const html = renderToStaticMarkup(
    <RegistrationDetail code="abc123" preloaded={preload(session)} />
  );
  expect(html).toMatch(HEADING);
  expect(html).toContain("Sat, Jan 9");
  expect(html).toContain("Clark County Family YMCA");
  expect(html).not.toContain("Loading class");
});

it("lists the schedule as an ItemList of EducationEvents", () => {
  const list = classListSchema([session, { ...session, code: "def456" }]);
  expect(list).toMatchObject({
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "EducationEvent",
          url: "https://tayloredinstruction.com/s/abc123",
          location: { name: "Clark County Family YMCA" },
          offers: { price: "300.00" },
        },
      },
      {
        position: 2,
        item: { url: "https://tayloredinstruction.com/s/def456" },
      },
    ],
  });
  expect(list.itemListElement[0]?.item).not.toHaveProperty("@context");
});
