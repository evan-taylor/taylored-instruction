import { expect, it } from "vitest";
import { formatSchedule } from "../../shared/registration/schedule";

const ymca = "Clark County Family YMCA: 11324 NE 51st Cir, Vancouver, WA 98682";
const at = (iso: string) => Date.parse(iso);
const zone = "America/Los_Angeles";

it("condenses a multi-day class into one line per day in local time", () => {
  expect(
    formatSchedule(
      [
        {
          start: at("2027-01-10T16:00:00Z"),
          end: at("2027-01-11T00:00:00Z"),
          location: ymca,
        },
        {
          start: at("2027-01-09T00:00:00Z"),
          end: at("2027-01-09T04:00:00Z"),
          location: ymca,
          instructions: "Bring a swimsuit",
        },
        {
          start: at("2027-01-09T16:00:00Z"),
          end: at("2027-01-10T00:00:00Z"),
          location: ymca,
          instructions: "Bring a swimsuit",
        },
      ],
      zone
    )
  ).toBe(
    [
      "January 8 – 10, 2027 · 3 days · PST",
      "Fri, Jan 8 · 4:00 – 8:00 PM",
      "Sat, Jan 9 · 8:00 AM – 4:00 PM",
      "Sun, Jan 10 · 8:00 AM – 4:00 PM",
      ymca,
      "Bring a swimsuit",
    ].join("\n")
  );
});

it("spells out the date for a single-day class", () => {
  expect(
    formatSchedule(
      [
        {
          start: at("2026-11-14T17:00:00Z"),
          end: at("2026-11-14T21:00:00Z"),
          location: ymca,
        },
      ],
      zone
    )
  ).toBe(
    ["Saturday, November 14, 2026", "9:00 AM – 1:00 PM PST", ymca].join("\n")
  );
});

it("lists each location after its days and labels zones that change mid-class", () => {
  expect(
    formatSchedule(
      [
        {
          start: at("2026-10-31T17:00:00Z"),
          end: at("2026-10-31T21:00:00Z"),
          location: "Pool A",
        },
        {
          start: at("2026-11-07T18:00:00Z"),
          end: at("2026-11-07T22:00:00Z"),
          location: "Room B",
        },
      ],
      zone
    )
  ).toBe(
    [
      "October 31 – November 7, 2026 · 2 days",
      "Sat, Oct 31 · 10:00 AM – 2:00 PM PDT",
      "Pool A",
      "Sat, Nov 7 · 10:00 AM – 2:00 PM PST",
      "Room B",
    ].join("\n")
  );
});

it("keeps each venue beside its times on a single day", () => {
  expect(
    formatSchedule(
      [
        {
          start: at("2026-11-14T17:00:00Z"),
          end: at("2026-11-14T19:00:00Z"),
          location: "Room A",
        },
        {
          start: at("2026-11-14T20:00:00Z"),
          end: at("2026-11-14T22:00:00Z"),
          location: "Pool B",
        },
      ],
      zone
    )
  ).toBe(
    [
      "Saturday, November 14, 2026",
      "9:00 – 11:00 AM PST",
      "Room A",
      "12:00 – 2:00 PM PST",
      "Pool B",
    ].join("\n")
  );
});
