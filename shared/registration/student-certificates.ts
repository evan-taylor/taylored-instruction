/**
 * Certificates we issue to students: parsing the agency files staff upload
 * (AHA eCard export, Red Cross ILT class roster), matching their rows to a
 * roster, and the dates and links that follow from a certificate.
 */

export type CertificateAgency = "aha" | "arc";

export const AGENCY_LABELS: Record<CertificateAgency, string> = {
  aha: "American Heart Association",
  arc: "American Red Cross",
};

export type ParsedCertificateRow = {
  /** 1-based row in the file, stable across re-parses of the same bytes. */
  row: number;
  firstName: string;
  lastName: string;
  email: string;
  /** Absent when the file lists the student without an issued certificate. */
  certificateId?: string;
  status: string;
  course: string;
  issuedOn: string;
  expiresOn: string;
  instructor?: string;
  instructorId?: string;
};

export type ParsedCertificateFile = {
  agency: CertificateAgency;
  course: string;
  trainingSite?: string;
  location?: string;
  offeringId?: string;
  rows: ParsedCertificateRow[];
};

/** A file the parsers do not recognize, with a message staff can act on. */
export class CertificateFileError extends Error {
  readonly cause?: unknown;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.cause = options?.cause;
    this.name = "CertificateFileError";
  }
}

export const UNRECOGNIZED_FILE =
  "This file isn’t an AHA eCard export or a Red Cross class roster. Upload the Student eCards spreadsheet (.xlsx) from AHA eCards, or the ILT Class Roster PDF from the Red Cross Learning Center.";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/u;
const NON_ALPHANUMERIC = /[^a-z0-9]/gu;
const WHITESPACE = /\s+/gu;
const DIACRITICS = /[\u0300-\u036f]/gu;
const NAME_NOISE = /[^a-z\s'-]/gu;
const FOOTNOTE = /\*+$/u;
const REVISION = /\s+r\.\s*\d+(\.\d+)?$/iu;
const DELIVERY_SUFFIX = /-(bl|ol|il)$/iu;
const COURSE_WORD = /\bcourse\b/giu;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const DATE_RANGE =
  /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/u;
const SINGLE_DATE = /\d{1,2}\/\d{1,2}\/\d{2,4}/u;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

function headerKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "");
}

function text(value: unknown) {
  return String(value ?? "")
    .replace(WHITESPACE, " ")
    .trim();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoFromParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** A date from a spreadsheet or roster cell: Excel serial, M/D/YYYY, or ISO. */
export function parseCertificateDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(EXCEL_EPOCH + Math.round(value) * DAY_MS);
    return isoFromParts(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return isoFromParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );
  }
  const raw = text(value);
  const iso = raw.match(ISO_DATE);
  if (iso) {
    return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const us = raw.match(US_DATE);
  if (us) {
    const year = Number(us[3]);
    return isoFromParts(
      year < 100 ? 2000 + year : year,
      Number(us[1]),
      Number(us[2])
    );
  }
  return null;
}

/** AHA cards are valid through the end of the month two years after class. */
export function ahaExpiresOn(issuedOn: string) {
  const [year, month] = issuedOn.split("-").map(Number);
  const end = new Date(Date.UTC(year + 2, month, 0));
  return end.toISOString().slice(0, 10);
}

/** Red Cross certificates are valid for two years from the class end date. */
export function arcExpiresOn(issuedOn: string) {
  const [year, month, day] = issuedOn.split("-").map(Number);
  return (
    isoFromParts(year + 2, month, day) ?? isoFromParts(year + 2, month, day - 1)
  );
}

