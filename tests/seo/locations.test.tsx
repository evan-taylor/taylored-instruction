import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CityLandingPage from "@/components/locations/CityLandingPage";
import {
  findLocation,
  LOCATIONS,
  locationPath,
  locationSchemas,
  sessionsIn,
} from "@/lib/locations";
import nextConfig from "@/next.config.js";

const WORD = /\S+/gu;
const EM_DASH = /\u2014/u;

const session = (code: string, location: string) => ({
  code,
  title: `Class ${code}`,
  courseSlug: "lifeguarding-blended",
  firstStart: Date.UTC(2027, 0, 8, 17),
  lastEnd: Date.UTC(2027, 0, 8, 21),
  timeZone: "America/Los_Angeles",
  available: 6,
  price: 12_500,
  meetings: [
    {
      start: Date.UTC(2027, 0, 8, 17),
      end: Date.UTC(2027, 0, 8, 21),
      location,
    },
  ],
});

const sessions = [
  session(
    "ymca",
    "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682"
  ),
  session("golds", "Gold's Gym Camas: 2950 NW 38th Ave, Camas, WA 98607"),
  session("pdx", "Office: 100 SW Main St, Portland, OR 97204"),
  session("online", ""),
];

const cityPage = (slug: string) => {
  const found = findLocation(slug);
  if (!found) {
    throw new Error(`Missing location ${slug}`);
  }
  return found;
};

describe("city landing pages", () => {
  it("keeps titles and descriptions within snippet limits", () => {
    for (const city of LOCATIONS) {
      expect(city.title.length, city.slug).toBeLessThanOrEqual(60);
      expect(city.description.length, city.slug).toBeLessThanOrEqual(155);
    }
  });

  it("gives every city a unique 400 to 700 word intro", () => {
    for (const city of LOCATIONS) {
      const words = city.intro.join(" ").match(WORD)?.length ?? 0;
      expect(words, city.slug).toBeGreaterThanOrEqual(400);
      expect(words, city.slug).toBeLessThanOrEqual(700);
    }
    for (const key of ["title", "description", "heading"] as const) {
      expect(new Set(LOCATIONS.map((city) => city[key])).size).toBe(
        LOCATIONS.length
      );
    }
  });

  it("keeps copy free of retired facts", () => {
    const copy = JSON.stringify(LOCATIONS);
    expect(copy).not.toContain("658");
    expect(copy).not.toContain("hovn");
    expect(copy).not.toMatch(EM_DASH);
  });

  it("matches classes to a city by the first meeting's address", () => {
    const codes = (slug: string) =>
      sessionsIn(cityPage(slug), sessions).map((s) => s.code);
    expect(codes("vancouver-wa")).toEqual(["ymca"]);
    expect(codes("camas-wa")).toEqual(["golds"]);
    expect(codes("portland-or")).toEqual(["pdx"]);
    expect(codes("san-luis-obispo-ca")).toEqual([]);
  });

  it("only points nearby fallbacks at real city pages", () => {
    const slugs = new Set(LOCATIONS.map((city) => city.slug));
    for (const city of LOCATIONS) {
      for (const slug of city.nearby) {
        expect(slugs.has(slug), `${city.slug} → ${slug}`).toBe(true);
      }
    }
  });

  it("renders local classes, or the closest ones when a city has none", () => {
    const vancouver = renderToStaticMarkup(
      <CityLandingPage
        location={cityPage("vancouver-wa")}
        nearby={[]}
        others={[]}
        sessions={sessionsIn(cityPage("vancouver-wa"), sessions)}
      />
    );
    expect(vancouver).toContain('href="/s/ymca"');
    expect(vancouver).toContain("Clark County Family YMCA, Vancouver, WA");
    expect(vancouver).toContain("915 Broadway St, Suite 100");

    const slo = renderToStaticMarkup(
      <CityLandingPage
        location={cityPage("san-luis-obispo-ca")}
        nearby={sessionsIn(cityPage("camas-wa"), sessions)}
        others={[]}
        sessions={[]}
      />
    );
    expect(slo).toContain("No public classes are posted in San Luis Obispo");
    expect(slo).toContain("Closest upcoming classes");
    expect(slo).toContain('href="/s/golds"');
  });

  it("marks up Vancouver as the local business and other cities as services", () => {
    const types = (slug: string) =>
      locationSchemas(cityPage(slug)).map((schema) => schema["@type"]);
    expect(types("vancouver-wa")).toEqual([
      "WebPage",
      "BreadcrumbList",
      "FAQPage",
      "LocalBusiness",
    ]);
    expect(types("portland-or")).toContain("Service");
    const [, , , business] = locationSchemas(cityPage("vancouver-wa"));
    expect(JSON.stringify(business)).toContain('"postalCode":"98660"');
  });

  it("redirects retired /resources city pages to existing city pages", async () => {
    const paths = new Set(LOCATIONS.map(locationPath));
    const redirects = await nextConfig.redirects();
    const cityRedirects = redirects.filter((r: { destination: string }) =>
      r.destination.startsWith("/cpr-classes/")
    );
    expect(cityRedirects).toHaveLength(LOCATIONS.length);
    for (const redirect of cityRedirects) {
      expect(paths.has(redirect.destination)).toBe(true);
    }
  });
});
