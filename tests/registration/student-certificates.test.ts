import { convexTest } from "convex-test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { utils, write } from "xlsx";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { COURSE_SURVEY_URLS, GOOGLE_REVIEW_URL } from "../../lib/business";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import { certificateEmail } from "../../shared/registration/certificate-email";
import { readCertificateFile } from "../../shared/registration/certificate-file";
import {
  ahaExpiresOn,
  arcExpiresOn,
  CertificateFileError,
  matchCertificateRows,
  type PdfTextItem,
  parseArcRoster,
  reminderStage,
} from "../../shared/registration/student-certificates";
import { agreement } from "./fixtures/policy";

const modules = import.meta.glob("../../convex/**/*.ts");
const PAGE = { numItems: 100, cursor: null };
const ARC_ID = /^[0-9A-Z]{7}$/u;

beforeEach(() => {
  vi.stubEnv("REGISTRATION_MODE", "test");
  vi.stubEnv("REGISTRATION_TEST_RECIPIENT", "safe@example.test");
  vi.stubEnv("SITE_URL", "https://preview.example.test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/** Mirrors the AHA "Student eCards" export, with its columns reordered. */
function ahaWorkbook(rows: (string | number)[][], header?: string[]) {
  const sheet = utils.aoa_to_sheet([
    header ?? [
      "Email",
      "eCard Code",
      "Course Date",
      "Course",
      "Instructor",
      "Instructor ID",
      "First Name",
      "Last Name",
      "Status",
      "View eCard",
      "Edit",
      "Resend",
      "Notes",
    ],
    ...rows,
  ]);
  const book = utils.book_new();
  utils.book_append_sheet(book, sheet, "Sheet1");
  return new Uint8Array(write(book, { bookType: "xlsx", type: "array" }));
}

const ahaRow = (email: string, code: number, first: string, last: string) => [
  email,
  code,
  "9/13/2026",
  "BLS Provider Course",
  "Sam Rivera",
  12_345_678_901,
  first,
  last,
  "Claimed",
  "Full |  Wallet",
  "Edit",
  "",
  "",
];

/** Mirrors the Red Cross ILT Class Roster PDF: centered headers, left-aligned cells. */
async function arcRoster(
  students: [string, string, string, string, string, string?][],
  columns = ["First Name", "Last Name", "eMail", "Phone", "Status", "QR Code"]
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const draw = (text: string, x: number, y: number) =>
    page.drawText(text, { x, y, size: 9, font });
  draw("Class Roster", 410, 755);
  draw("Account Name:", 36, 710);
  draw("Example Training Co", 105, 710);
  draw("Course Id/Course Name:", 36, 696);
  draw("Lifeguarding-BL r.24", 144, 696);
  draw("Offering ID:", 36, 682);
  draw("CLS-00000001", 88, 682);
  draw("Offering Dates:", 36, 668);
  draw(
    "02/27/2026-02/29/2028".replace("2028", "2026").replace("02/29", "02/28"),
    104,
    668
  );
  draw("Facility Name/Room Name:", 36, 654);
  draw("Community Pool", 155, 654);
  draw("Instructor Name", 263, 614);
  draw("Riley Instructor", 37, 601);
  const headerX = [46, 118, 256, 381, 448, 504];
  const cellX = [37, 109, 180, 359, 436, 492];
  for (const [index, label] of columns.entries()) {
    draw(label, headerX[index] ?? 0, 560);
  }
  const order = columns.map((label) =>
    ["First Name", "Last Name", "eMail", "Phone", "Status", "QR Code"].indexOf(
      label
    )
  );
  for (const [line, student] of students.entries()) {
    for (const [index, source] of order.entries()) {
      const value = student[source];
      if (value) {
        draw(value, cellX[index] ?? 0, 546 - line * 14);
      }
    }
  }
  return new Uint8Array(await pdf.save());
}

describe("certificate file parsers", () => {
  it("reads an AHA eCard export by header, whatever the column order", async () => {
    const parsed = await readCertificateFile(
      ahaWorkbook([
        ahaRow("ava@example.test", 111_122_223_333, "Ava", "Stone"),
        ahaRow("ben@example.test", 444_455_556_666, "Ben", "Lee"),
      ])
    );
    expect(parsed.agency).toBe("aha");
    expect(parsed.course).toBe("BLS Provider Course");
    expect(parsed.rows).toEqual([
      expect.objectContaining({
        row: 2,
        firstName: "Ava",
        lastName: "Stone",
        email: "ava@example.test",
        certificateId: "111122223333",
        issuedOn: "2026-09-13",
        expiresOn: "2028-09-30",
        instructor: "Sam Rivera",
        instructorId: "12345678901",
        status: "Claimed",
      }),
      expect.objectContaining({ row: 3, certificateId: "444455556666" }),
    ]);
  });

  it("reads a Red Cross class roster PDF, including reordered columns", async () => {
    const students: [string, string, string, string, string, string?][] = [
      [
        "Dana",
        "Park*",
        "dana@example.test",
        "5550000000",
        "Acquired",
        "02AB0C1",
      ],
      ["Eli", "Moss", "eli@example.test", "", "Eligible"],
    ];
    for (const columns of [
      undefined,
      ["QR Code", "Status", "eMail", "Phone", "First Name", "Last Name"],
    ]) {
      // biome-ignore lint/performance/noAwaitInLoops: two layouts, one after the other
      const parsed = await readCertificateFile(
        await arcRoster(students, columns)
      );
      expect(parsed).toMatchObject({
        agency: "arc",
        course: "Lifeguarding-BL r.24",
        trainingSite: "Example Training Co",
        location: "Community Pool",
        offeringId: "CLS-00000001",
      });
      expect(parsed.rows).toEqual([
        expect.objectContaining({
          firstName: "Dana",
          lastName: "Park",
          email: "dana@example.test",
          certificateId: "02AB0C1",
          issuedOn: "2026-02-28",
          expiresOn: "2028-02-28",
          instructor: "Riley Instructor",
        }),
        expect.objectContaining({
          firstName: "Eli",
          certificateId: undefined,
          status: "Eligible",
        }),
      ]);
      expect(parsed.rows[0]?.certificateId).toMatch(ARC_ID);
    }
  });

  it("names the file types it accepts when it cannot read one", async () => {
    const random = new TextEncoder().encode("name,email\nA,a@example.test");
    await expect(readCertificateFile(random)).rejects.toThrow(
      "isn’t an AHA eCard export or a Red Cross class roster"
    );
    await expect(
      readCertificateFile(ahaWorkbook([["x"]], ["Name", "Email"]))
    ).rejects.toBeInstanceOf(CertificateFileError);
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText("Invoice 1234");
    await expect(
      readCertificateFile(new Uint8Array(await pdf.save()))
    ).rejects.toThrow("Red Cross class roster");
  });

  it("ignores text items outside the roster table", () => {
    const item = (str: string, x: number, y: number): PdfTextItem => ({
      page: 1,
      str,
      x,
      y,
      width: str.length * 5,
    });
    const parsed = parseArcRoster([
      item("Course Name:", 36, 700),
      item("BLS r.24", 100, 700),
      item("Offering Dates:", 36, 680),
      item("01/05/2026", 110, 680),
      item("First Name", 40, 560),
      item("Last Name", 120, 560),
      item("Email", 250, 560),
      item("Certificate ID", 480, 560),
      item("Gus", 37, 540),
      item("Hale", 109, 540),
      item("gus@example.test", 200, 540),
      item("03CD0E2", 485, 540),
      item("Page 1 of 1", 480, 30),
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      certificateId: "03CD0E2",
      issuedOn: "2026-01-05",
    });
  });
});

describe("certificate dates", () => {
  it("expires AHA cards at month end two years on and Red Cross on the day", () => {
    expect(ahaExpiresOn("2026-01-31")).toBe("2028-01-31");
    expect(ahaExpiresOn("2026-09-13")).toBe("2028-09-30");
    expect(arcExpiresOn("2026-08-09")).toBe("2028-08-09");
    expect(arcExpiresOn("2028-02-29")).toBe("2030-02-28");
  });

  it("finds the reminder stage due today", () => {
    expect(reminderStage("2027-03-01", "2026-12-30")).toBeNull();
    expect(reminderStage("2027-03-01", "2027-01-01")).toBe(60);
    expect(reminderStage("2027-03-01", "2027-01-30")).toBe(30);
    expect(reminderStage("2027-03-01", "2027-03-01")).toBe(0);
    expect(reminderStage("2027-03-01", "2027-03-04")).toBe(0);
    expect(reminderStage("2027-03-01", "2027-03-05")).toBeNull();
  });
});

describe("roster matching", () => {
  const roster = [
    { id: "a", name: "Ava Stone", email: "ava@example.test" },
    { id: "b", name: "Ben Lee", email: "family@example.test" },
    { id: "c", name: "Cara Lee", email: "family@example.test" },
    { id: "d", name: "José Núñez", email: "jose@example.test" },
    { id: "e", name: "Sam Smith", email: "sam1@example.test" },
    { id: "f", name: "Sam Smith", email: "sam2@example.test" },
    { id: "g", name: "No Card", email: "nocard@example.test" },
  ];
  const row = (n: number, first: string, last: string, email: string) => ({
    row: n,
    firstName: first,
    lastName: last,
    email,
  });

  it("matches by email, then name, and flags the rest", () => {
    const { matches, withoutCertificate } = matchCertificateRows(
      [
        row(1, "Ava", "Stone", "AVA@example.test"),
        row(2, "Cara", "Lee", "family@example.test"),
        row(3, "Jose", "Nunez", "other@example.test"),
        row(4, "Sam", "Smith", "new@example.test"),
        row(5, "Zed", "Unknown", "zed@example.test"),
      ],
      roster
    );
    expect(matches.map((m) => [m.status, m.attendeeId ?? null])).toEqual([
      ["email", "a"],
      ["email", "c"],
      ["name", "d"],
      ["ambiguous", null],
      ["unmatched", null],
    ]);
    expect(matches[3]?.candidates).toEqual(["e", "f"]);
    expect(withoutCertificate).toEqual(["b", "e", "f", "g"]);
  });

  it("flags two certificates claiming the same attendee", () => {
    const { matches } = matchCertificateRows(
      [row(1, "Ava", "Stone", "ava@example.test"), row(2, "Ava", "Stone", "")],
      roster
    );
    expect(matches.map((m) => m.status)).toEqual(["ambiguous", "ambiguous"]);
    expect(matches[0]?.candidates).toEqual(["a"]);
  });
});

describe("certificate emails", () => {
  const issued = {
    kind: "issued" as const,
    firstName: "Ava",
    course: "BLS Provider",
    certificateId: "111122223333",
    issuedOn: "2026-09-13",
    expiresOn: "2028-09-30",
    instructor: "Sam Rivera",
    review: true,
    renewPath: "/courses/bls",
  };

  it("writes the AHA note with the eCard code, claim link, survey and review", () => {
    const mail = certificateEmail(
      { ...issued, agency: "aha" },
      "https://example.test"
    );
    expect(mail.subject).toBe("Your BLS Provider eCard is ready to claim");
    expect(mail.text).toContain("Hi Ava,");
    expect(mail.text).toContain("September 13, 2026");
    expect(mail.text).toContain("Your eCard code: 111122223333");
    expect(mail.text).toContain("https://ecards.heart.org/student/myecards");
    expect(mail.html).toContain(`href="${COURSE_SURVEY_URLS.aha}"`);
    expect(mail.html).toContain(`href="${GOOGLE_REVIEW_URL}"`);
    expect(mail.text).not.toContain(COURSE_SURVEY_URLS.arc ?? "none");
    expect(mail.unsubscribeUrl).toBeUndefined();
  });

  it("writes the Red Cross note with the certificate link and its fallback", () => {
    const mail = certificateEmail(
      { ...issued, agency: "arc", certificateId: "02AB0C1", review: false },
      "https://example.test"
    );
    expect(mail.text).toContain(
      "https://www.redcross.org/take-a-class/qrCode?certnumber=02AB0C1&size=wallet"
    );
    expect(mail.text).toContain(
      "https://www.redcross.org/take-a-class/digital-certificate"
    );
    expect(mail.text).toContain("Certificate ID: 02AB0C1");
    expect(mail.html).toContain(`href="${COURSE_SURVEY_URLS.arc}"`);
    expect(mail.text).not.toContain("Google");
  });

  it("puts a renewal link and an unsubscribe link in reminders", () => {
    const mail = certificateEmail(
      {
        ...issued,
        agency: "aha",
        kind: "reminder",
        review: false,
        today: "2028-08-31",
        unsubscribeToken: "tok",
      },
      "https://example.test"
    );
    expect(mail.subject).toBe(
      "Your BLS Provider certificate expires in 30 days"
    );
    expect(mail.text).toContain(
      "Book your renewal class: https://example.test/courses/bls"
    );
    expect(mail.unsubscribeUrl).toBe(
      "https://example.test/unsubscribe?token=tok"
    );
    expect(mail.html).toContain(
      "Unsubscribe from reminder and marketing emails"
    );
    expect(mail.text).not.toContain("survey");
  });
});

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    });
    const course = await ctx.db.insert("registrationCourses", {
      slug: "bls",
      title: "BLS",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      settings: {
        tuition: 0,
        materials: [],
        questions: [],
        outcomes: [],
        emails: [
          {
            id: "follow-up",
            anchor: "last",
            offsetMinutes: 60,
            subject: "Thanks",
            body: "Thanks for coming",
          },
        ],
        cutoffMinutes: 0,
      },
      enrollmentOpen: true,
      revision: 1,
    });
    const session = await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "BLS class",
      code: "bls-test",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 10,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "m",
          start: Date.now() + 86_400_000,
          end: Date.now() + 90_000_000,
          location: "Training center",
          instructions: "",
          sequence: 0,
        },
      ],
      firstStart: Date.now() + 86_400_000,
      lastEnd: Date.now() + 90_000_000,
      overrides: {},
      revision: 1,
      instructors: [],
      offerMinutes: 1440,
    });
    return { admin, course, session };
  });
  const adminClient = t.withIdentity({ subject: `${ids.admin}|session` });
  const attendee = (name: string, email: string) => ({
    name,
    email,
    selected: [],
    waived: [],
    answers: [],
  });
  await adminClient.mutation(api.registration.reserve, {
    courseId: ids.course,
    sessionId: ids.session,
    requestKey: crypto.randomUUID(),
    purchaser: "buyer@example.test",
    purchaserName: "Buyer",
    attendees: [
      attendee("Ava Stone", "ava@example.test"),
      attendee("Ben Lee", "ben@example.test"),
    ],
    admin: { overbook: false, reason: "test", payment: "waived" },
    cancellationPolicy: agreement,
  });
  await t.run((ctx) =>
    ctx.db.patch(ids.session, { lastEnd: Date.now() - 60_000 })
  );
  const seats = await t.run((ctx) =>
    ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_state", (q) =>
        q.eq("sessionId", ids.session).eq("state", "active")
      )
      .collect()
  );
  const seat = (email: string) => {
    const found = seats.find((s) => s.email === email);
    if (!found) {
      throw new Error(`missing seat ${email}`);
    }
    return found._id;
  };
  return { t, ...ids, adminClient, seat };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