export function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysUntil(from: string, to: string) {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

/** Today's calendar date where the business operates. */
export function businessDate(now: number, timeZone = "America/Los_Angeles") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatCertificateDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

/** "Lifeguarding Instructor-BL r.24" reads as "Lifeguarding Instructor". */
export function certificateCourseTitle(course: string) {
  return text(course).replace(REVISION, "").replace(DELIVERY_SUFFIX, "").trim();
}

/** Groups certificates a renewal replaces: same agency and course family. */
export function certificateTypeKey(agency: CertificateAgency, course: string) {
  const family = certificateCourseTitle(course)
    .replace(COURSE_WORD, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "");
  return `${agency}:${family}`;
}

export const REMINDER_STAGES = [60, 30, 0] as const;
export type ReminderStage = (typeof REMINDER_STAGES)[number];

/**
 * The reminder a certificate is due for today, if any. Windows rather than
 * exact days, so a missed daily run still sends; the job key keeps each stage
 * to one email. Expiry-day mail still goes out up to three days late.
 */
export function reminderStage(
  expiresOn: string,
  today: string
): ReminderStage | null {
  const days = daysUntil(today, expiresOn);
  if (days < -3 || days > 60) {
    return null;
  }
  if (days <= 0) {
    return 0;
  }
  return days <= 30 ? 30 : 60;
}

export const ARC_FIND_CERTIFICATE_URL =
  "https://www.redcross.org/take-a-class/digital-certificate";
export const AHA_ECARDS_URL = "https://ecards.heart.org/student/myecards";

/** Where a student views or downloads their card, and how to find it again. */
export function certificateLinks(
  agency: CertificateAgency,
  certificateId: string
) {
  if (agency === "arc") {
    return {
      view: {
        label: "View and download your certificate",
        url: `https://www.redcross.org/take-a-class/qrCode?certnumber=${encodeURIComponent(certificateId)}&size=wallet`,
      },
      find: {
        label: "Red Cross Find My Certificate",
        url: ARC_FIND_CERTIFICATE_URL,
      },
      howTo:
        "Open the link to see your Red Cross digital certificate, then print or download it. You can also look it up any time on Red Cross Find My Certificate with your certificate ID.",
    };
  }
  return {
    view: { label: "Claim your AHA eCard", url: AHA_ECARDS_URL },
    find: undefined,
    howTo: `On the AHA eCards site, enter your eCard code ${certificateId} (or your name and email), then claim your card. Once it’s claimed you can view, download, or email it any time.`,
  };
}

type Cell = string | number | boolean | Date | null | undefined;

const AHA_COLUMNS = {
  code: ["ecardcode", "ecard", "cardcode", "ecardnumber"],
  firstName: ["firstname", "studentfirstname", "first"],
  lastName: ["lastname", "studentlastname", "last"],
  email: ["email", "emailaddress", "studentemail"],
  courseDate: ["coursedate", "completiondate", "classdate", "issuedate"],
  course: ["course", "coursename"],
  instructor: ["instructor", "instructorname"],
  instructorId: ["instructorid"],
  status: ["status", "ecardstatus"],
  expires: [
    "expirationdate",
    "expires",
    "recommendedrenewaldate",
    "renewaldate",
  ],
} as const;

type AhaColumn = keyof typeof AHA_COLUMNS;

function ahaHeader(row: Cell[]) {
  const keys = row.map(headerKey);
  const columns: Partial<Record<AhaColumn, number>> = {};
  for (const [column, aliases] of Object.entries(AHA_COLUMNS)) {
    const index = keys.findIndex((key) =>
      (aliases as readonly string[]).includes(key)
    );
    if (index !== -1) {
      columns[column as AhaColumn] = index;
    }
  }
  const required: AhaColumn[] = [
    "code",
    "firstName",
    "lastName",
    "courseDate",
    "course",
  ];
  return required.every((column) => columns[column] !== undefined)
    ? (columns as Record<AhaColumn, number | undefined>)
    : null;
}

function ahaCode(value: Cell) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : "";
  }
  return text(value).replace(WHITESPACE, "");
}

/**
 * Rows of the AHA eCards "Student eCards" export. Columns are found by their
 * header, so a reordered or extended export still parses.
 */
export function parseAhaSheet(rows: Cell[][]): ParsedCertificateFile {
  const headerIndex = rows.slice(0, 15).findIndex((row) => ahaHeader(row));
  if (headerIndex === -1) {
    throw new CertificateFileError(UNRECOGNIZED_FILE);
  }
  const columns = ahaHeader(rows[headerIndex]) as Record<
    AhaColumn,
    number | undefined
  >;
  const cell = (row: Cell[], column: AhaColumn) => {
    const index = columns[column];
    return index === undefined ? undefined : row[index];
  };
  const parsed: ParsedCertificateRow[] = [];
  for (const [offset, row] of rows.slice(headerIndex + 1).entries()) {
    const firstName = text(cell(row, "firstName"));
    const lastName = text(cell(row, "lastName"));
    const certificateId = ahaCode(cell(row, "code"));
    if (!(firstName || lastName || certificateId)) {
      continue;
    }
    const line = headerIndex + offset + 2;
    const issuedOn = parseCertificateDate(cell(row, "courseDate"));
    if (!issuedOn) {
      throw new CertificateFileError(
        `Row ${line} has no readable course date. Check the Course Date column and upload the file again.`
      );
    }
    parsed.push({
      row: line,
      firstName,
      lastName,
      email: text(cell(row, "email")).toLowerCase(),
      certificateId: certificateId || undefined,
      status: text(cell(row, "status")) || "Issued",
      course: text(cell(row, "course")),
      issuedOn,
      expiresOn:
        parseCertificateDate(cell(row, "expires")) ?? ahaExpiresOn(issuedOn),
      instructor: text(cell(row, "instructor")) || undefined,
      instructorId: text(cell(row, "instructorId")) || undefined,
    });
  }
  if (!parsed.length) {
    throw new CertificateFileError(
      "This AHA eCard export has no student rows."
    );
  }
  return {
    agency: "aha",
    course: mostCommon(parsed.map((row) => row.course)),
    rows: parsed,
  };
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const [winner] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return winner?.[0] ?? "";
}

