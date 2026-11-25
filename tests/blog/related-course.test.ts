import { describe, expect, it } from "vitest";
import { relatedCourseForPost } from "@/lib/related-course";

const hrefFor = (slug: string, title = "") =>
  relatedCourseForPost({ slug, title }).href;

describe("relatedCourseForPost", () => {
  it("sends BLS posts to /bls", () => {
    expect(hrefFor("what-is-bls-certification")).toBe("/bls");
    expect(hrefFor("renewal-guide", "Basic Life Support renewal")).toBe("/bls");
  });

  it("prefers BLS over group wording", () => {
    expect(hrefFor("bls-renewal-for-dental-offices-plan-a-group-class")).toBe(
      "/bls"
    );
  });

  it("sends lifeguard posts to /lifeguarding", () => {
    expect(hrefFor("how-to-become-a-lifeguard")).toBe("/lifeguarding");
    expect(hrefFor("pool-staff", "Lifeguarding requirements")).toBe(
      "/lifeguarding"
    );
  });

  it("sends AED posts to /aeds", () => {
    expect(hrefFor("aed-placement-for-offices-with-multiple-floors")).toBe(
      "/aeds"
    );
    expect(hrefFor("choosing-aeds-for-schools")).toBe("/aeds");
  });

  it("does not treat a First Aid/CPR/AED course name as an AED post", () => {
    expect(hrefFor("first-aid-cpr-aed-class-guide")).toBe("/classes");
  });

  it("sends group and corporate posts to /corporate-training", () => {
    expect(hrefFor("onsite-cpr-training-for-companies")).toBe(
      "/corporate-training"
    );
    expect(hrefFor("cpr-for-workplace-teams")).toBe("/corporate-training");
    expect(hrefFor("plan-a-group-cpr-class")).toBe("/corporate-training");
    expect(hrefFor("corporate-cpr")).toBe("/corporate-training");
  });

  it("sends everything else to /classes", () => {
    expect(hrefFor("how-to-perform-infant-cpr")).toBe("/classes");
    expect(hrefFor("sudden-cardiac-arrest-at-home")).toBe("/classes");
  });

  it("does not match keywords inside other words", () => {
    expect(hrefFor("blessings-and-cpr")).toBe("/classes");
    expect(hrefFor("raed-saves-a-life")).toBe("/classes");
  });
});
