export const ARC_HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Phone Number",
  "Evaluation (see instructions, data entered must match evaluation options)",
  "Reason if unsuccessful or not evaluated (see instructions, data entered must match an item from the list)",
  "Additional Information (optional)",
];

export const AHA_HEADERS = [
  "Course Date",
  "First Name",
  "Last Name",
  "Email",
  "Phone (Optional)",
];

export type AgencyAttendee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  evaluation?: string;
  reason?: string;
  additionalInformation?: string;
};

type ExportSeat = {
  _id: string;
  name: string;
  email: string;
  state: string;
  snapshot: {
    attendee: { firstName?: string; lastName?: string; phone?: string };
  };
};

const WHITESPACE = /\s+/u;
const INTERNATIONAL_PHONE = /^\+\d+$/u;
const CSV_FORMULA = /^[\s]*[=+@-]/u;
const CSV_QUOTING = /[",\r\n]/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

export function agencyAttendees(seats: ExportSeat[]): AgencyAttendee[] {
  return seats
    .filter((seat) => seat.state === "active")
    .map((seat) => {
      const { attendee } = seat.snapshot;
      const parts = seat.name.trim().split(WHITESPACE);
      return {
        id: seat._id,
        firstName: attendee.firstName ?? parts.at(0) ?? "",
        lastName: attendee.lastName ?? parts.slice(1).join(" "),
        email: seat.email,
        phone: attendee.phone ?? "",
      };
    });
}

/** Fetch the entire roster, independent of the table's search and loaded rows. */
export async function collectAgencyAttendees(
  fetchPage: (cursor: string | null) => Promise<{
    page: ExportSeat[];
    isDone: boolean;
    continueCursor: string;
  }>,
  cursor: string | null = null,
  attendees: AgencyAttendee[] = []
): Promise<AgencyAttendee[]> {
  const result = await fetchPage(cursor);
  attendees.push(...agencyAttendees(result.page));
  if (result.isDone) {
    return attendees;
  }
  return collectAgencyAttendees(fetchPage, result.continueCursor, attendees);
}

export function agencyCourseDate(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function csvCell(value: string) {
  const safe =
    CSV_FORMULA.test(value) && !INTERNATIONAL_PHONE.test(value)
      ? `'${value}`
      : value;
  return CSV_QUOTING.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function arcRosterCsv(attendees: AgencyAttendee[]) {
  return `${[
    ARC_HEADERS,
    ...attendees.map((attendee) => [
      attendee.firstName,
      attendee.lastName,
      attendee.email,
      attendee.phone,
      attendee.evaluation ?? "",
      attendee.reason ?? "",
      attendee.additionalInformation ?? "",
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export async function ahaRosterXls(
  attendees: AgencyAttendee[],
  courseDate: string
): Promise<ArrayBuffer> {
  if (!ISO_DATE.test(courseDate)) {
    throw new Error("Choose a course date");
  }
  const [year, month, day] = courseDate.split("-");
  const { utils, write } = await import("xlsx");
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([
    AHA_HEADERS,
    ...attendees.map((attendee) => [
      `${month}/${day}/${year}`,
      attendee.firstName,
      attendee.lastName,
      attendee.email,
      attendee.phone,
    ]),
  ]);
  utils.book_append_sheet(workbook, sheet, "Sheet1");
  return write(workbook, { bookType: "biff8", type: "array" });
}
