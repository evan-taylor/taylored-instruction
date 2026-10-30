import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { read, utils } from "xlsx";
import {
  AHA_HEADERS,
  ARC_HEADERS,
  agencyAttendees,
  agencyCourseDate,
  ahaRosterXls,
  arcRosterCsv,
  collectAgencyAttendees,
} from "../../shared/registration/agency-roster";

const attendee = {
  id: "one",
  firstName: "Zoë",
  lastName: "de la Cruz",
  email: "zoe@example.test",
  phone: "5551234567",
};
const seat = {
  _id: "one",
  name: "Zoë de la Cruz",
  email: attendee.email,
  state: "active",
  snapshot: {
    attendee: {
      firstName: "Zoë",
      lastName: "de la Cruz",
      phone: attendee.phone,
    },
  },
};

describe("agency roster exports", () => {
  it("matches the supplied ARC template and leaves agency evaluations unset", () => {
    const template = readFileSync(
      new URL("./fixtures/agency-roster/arc.csv", import.meta.url)
    );
    const expected = read(template, { type: "buffer" });
    const output = read(arcRosterCsv([attendee]), {
      type: "string",
      raw: true,
    });
    expect(
      utils.sheet_to_json(expected.Sheets.Sheet1, { header: 1 })[0]
    ).toEqual(ARC_HEADERS);
    expect(
      utils.sheet_to_json(output.Sheets.Sheet1, { header: 1, defval: "" })
    ).toEqual([
      ARC_HEADERS,
      ["Zoë", "de la Cruz", attendee.email, attendee.phone, "", "", ""],
    ]);
  });

  it("writes a genuine binary XLS with the AHA template sheet and columns", async () => {
    const template = read(
      readFileSync(
        new URL("./fixtures/agency-roster/aha.xls", import.meta.url)
      ),
      { type: "buffer" }
    );
    const bytes = await ahaRosterXls([attendee], "2026-10-27");
    expect(Array.from(new Uint8Array(bytes).slice(0, 8))).toEqual([
      208, 207, 17, 224, 161, 177, 26, 225,
    ]);
    const workbook = read(bytes, { type: "array" });
    expect(workbook.SheetNames).toEqual(template.SheetNames);
    expect(
      utils.sheet_to_json(template.Sheets.Sheet1, { header: 1 })[0]
    ).toEqual(AHA_HEADERS);
    expect(utils.sheet_to_json(workbook.Sheets.Sheet1, { header: 1 })).toEqual([
      AHA_HEADERS,
      ["10/27/2026", "Zoë", "de la Cruz", attendee.email, attendee.phone],
    ]);
    expect(workbook.Sheets.Sheet1.E2.t).toBe("s");
  });

  it("preserves structured names and filters all inactive states", () => {
    expect(
      agencyAttendees([
        seat,
        ...["held", "canceled", "transferred"].map((state) => ({
          ...seat,
          state,
        })),
      ])
    ).toEqual([attendee]);
    expect(
      agencyAttendees([{ ...seat, snapshot: { attendee: {} } }])[0]
    ).toMatchObject({ firstName: "Zoë", lastName: "de la Cruz", phone: "" });
    expect(
      agencyAttendees([
        { ...seat, name: "Cher", snapshot: { attendee: {} } },
      ])[0]
    ).toMatchObject({ firstName: "Cher", lastName: "" });
  });

  it("collects every page even when an intermediate page has no active seats", async () => {
    const cursors: (string | null)[] = [];
    const result = await collectAgencyAttendees((cursor) => {
      cursors.push(cursor);
      return Promise.resolve(
        cursor === null
          ? {
              page: [{ ...seat, state: "held" }],
              continueCursor: "next",
              isDone: false,
            }
          : { page: [seat], continueCursor: "", isDone: true }
      );
    });
    expect(cursors).toEqual([null, "next"]);
    expect(result).toEqual([attendee]);
  });

  it("escapes CSV delimiters, quotes, newlines and spreadsheet formulas", () => {
    const output = arcRosterCsv([
      { ...attendee, firstName: 'Jane, "JJ"\nDoe', lastName: "=1+1" },
    ]);
    expect(output).toContain('"Jane, ""JJ""\nDoe"');
    expect(output).toContain("'=1+1");
  });

  it("exports ARC positional fields without literal quotes or the internal seat state", () => {
    const rows = agencyAttendees([
      {
        ...seat,
        name: "Jane Doe",
        email: "jane@example.test",
        snapshot: { attendee: {} },
      },
    ]);
    const data = arcRosterCsv(rows).split("\r\n").at(1);
    expect(data).toBe("Jane,Doe,jane@example.test,,,,");
    expect(data?.split(",")).toEqual([
      "Jane",
      "Doe",
      "jane@example.test",
      "",
      "",
      "",
      "",
    ]);
    expect(data).not.toContain('"');
    expect(data).not.toContain("active");
  });

  it("uses the session time zone when the UTC date differs", () => {
    expect(
      agencyCourseDate(Date.UTC(2026, 9, 28, 1), "America/Los_Angeles")
    ).toBe("2026-10-27");
  });
});