function saveArgs(
  f: Fixture,
  rows: {
    email: string;
    first: string;
    last: string;
    id: string;
    issuedOn?: string;
    expiresOn?: string;
  }[],
  sha256 = "file-1",
  postClassEmail = true
) {
  return {
    target: { kind: "session" as const, id: f.session },
    agency: "aha" as const,
    course: "BLS Provider Course",
    file: {
      storageId: "" as Id<"_storage">,
      fileName: "eCards.xlsx",
      contentType: "application/vnd.ms-excel",
      size: 10,
      sha256,
    },
    rows: rows.map((row, index) => ({
      row: index + 2,
      firstName: row.first,
      lastName: row.last,
      email: row.email,
      certificateId: row.id,
      status: "Claimed",
      course: "BLS Provider Course",
      issuedOn: row.issuedOn ?? "2026-09-13",
      expiresOn: row.expiresOn ?? "2028-09-30",
      instructor: "Sam Rivera",
      attendeeId: f.seat(row.email),
    })),
    postClassEmail,
  };
}

async function save(f: Fixture, args: ReturnType<typeof saveArgs>) {
  const storageId = await f.t.run((ctx) =>
    ctx.storage.store(new Blob(["file"]))
  );
  return await f.adminClient.mutation(internal.studentCertificates.saveImport, {
    ...args,
    file: { ...args.file, storageId },
  });
}