/** One positioned run of text from a PDF page. */
export type PdfTextItem = {
  page: number;
  str: string;
  x: number;
  y: number;
  width: number;
};

type Line = { page: number; y: number; items: PdfTextItem[] };

function pdfLines(items: PdfTextItem[]) {
  const lines: Line[] = [];
  let line: Line | undefined;
  const sorted = items
    .filter((item) => item.str.trim())
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  for (const item of sorted) {
    if (line && line.page === item.page && Math.abs(line.y - item.y) <= 3) {
      line.items.push(item);
    } else {
      line = { page: item.page, y: item.y, items: [item] };
      lines.push(line);
    }
  }
  for (const each of lines) {
    each.items.sort((a, b) => a.x - b.x);
  }
  return lines;
}

const lineText = (line: Line) =>
  line.items.map((item) => text(item.str)).join(" ");

const ARC_COLUMNS = {
  firstName: ["firstname"],
  lastName: ["lastname"],
  email: ["email", "emailaddress"],
  phone: ["phone", "phonenumber"],
  status: ["status"],
  certificateId: ["qrcode", "certificateid", "certid", "certificatenumber"],
} as const;
type ArcColumn = keyof typeof ARC_COLUMNS;
const HEADER_SLACK = 2;

function arcHeader(line: Line) {
  const columns: { column: ArcColumn; x: number }[] = [];
  for (const item of line.items) {
    const key = headerKey(item.str);
    const column = (Object.keys(ARC_COLUMNS) as ArcColumn[]).find((name) =>
      (ARC_COLUMNS[name] as readonly string[]).includes(key)
    );
    if (column) {
      columns.push({ column, x: item.x });
    }
  }
  const found = new Set(columns.map((c) => c.column));
  return found.has("firstName") &&
    found.has("lastName") &&
    found.has("email") &&
    found.has("certificateId")
    ? columns
    : null;
}

function labelled(lines: Line[], label: string) {
  const wanted = headerKey(label);
  for (const line of lines) {
    const joined = lineText(line);
    const colon = joined.indexOf(":");
    if (colon !== -1 && headerKey(joined.slice(0, colon)) === wanted) {
      return text(joined.slice(colon + 1));
    }
  }
}

type ArcHeader = NonNullable<ReturnType<typeof arcHeader>>;

/**
 * Roster cells start just left of their heading, so a value belongs to the
 * first column whose heading starts at or after it, whatever its width.
 */
function arcCells(line: Line, header: ArcHeader) {
  const cells: Partial<Record<ArcColumn, string>> = {};
  const columns = [...header].sort((a, b) => a.x - b.x);
  for (const item of line.items) {
    let column: ArcColumn | undefined;
    for (const candidate of columns) {
      ({ column } = candidate);
      if (candidate.x + HEADER_SLACK >= item.x) {
        break;
      }
    }
    if (column) {
      cells[column] = text([cells[column], item.str].filter(Boolean).join(" "));
    }
  }
  return cells;
}

function arcRows(
  lines: Line[],
  headers: Map<number, ArcHeader | null>,
  shared: { course: string; issuedOn: string; instructor?: string }
) {
  const rows: ParsedCertificateRow[] = [];
  let header: ArcHeader | null = null;
  let headerPage = 0;
  for (const [index, line] of lines.entries()) {
    if (headers.has(index)) {
      header = headers.get(index) ?? null;
      headerPage = line.page;
      continue;
    }
    if (!header || line.page !== headerPage) {
      continue;
    }
    const cells = arcCells(line, header);
    const email = (cells.email ?? "").toLowerCase();
    const firstName = cells.firstName ?? "";
    const lastName = (cells.lastName ?? "").replace(FOOTNOTE, "").trim();
    if (EMAIL.test(email) || (firstName && lastName)) {
      rows.push({
        row: rows.length + 1,
        firstName,
        lastName,
        email,
        certificateId: cells.certificateId || undefined,
        status: cells.status ?? "",
        course: shared.course,
        issuedOn: shared.issuedOn,
        expiresOn: arcExpiresOn(shared.issuedOn) ?? shared.issuedOn,
        instructor: shared.instructor,
      });
    }
  }
  return rows;
}

function arcInstructor(lines: Line[], firstHeader: number) {
  const index = lines.findIndex(
    (line) => headerKey(lineText(line)) === "instructorname"
  );
  return index !== -1 && index < firstHeader
    ? lines
        .slice(index + 1, firstHeader)
        .map(lineText)
        .filter(Boolean)
        .join(", ")
    : undefined;
}

