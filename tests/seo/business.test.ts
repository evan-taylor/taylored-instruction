import { describe, expect, it } from "vitest";
import {
  ACCREDITATION_PHRASE,
  BUSINESS,
  BUSINESS_SAME_AS,
  formatBusinessAddress,
} from "@/lib/business";
import {
  getAboutPersonSchema,
  getLocalBusinessSchema,
  getOrganizationSchema,
} from "@/lib/structuredData";

const PHONE_DIGITS = "3606858199";
const DIGITS = /\D/g;
const TIME = /^\d{2}:\d{2}$/;

const credentialNames = (node: Record<string, unknown>) =>
  (node.hasCredential as Array<{ name: string }>).map(
    (credential) => credential.name
  );

describe("business constant", () => {
  it("uses the confirmed phone number in every format", () => {
    expect(BUSINESS.phone.display.replace(DIGITS, "")).toBe(PHONE_DIGITS);
    expect(BUSINESS.phone.href).toBe(`tel:+1${PHONE_DIGITS}`);
    expect(BUSINESS.phone.schema.replace(DIGITS, "")).toBe(`1${PHONE_DIGITS}`);
  });

  it("uses the public inbox and the CoLab street address", () => {
    expect(BUSINESS.email).toBe("info@tayloredinstruction.com");
    expect(formatBusinessAddress()).toBe(
      "915 Broadway St #100, Vancouver, WA 98660"
    );
  });

  it("covers the confirmed service area", () => {
    const names = BUSINESS.serviceArea.map((area) => area.name);
    for (const city of [
      "Vancouver, WA",
      "Portland, OR",
      "San Luis Obispo, CA",
      "Camas, WA",
    ]) {
      expect(names).toContain(city);
    }
  });

  it("only links profiles that are on the site and nothing on hovn.app", () => {
    expect(BUSINESS_SAME_AS).toEqual([
      BUSINESS.googleBusinessProfileUrl,
      BUSINESS.socials.facebook,
      BUSINESS.socials.instagram,
    ]);
    expect(JSON.stringify(BUSINESS)).not.toContain("hovn");
  });

  it("names all three accreditations in the sitewide phrase", () => {
    expect(ACCREDITATION_PHRASE).toContain(
      "Red Cross Licensed Training Provider"
    );
    expect(ACCREDITATION_PHRASE).toContain("AHA Training Site");
    expect(ACCREDITATION_PHRASE).toContain("HSI Training Center");
  });
});

describe("LocalBusiness schema", () => {
  const schema = getLocalBusinessSchema();

  it("has the fields Google requires and recommends", () => {
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("LocalBusiness");
    expect(schema.name).toBe("Taylored Instruction");
    expect(schema.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "915 Broadway St #100",
      addressLocality: "Vancouver",
      addressRegion: "WA",
      postalCode: "98660",
      addressCountry: "US",
    });
    expect(schema.telephone).toBe("+1-360-685-8199");
    expect(schema.url).toBe("https://tayloredinstruction.com");
    expect(schema.geo).toMatchObject({ "@type": "GeoCoordinates" });
  });

  it("opens 9 AM to 7 PM every day", () => {
    const [hours] = schema.openingHoursSpecification as Array<{
      dayOfWeek: string[];
      opens: string;
      closes: string;
    }>;
    expect(hours.dayOfWeek).toHaveLength(7);
    expect(hours.opens).toMatch(TIME);
    expect(hours.opens).toBe("09:00");
    expect(hours.closes).toBe("19:00");
  });

  it("serves San Luis Obispo as an area instead of a second location", () => {
    expect(schema.areaServed).toContainEqual({
      "@type": "City",
      name: "San Luis Obispo, CA",
    });
    expect(JSON.stringify(schema)).not.toContain("san-luis-obispo-ca");
  });

  it("carries a logo ImageObject, accreditations and no ratings", () => {
    expect(schema.logo).toMatchObject({
      "@type": "ImageObject",
      url: BUSINESS.logoUrl,
    });
    expect(credentialNames(schema)).toHaveLength(3);
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
  });
});

describe("Organization schema", () => {
  const schema = getOrganizationSchema();

  it("shares NAP, sameAs and accreditations with the business constant", () => {
    expect(schema.telephone).toBe(BUSINESS.phone.schema);
    expect(schema.email).toBe(BUSINESS.email);
    expect(schema.sameAs).toEqual(BUSINESS_SAME_AS);
    expect(schema.logo).toMatchObject({ "@type": "ImageObject" });
    expect(String(schema.description)).toContain(ACCREDITATION_PHRASE);
    expect(credentialNames(schema)).toEqual(
      BUSINESS.accreditations.map((accreditation) => accreditation.name)
    );
  });
});

describe("Person schema", () => {
  it("lists Evan's credentials and headshot", () => {
    const schema = getAboutPersonSchema();
    expect(schema.image).toBe("https://tayloredinstruction.com/headshot.jpg");
    expect(schema.jobTitle).toBe(BUSINESS.founder.jobTitle);
    expect(credentialNames(schema)).toEqual([
      "AHA Training Faculty",
      "Red Cross Lifeguarding Instructor Trainer",
      "Red Cross Water Safety Instructor Trainer",
      "Red Cross First Aid/CPR/AED Instructor Trainer",
    ]);
  });
});