const jobs = (f: Fixture, prefix: string) =>
  f.t.run(async (ctx) =>
    (await ctx.db.query("registrationJobs").collect()).filter((job) =>
      job.key.startsWith(prefix)
    )
  );

describe("saving certificates", () => {
  const ava = {
    email: "ava@example.test",
    first: "Ava",
    last: "Stone",
    id: "111122223333",
  };
  const ben = {
    email: "ben@example.test",
    first: "Ben",
    last: "Lee",
    id: "444455556666",
  };

  it("is idempotent across re-uploads of the same file", async () => {
    const f = await fixture();
    expect(await save(f, saveArgs(f, [ava, ben]))).toEqual({
      created: 2,
      updated: 0,
      emails: 2,
    });
    expect(await save(f, saveArgs(f, [ava, ben]))).toEqual({
      created: 0,
      updated: 2,
      emails: 0,
    });
    const counts = await f.t.run(async (ctx) => ({
      certificates: (await ctx.db.query("studentCertificates").collect())
        .length,
      imports: (await ctx.db.query("certificateImports").collect()).length,
      types: (await ctx.db.query("certificateTypes").collect()).length,
    }));
    expect(counts).toEqual({ certificates: 2, imports: 1, types: 1 });
    expect(await jobs(f, "certificate:")).toHaveLength(2);
    const mine = await f.t
      .withIdentity({ subject: `${f.admin}|session` })
      .query(api.studentCertificates.forStudent, {
        email: "AVA@example.test",
        paginationOpts: PAGE,
      });
    expect(mine.page.map((row) => row.certificateId)).toEqual(["111122223333"]);
  });

  it("saves without emails when staff opt the session out", async () => {
    const f = await fixture();
    expect(await save(f, saveArgs(f, [ava], "file-2", false))).toMatchObject({
      emails: 0,
    });
    expect(await jobs(f, "certificate:")).toHaveLength(0);
  });

  it("rejects attendees that are not on the session roster", async () => {
    const f = await fixture();
    const args = saveArgs(f, [ava]);
    const canceled = f.seat("ben@example.test");
    await f.t.run((ctx) => ctx.db.patch(canceled, { state: "canceled" }));
    const foreign = {
      ...args,
      rows: args.rows.map((row) => ({ ...row, attendeeId: canceled })),
    };
    await expect(save(f, foreign)).rejects.toThrow("not on this session");
  });
});