/**
 * The Red Cross Learning Center "ILT Class Roster" PDF, from its positioned
 * text. Table columns are assigned by header position, so reordered columns
 * still parse; the class details come from the labelled lines above it.
 */
export function parseArcRoster(items: PdfTextItem[]): ParsedCertificateFile {
  const lines = pdfLines(items);
  const headers = new Map<number, ReturnType<typeof arcHeader>>();
  for (const [index, line] of lines.entries()) {
    const header = arcHeader(line);
    if (header) {
      headers.set(index, header);
    }
  }
  if (!headers.size) {
    throw new CertificateFileError(UNRECOGNIZED_FILE);
  }
  const courseLabel =
    labelled(lines, "Course Id/Course Name") ?? labelled(lines, "Course Name");
  const dates = labelled(lines, "Offering Dates") ?? "";
  const range = dates.match(DATE_RANGE);
  const issuedOn = parseCertificateDate(
    range ? range[2] : dates.match(SINGLE_DATE)?.[0]
  );
  if (!(courseLabel && issuedOn)) {
    throw new CertificateFileError(
      "This Red Cross roster is missing its course name or offering dates. Download the ILT Class Roster PDF again from the Learning Center."
    );
  }
  const firstHeader = Math.min(...headers.keys());
  const instructor = arcInstructor(lines, firstHeader);
  const rows = arcRows(lines, headers, {
    course: courseLabel,
    issuedOn,
    instructor,
  });
  if (!rows.length) {
    throw new CertificateFileError("This Red Cross roster has no students.");
  }
  return {
    agency: "arc",
    course: courseLabel,
    trainingSite: labelled(lines, "Account Name"),
    location: labelled(lines, "Facility Name/Room Name"),
    offeringId: labelled(lines, "Offering ID"),
    rows,
  };
}

export type RosterAttendee = {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type RowMatch = {
  row: number;
  status: "email" | "name" | "ambiguous" | "unmatched";
  attendeeId?: string;
  candidates: string[];
};

export function personName(value: string) {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(FOOTNOTE, "")
    .replace(NAME_NOISE, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function attendeeNames(attendee: RosterAttendee) {
  const names = new Set([personName(attendee.name)]);
  if (attendee.firstName || attendee.lastName) {
    names.add(
      personName(`${attendee.firstName ?? ""} ${attendee.lastName ?? ""}`)
    );
  }
  return names;
}

/**
 * Pairs each certificate row with a roster attendee: by email, then by name.
 * Shared emails (a parent registering two children) fall back to the name.
 * Anything not settled by exactly one attendee is left for staff to match.
 */
export function matchCertificateRows(
  rows: Pick<
    ParsedCertificateRow,
    "row" | "firstName" | "lastName" | "email"
  >[],
  roster: RosterAttendee[]
) {
  const matches: RowMatch[] = rows.map((row) => {
    const name = personName(`${row.firstName} ${row.lastName}`);
    const byName = (list: RosterAttendee[]) =>
      list.filter((attendee) => attendeeNames(attendee).has(name));
    const email = row.email.trim().toLowerCase();
    const byEmail = email
      ? roster.filter((attendee) => attendee.email.toLowerCase() === email)
      : [];
    if (byEmail.length === 1) {
      return {
        row: row.row,
        status: "email",
        attendeeId: byEmail[0].id,
        candidates: [],
      };
    }
    if (byEmail.length > 1) {
      const named = byName(byEmail);
      return named.length === 1
        ? {
            row: row.row,
            status: "email",
            attendeeId: named[0].id,
            candidates: [],
          }
        : {
            row: row.row,
            status: "ambiguous",
            candidates: byEmail.map((a) => a.id),
          };
    }
    const named = byName(roster);
    if (named.length === 1) {
      return {
        row: row.row,
        status: "name",
        attendeeId: named[0].id,
        candidates: [],
      };
    }
    return named.length > 1
      ? {
          row: row.row,
          status: "ambiguous",
          candidates: named.map((a) => a.id),
        }
      : { row: row.row, status: "unmatched", candidates: [] };
  });
  const claims = new Map<string, RowMatch[]>();
  for (const match of matches) {
    if (match.attendeeId) {
      claims.set(match.attendeeId, [
        ...(claims.get(match.attendeeId) ?? []),
        match,
      ]);
    }
  }
  for (const [attendeeId, claimed] of claims) {
    if (claimed.length > 1) {
      for (const match of claimed) {
        match.status = "ambiguous";
        match.attendeeId = undefined;
        match.candidates = [attendeeId];
      }
    }
  }
  const matched = new Set(
    matches.flatMap((match) => (match.attendeeId ? [match.attendeeId] : []))
  );
  return {
    matches,
    withoutCertificate: roster
      .filter((attendee) => !matched.has(attendee.id))
      .map((attendee) => attendee.id),
  };
}
