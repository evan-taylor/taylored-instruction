import { expect, it } from "vitest";
import { shortZone } from "../../components/registration/format";

it("labels schedules using the class date across daylight saving changes", () => {
  expect(
    shortZone("America/Los_Angeles", Date.parse("2026-07-01T18:00:00Z"))
  ).toBe("PDT");
  expect(
    shortZone("America/Los_Angeles", Date.parse("2026-12-01T18:00:00Z"))
  ).toBe("PST");
});