describe("post-class email selection", () => {
  const ava = {
    email: "ava@example.test",
    first: "Ava",
    last: "Stone",
    id: "111122223333",
  };

  async function stepJob(f: Fixture, seatId: Id<"registrationSeats">) {
    return await f.t.run((ctx) =>
      ctx.db.insert("registrationJobs", {
        key: `step:${seatId}:follow-up:1`,
        kind: "email",
        recipient: "ava@example.test",
        subject: "Thanks",
        body: "Thanks for coming",
        state: "pending",
        attempts: 0,
        due: Date.now(),
        seatId,
        sessionId: f.session,
        stepId: "follow-up",
        scheduleRevision: 1,
      })
    );
  }

  it("replaces the review letter for students who got a certificate email", async () => {
    const f = await fixture();
    await save(f, saveArgs(f, [ava]));
    const [certificateJob] = await jobs(f, "certificate:");
    const claimed = await f.t.mutation(internal.registrationMail.claim, {
      id: certificateJob?._id as Id<"registrationJobs">,
    });
    expect(claimed?.certificate).toMatchObject({
      kind: "issued",
      agency: "aha",
      certificateId: "111122223333",
      review: true,
      firstName: "Ava",
    });
    const letter = await stepJob(f, f.seat("ava@example.test"));
    expect(
      await f.t.mutation(internal.registrationMail.claim, { id: letter })
    ).toBeNull();
    expect((await f.t.run((ctx) => ctx.db.get(letter)))?.state).toBe(
      "canceled"
    );
    const fallback = await stepJob(f, f.seat("ben@example.test"));
    const sent = await f.t.mutation(internal.registrationMail.claim, {
      id: fallback,
    });
    expect(sent?.afterClass).toBe(true);
    expect(sent?.certificate).toBeUndefined();
  });

  it("drops the review ask when the review letter already went out", async () => {
    const f = await fixture();
    const letter = await stepJob(f, f.seat("ava@example.test"));
    await f.t.run((ctx) =>
      ctx.db.patch(letter, { state: "sent", sentAt: Date.now() })
    );
    await save(f, saveArgs(f, [ava]));
    const [certificateJob] = await jobs(f, "certificate:");
    const claimed = await f.t.mutation(internal.registrationMail.claim, {
      id: certificateJob?._id as Id<"registrationJobs">,
    });
    expect(claimed?.certificate?.review).toBe(false);
  });
});

describe("expiry reminders", () => {
  const ava = {
    email: "ava@example.test",
    first: "Ava",
    last: "Stone",
    id: "111122223333",
    issuedOn: "2025-01-10",
    expiresOn: "2027-01-31",
  };
  const run = (f: Fixture, today: string) =>
    f.t.mutation(internal.studentCertificates.runReminders, { today });

  it("sends each reminder once, at 60 and 30 days and on the day", async () => {
    const f = await fixture();
    await save(f, saveArgs(f, [ava], "old", false));
    expect(await run(f, "2026-11-01")).toBe(0);
    expect(await run(f, "2026-12-02")).toBe(1);
    expect(await run(f, "2026-12-03")).toBe(0);
    expect(await run(f, "2027-01-01")).toBe(1);
    expect(await run(f, "2027-01-15")).toBe(0);
    expect(await run(f, "2027-01-31")).toBe(1);
    expect(await run(f, "2027-02-01")).toBe(0);
    const keys = (await jobs(f, "certificate-reminder:")).map((job) =>
      job.key.split(":").at(-1)
    );
    expect(keys).toEqual(["60", "30", "0"]);
    const [first] = await jobs(f, "certificate-reminder:");
    const claimed = await f.t.mutation(internal.registrationMail.claim, {
      id: first?._id as Id<"registrationJobs">,
    });
    expect(claimed?.certificate).toMatchObject({
      kind: "reminder",
      renewPath: "/courses/bls",
    });
    expect(claimed?.certificate?.unsubscribeToken).toBeTruthy();
  });

  it("skips a late 60-day reminder once the 30-day window opens", async () => {
    const f = await fixture();
    await save(f, saveArgs(f, [ava], "old", false));
    expect(await run(f, "2027-01-20")).toBe(1);
    expect(await run(f, "2027-01-21")).toBe(0);
    const keys = (await jobs(f, "certificate-reminder:")).map((job) =>
      job.key.split(":").at(-1)
    );
    expect(keys).toEqual(["30"]);
  });

  it("stops reminders when a newer certificate of the same type arrives", async () => {
    const f = await fixture();
    await save(f, saveArgs(f, [ava], "old", false));
    expect(await run(f, "2026-12-02")).toBe(1);
    const renewal = {
      ...ava,
      id: "999988887777",
      issuedOn: "2026-12-05",
      expiresOn: "2028-12-31",
    };
    await save(f, saveArgs(f, [renewal], "new", false));
    const [pending] = await jobs(f, "certificate-reminder:");
    expect(
      await f.t.mutation(internal.registrationMail.claim, {
        id: pending?._id as Id<"registrationJobs">,
      })
    ).toBeNull();
    expect(await run(f, "2027-01-01")).toBe(0);
    const old = await f.t.run((ctx) =>
      ctx.db
        .query("studentCertificates")
        .withIndex("by_agency_and_certificateId", (q) =>
          q.eq("agency", "aha").eq("certificateId", "111122223333")
        )
        .unique()
    );
    expect(old?.supersededBy).toBeDefined();
  });

  it("honors unsubscribe for reminders, from the page or one-click", async () => {
    const f = await fixture();
    await save(f, saveArgs(f, [ava], "old", false));
    expect(await run(f, "2026-12-02")).toBe(1);
    const token = await f.t.run(
      async (ctx) =>
        (
          await ctx.db
            .query("emailPreferences")
            .withIndex("by_email", (q) => q.eq("email", "ava@example.test"))
            .unique()
        )?.token ?? ""
    );
    expect(await f.t.query(api.emailPreferences.status, { token })).toEqual({
      email: "av•@example.test",
      unsubscribed: false,
    });
    const response = await f.t.fetch(`/email/unsubscribe?token=${token}`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(
      (await f.t.query(api.emailPreferences.status, { token })).unsubscribed
    ).toBe(true);
    const [pending] = await jobs(f, "certificate-reminder:");
    expect(
      await f.t.mutation(internal.registrationMail.claim, {
        id: pending?._id as Id<"registrationJobs">,
      })
    ).toBeNull();
    expect(await run(f, "2027-01-01")).toBe(0);
    await f.t.mutation(api.emailPreferences.resubscribe, { token });
    expect(await run(f, "2027-01-01")).toBe(1);
    await expect(
      f.t.mutation(api.emailPreferences.unsubscribe, { token: "nope" })
    ).rejects.toThrow("not valid");
  });
});
