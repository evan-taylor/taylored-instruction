import { existsSync } from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getServiceToken } from "convex/server";
import { convexTest } from "convex-test";
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import { VERIFICATION_CHECKS } from "../../shared/registration/certificate-verification";
import { agreement } from "./fixtures/policy";

vi.mock("convex/server", async (original) => ({
  ...(await original<typeof import("convex/server")>()),
  getServiceToken: vi.fn(),
}));
vi.mock("unpdf", async (original) => {
  const actual = await original<typeof import("unpdf")>();
  return {
    ...actual,
    getDocumentProxy: vi.fn(actual.getDocumentProxy),
    renderPageAsImage: vi.fn(actual.renderPageAsImage),
  };
});

const modules = import.meta.glob("../../convex/**/*.ts");
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const JPEG_DATA_URL = /^data:image\/jpeg;base64,/u;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  // Scheduled verification runs only when a test calls it.
  vi.useFakeTimers();
  vi.mocked(getServiceToken).mockResolvedValue("gateway-token");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jevAnswers(probabilities: Partial<Record<string, number>> = {}) {
  return Response.json({
    id: "decision",
    model: "typesafe/jev-1.14",
    answers: Object.fromEntries(
      VERIFICATION_CHECKS.map((check) => [
        check.id,
        { type: "noul", noul: probabilities[check.id] ?? 0.97 },
      ])
    ),
  });
}

function png(width = 640, height = 480) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000";
  context.font = "28px sans-serif";
  context.fillText("Certificate of Completion", 40, 80);
  context.fillText("Jamie Example - HeartCode BLS", 40, 160);
  return new Uint8Array(canvas.toBuffer("image/png")).buffer;
}

/** Shaped like an openhtmltopdf export: landscape A4, text in non-embedded standard fonts. */
async function pdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([841.875, 595.275]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({
    x: 60,
    y: 120,
    width: 720,
    height: 410,
    borderWidth: 1.5,
  });
  const lines = [
    { text: "Certificate of Completion", y: 420, size: 28, font: regular },
    { text: "Jamie Example", y: 375, size: 26, font: bold },
    {
      text: "has successfully completed HeartCode BLS",
      y: 345,
      size: 14,
      font: regular,
    },
    { text: "Date Completed: 11/20/2026", y: 260, size: 14, font: regular },
  ];
  for (const line of lines) {
    page.drawText(line.text, {
      x: (841.875 - line.font.widthOfTextAtSize(line.text, line.size)) / 2,
      y: line.y,
      size: line.size,
      font: line.font,
    });
  }
  return new Uint8Array(await document.save()).buffer;
}

/** Upright when viewed, but drawn upside down on a page rotated 180°. */
async function upsideDownPdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([841.875, 595.275]);
  page.setRotation(degrees(180));
  const font = await document.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Certificate of Completion",
    "Jamie Example",
    "has successfully completed HeartCode BLS",
  ];
  for (const [index, text] of lines.entries()) {
    page.drawText(text, {
      x: 700,
      y: 200 + index * 50,
      size: 24,
      font,
      rotate: degrees(180),
    });
  }
  return new Uint8Array(await document.save()).buffer;
}

/** The PDF above as it rendered in production: border only, every line of text missing. */
function textlessRender() {
  const width = 1568;
  const height = Math.round((595.275 * 1568) / 841.875);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#000";
  context.lineWidth = 3;
  context.strokeRect(112, 140, 1341, 764);
  return new Uint8Array(canvas.toBuffer("image/png"));
}

/** A phone photo stored sideways: dark band on the left, EXIF orientation 6 (rotate 90° clockwise). */
function sidewaysPhoto() {
  const canvas = createCanvas(400, 200);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, 400, 200);
  context.fillStyle = "#000";
  context.fillRect(0, 0, 100, 200);
  const jpeg = canvas.toBuffer("image/jpeg");
  const exif = [
    ...new TextEncoder().encode("Exif\0\0"),
    ...[0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08],
    ...[0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01],
    ...[0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ];
  const length = exif.length + 2;
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe1,
    Math.floor(length / 256),
    length % 256,
    ...exif,
    ...jpeg.subarray(2),
  ]).buffer;
}

function photo(width: number, height: number, ink = true) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  if (ink) {
    context.fillStyle = "#000";
    context.font = `${Math.round(height / 12)}px sans-serif`;
    context.fillText("Certificate of Completion", width / 10, height / 3);
  }
  return new Uint8Array(canvas.toBuffer("image/jpeg")).buffer;
}

async function sentImage() {
  const body = JSON.parse(String(fetchMock.mock.calls.at(0)?.[1]?.body));
  const url: string = body.state[1].image_url.url;
  return await loadImage(
    Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
  );
}

async function fixture() {
  const t = convexTest(schema, modules);
  const address = "jamie@example.test";
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    });
    const instructor = await ctx.db.insert("users", {
      email: "teacher@example.test",
      emailVerificationTime: Date.now(),
    });
    const outsider = await ctx.db.insert("users", {
      email: "other@example.test",
      emailVerificationTime: Date.now(),
    });
    const student = await ctx.db.insert("users", {
      email: address,
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("profiles", { userId: instructor, isInstructor: true });
    await ctx.db.insert("profiles", { userId: outsider, isInstructor: true });
    const course = await ctx.db.insert("registrationCourses", {
      slug: "bls",
      title: "BLS Provider",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      settings: {
        tuition: 0,
        materials: [],
        questions: [],
        outcomes: [
          {
            id: "online",
            title: "HeartCode BLS",
            type: "category",
            options: ["Complete"],
            passingValue: "Complete",
            required: true,
            certificateRequired: true,
            version: 1,
          },
        ],
        emails: [
          {
            id: "certificate",
            anchor: "first",
            offsetMinutes: -60,
            subject: "Upload your certificate",
            body: "Bring proof of online completion.",
            onlyMissingCertificate: true,
          },
        ],
        cutoffMinutes: 0,
      },
      enrollmentOpen: true,
      revision: 1,
    });
    const session = await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "BLS skills session",
      code: "bls-skills",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 3,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "first",
          start: Date.now() + 86_400_000,
          end: Date.now() + 90_000_000,
          location: "Training center",
          instructions: "Private",
          sequence: 0,
        },
      ],
      firstStart: Date.now() + 86_400_000,
      lastEnd: Date.now() + 90_000_000,
      overrides: {},
      revision: 1,
      instructors: [instructor],
      offerMinutes: 1440,
    });
    return { admin, instructor, outsider, student, course, session };
  });
  const order = await t.mutation(api.registration.reserve, {
    courseId: ids.course,
    sessionId: ids.session,
    requestKey: crypto.randomUUID(),
    purchaser: "buyer@example.test",
    purchaserName: "Buyer",
    attendees: [
      {
        name: "Jamie Example",
        email: address,
        selected: [],
        waived: [],
        answers: [],
      },
    ],
    cancellationPolicy: agreement,
  });
  const adminClient = t.withIdentity({ subject: `${ids.admin}|session` });
  const [seat] = await adminClient.query(
    api.registrationOperations.orderSeats,
    { orderId: order.orderId }
  );
  if (!seat) {
    throw new Error("Expected the attendee");
  }
  const attendee = t.withIdentity({ subject: `${ids.student}|session` });
  const paginationOpts = { numItems: 10, cursor: null };
  const f = {
    t,
    ...ids,
    seatId: seat._id,
    adminClient,
    instructorClient: t.withIdentity({
      subject: `${ids.instructor}|session`,
    }),
    outsiderClient: t.withIdentity({ subject: `${ids.outsider}|session` }),
    attendee,
    upload: async (bytes: ArrayBuffer = png(), name = "heartcode.png") => {
      await attendee.action(api.registrationCertificates.upload, {
        seatId: seat._id,
        name,
        bytes,
      });
      const [file] = await t.run((ctx) =>
        ctx.db.query("registrationSessionFiles").collect()
      );
      if (!file) {
        throw new Error("Expected the uploaded file");
      }
      return file._id;
    },
    verify: (fileId: Id<"registrationSessionFiles">, attempt = 1) =>
      t.action(internal.certificateVerification.verify, { fileId, attempt }),
    file: (fileId: Id<"registrationSessionFiles">) =>
      t.run((ctx) => ctx.db.get(fileId)),
    portal: async () =>
      (
        await attendee.query(api.registrationPortal.registrations, {
          paginationOpts,
        })
      ).page.at(0)?.certificate,
    roster: async () =>
      (
        await adminClient.query(api.registrationOperations.roster, {
          sessionId: ids.session,
          paginationOpts,
        })
      ).page.at(0),
    analytics: async () =>
      (
        await t.run((ctx) =>
          ctx.db.system.query("_scheduled_functions").collect()
        )
      )
        .map((job) => job.args[0])
        .filter((args) => args?.event === "preclass_certificate_verified"),
  };
  return f;
}

it("holds an attendee's upload as verifying and passes it when Jev is confident on every check", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers());
  const fileId = await f.upload();

  expect(await f.portal()).toMatchObject({
    uploaded: true,
    review: "verifying",
  });
  expect(await f.roster()).toMatchObject({
    completion: "incomplete",
    certificate: { uploaded: true, review: "verifying" },
  });
  const scheduled = await f.t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(scheduled.map((job) => job.name)).toEqual(
    expect.arrayContaining([
      expect.stringContaining("certificateVerification"),
      expect.stringContaining("expireVerification"),
    ])
  );

  await f.verify(fileId);

  const [url, init] = fetchMock.mock.calls.at(0) ?? [];
  expect(url).toBe("https://ai-gateway.convex.dev/alpha/decisions");
  expect(init?.headers).toMatchObject({
    Authorization: "Bearer gateway-token",
    "TypeSafe-Danger-Zone-Images": "true",
  });
  const body = JSON.parse(String(init?.body));
  expect(body.model).toBe("typesafe/jev-1.14");
  expect(body.state[0]).toMatchObject({
    expected_course:
      "HeartCode BLS, the pre-class requirement for BLS Provider",
    attendee_name: "Jamie Example",
  });
  expect(body.state[0].today).toMatch(ISO_DATE);
  expect(body.state[1].image_url.url).toMatch(JPEG_DATA_URL);
  expect(Object.keys(body.questions)).toEqual(
    VERIFICATION_CHECKS.map((check) => check.id)
  );

  expect(await f.portal()).toEqual(
    expect.not.objectContaining({ review: expect.anything() })
  );
  expect(await f.roster()).toMatchObject({
    completion: "complete",
    certificate: {
      uploaded: true,
      file: { verification: { state: "auto_passed" } },
    },
  });
  expect((await f.file(fileId))?.verification).toMatchObject({
    state: "auto_passed",
    model: "typesafe/jev-1.14",
    threshold: 0.9,
    answers: VERIFICATION_CHECKS.map((check) => ({
      check: check.id,
      probability: 0.97,
    })),
    decidedAt: expect.any(Number),
  });
  expect(await f.analytics()).toEqual([
    {
      event: "preclass_certificate_verified",
      analytics: { distinctId: `certificate_verification:${fileId}` },
      properties: {
        course_id: f.course,
        class_session_id: f.session,
        result: "auto_passed",
      },
    },
  ]);
});

it("renders page one of a PDF certificate with its standard fonts and sends its text to Jev", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers());
  const fileId = await f.upload(await pdf(), "heartcode.pdf");
  await f.verify(fileId);

  const options = vi.mocked(getDocumentProxy).mock.calls.at(-1)?.[1];
  expect(
    existsSync(`${options?.standardFontDataUrl}LiberationSans-Regular.ttf`)
  ).toBe(true);
  const body = JSON.parse(String(fetchMock.mock.calls.at(0)?.[1]?.body));
  expect(body.state[1].image_url.url).toMatch(JPEG_DATA_URL);
  expect(body.state[0].certificate_text).toContain("Jamie Example");
  expect(body.state[0].certificate_text).toContain("HeartCode BLS");
  const image = await sentImage();
  expect(Math.max(image.width, image.height)).toBe(1568);
  expect((await f.file(fileId))?.verification?.state).toBe("auto_passed");
});

it("checks a PDF whose text is drawn upside down on a rotated page", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers());
  const fileId = await f.upload(await upsideDownPdf(), "heartcode.pdf");
  await f.verify(fileId);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect((await f.file(fileId))?.verification?.state).toBe("auto_passed");
});

it("sends a PDF whose text didn't render to review without asking Jev", async () => {
  const f = await fixture();
  vi.mocked(renderPageAsImage).mockResolvedValueOnce(textlessRender());
  const fileId = await f.upload(await pdf(), "heartcode.pdf");
  await f.verify(fileId);

  expect(fetchMock).not.toHaveBeenCalled();
  expect((await f.file(fileId))?.verification).toMatchObject({
    state: "needs_review",
    error: "render_failed",
  });
  const row = await f.roster();
  expect(row?.certificate?.file?.verification?.error).toBe("render_failed");
});

it("sends a blank photo to review without asking Jev", async () => {
  const f = await fixture();
  const fileId = await f.upload(photo(1200, 900, false), "blank.jpg");
  await f.verify(fileId);

  expect(fetchMock).not.toHaveBeenCalled();
  expect((await f.file(fileId))?.verification?.error).toBe("render_failed");
});

it("turns a sideways phone photo upright from its EXIF orientation", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers());
  await f.verify(await f.upload(sidewaysPhoto(), "photo.jpg"));

  const image = await sentImage();
  expect(image.height).toBeGreaterThan(image.width);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const [top] = context.getImageData(image.width / 2, 10, 1, 1).data;
  const [bottom] = context.getImageData(
    image.width / 2,
    image.height - 10,
    1,
    1
  ).data;
  expect(top).toBeLessThan(80);
  expect(bottom).toBeGreaterThan(200);
});

it("scales a full-resolution phone photo down to Jev's size limit", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers());
  await f.verify(await f.upload(photo(4032, 3024), "photo.jpg"));

  const image = await sentImage();
  expect([image.width, image.height]).toEqual([1568, 1176]);
});

it.each(VERIFICATION_CHECKS.map((check) => check.id))(
  "sends the upload to review when the %s check fails",
  async (failing) => {
    const f = await fixture();
    fetchMock.mockImplementation(async () => jevAnswers({ [failing]: 0.08 }));
    await f.verify(await f.upload());

    expect(await f.portal()).toMatchObject({ review: "needs_review" });
    const row = await f.roster();
    expect(row).toMatchObject({
      completion: "incomplete",
      certificate: { review: "needs_review" },
    });
    expect(
      row?.certificate?.file?.verification?.checks.filter(
        (check) => check.verdict !== "passed"
      )
    ).toEqual([
      expect.objectContaining({
        id: failing,
        verdict: "failed",
        probability: 0.08,
      }),
    ]);
    expect((await f.analytics()).at(0)?.properties.result).toBe("needs_review");
  }
);

it("sends an upload Jev is unsure about to review unless the threshold allows it", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers({ name: 0.72 }));
  await f.verify(await f.upload());
  expect(await f.roster()).toMatchObject({
    certificate: {
      review: "needs_review",
      file: {
        verification: {
          checks: expect.arrayContaining([
            expect.objectContaining({ id: "name", verdict: "uncertain" }),
          ]),
        },
      },
    },
  });

  const lenient = await fixture();
  vi.stubEnv("JEV_CONFIDENCE_THRESHOLD", "0.7");
  await lenient.verify(await lenient.upload());
  expect(await lenient.roster()).toMatchObject({ completion: "complete" });
});

it("retries transient gateway errors a bounded number of times, then sends the upload to review", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(
    async () => new Response("busy", { status: 503 })
  );
  const fileId = await f.upload();
  const attempts = async () =>
    (
      await f.t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect()
      )
    )
      .filter((job) => job.name.includes("certificateVerification"))
      .map((job) => ({
        attempt: job.args[0].attempt,
        delay: job.scheduledTime - job._creationTime,
      }));
  const retry = async (attempt: number) => {
    const job = (await attempts()).find((next) => next.attempt === attempt);
    if (job) {
      await f.verify(fileId, job.attempt);
    }
    return job?.delay;
  };

  await f.verify(fileId, 1);
  expect((await f.file(fileId))?.verification?.state).toBe("verifying");
  expect(await retry(2)).toBeCloseTo(30_000, -2);
  expect((await f.file(fileId))?.verification?.state).toBe("verifying");
  expect(await retry(3)).toBeCloseTo(120_000, -2);
  expect(await retry(4)).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect((await f.file(fileId))?.verification).toMatchObject({
    state: "needs_review",
    error: "gateway_error",
  });
  expect(await f.portal()).toMatchObject({ review: "needs_review" });
  expect((await f.analytics()).at(0)?.properties.result).toBe("error");
});

it("sends the upload to review when Jev leaves a check unanswered", async () => {
  const f = await fixture();
  fetchMock.mockResolvedValue(
    Response.json({
      answers: Object.fromEntries(
        VERIFICATION_CHECKS.filter((check) => check.id !== "date").map(
          (check) => [check.id, { type: "noul", noul: 0.97 }]
        )
      ),
    })
  );
  const fileId = await f.upload();

  await f.verify(fileId);
  expect((await f.file(fileId))?.verification).toMatchObject({
    state: "needs_review",
    error: "invalid_response",
  });
});

it("sends the upload to review when the class moves while Jev is checking it", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => {
    await f.t.run((ctx) =>
      ctx.db.patch(f.session, { firstStart: Date.now() + 8 * 86_400_000 })
    );
    return jevAnswers();
  });
  const fileId = await f.upload();

  await f.verify(fileId);
  expect((await f.file(fileId))?.verification?.state).toBe("needs_review");
  expect(await f.roster()).toMatchObject({ completion: "incomplete" });
});

it("sends the upload to review when the request times out or never finishes", async () => {
  const f = await fixture();
  fetchMock.mockRejectedValue(
    new DOMException("The operation timed out.", "TimeoutError")
  );
  const timedOut = await f.upload();
  await f.verify(timedOut, 3);
  expect((await f.file(timedOut))?.verification).toMatchObject({
    state: "needs_review",
    error: "timeout",
  });

  const stuck = await fixture();
  const fileId = await stuck.upload();
  await stuck.t.mutation(internal.registrationCertificates.expireVerification, {
    fileId,
  });
  expect((await stuck.file(fileId))?.verification).toMatchObject({
    state: "needs_review",
    error: "timeout",
  });
});

it("sends the upload to review without calling Jev when the gateway is unavailable", async () => {
  const f = await fixture();
  vi.mocked(getServiceToken).mockRejectedValue(new Error("AiGatewayDisabled"));
  const fileId = await f.upload();
  await f.verify(fileId);
  expect(fetchMock).not.toHaveBeenCalled();
  expect((await f.file(fileId))?.verification).toMatchObject({
    state: "needs_review",
    error: "gateway_unavailable",
  });
  expect(await f.roster()).toMatchObject({
    completion: "incomplete",
    certificate: { review: "needs_review" },
  });
});

it("sends an unreadable file to review", async () => {
  const f = await fixture();
  const fileId = await f.upload(
    new TextEncoder().encode("%PDF-1.7\n%%EOF").buffer,
    "broken.pdf"
  );
  await f.verify(fileId);
  expect(fetchMock).not.toHaveBeenCalled();
  expect((await f.file(fileId))?.verification).toMatchObject({
    state: "needs_review",
    error: "unsupported_file",
  });
});

it("lets staff approve an upload in review", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers({ genuine: 0.3 }));
  const fileId = await f.upload();
  await f.verify(fileId);

  await expect(
    f.outsiderClient.mutation(api.registrationCertificates.approve, { fileId })
  ).rejects.toThrow("Forbidden");
  await expect(
    f.attendee.mutation(api.registrationCertificates.approve, { fileId })
  ).rejects.toThrow();
  await f.instructorClient.mutation(api.registrationCertificates.approve, {
    fileId,
  });
  expect(await f.roster()).toMatchObject({
    completion: "complete",
    certificate: { file: { verification: { state: "approved" } } },
  });
  expect(await f.portal()).toEqual(
    expect.not.objectContaining({ review: expect.anything() })
  );
  expect((await f.file(fileId))?.verification).toMatchObject({
    reviewedBy: f.instructor,
    answers: expect.any(Array),
  });
  await expect(
    f.adminClient.mutation(api.registrationCertificates.approve, { fileId })
  ).rejects.toThrow("not awaiting review");
});

it("lets staff reject an upload, emails the attendee, and resumes upload reminders", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers({ course: 0.1 }));
  const fileId = await f.upload();
  await f.verify(fileId);

  const reminder = await f.t.run(async (ctx) =>
    (await ctx.db.query("registrationJobs").collect()).find(
      (job) => job.stepId === "certificate"
    )
  );
  if (!reminder) {
    throw new Error("Expected an upload reminder");
  }
  await f.adminClient.mutation(api.registrationCertificates.reject, { fileId });

  expect(await f.file(fileId)).toBeNull();
  expect(
    await f.t.run((ctx) => ctx.db.system.query("_storage").collect())
  ).toHaveLength(0);
  expect(await f.portal()).toEqual(
    expect.objectContaining({ uploaded: false })
  );
  expect(await f.roster()).toMatchObject({
    completion: "incomplete",
    certificate: { uploaded: false },
  });
  const email = await f.t.run(async (ctx) =>
    (await ctx.db.query("registrationJobs").collect()).find((job) =>
      job.key.startsWith("certificate-rejected:")
    )
  );
  expect(email).toMatchObject({
    recipient: "jamie@example.test",
    subject: "Please upload your HeartCode BLS certificate again",
    seatId: f.seatId,
    state: "pending",
  });
  expect(
    await f.t.mutation(internal.registrationMail.claim, { id: reminder._id })
  ).toMatchObject({ recipient: "jamie@example.test" });

  fetchMock.mockImplementation(async () => jevAnswers());
  await f.verify(await f.upload());
  expect(await f.roster()).toMatchObject({ completion: "complete" });
});

it("passes staff uploads without asking Jev", async () => {
  const f = await fixture();
  await f.adminClient.action(api.registrationCertificates.uploadForAttendee, {
    seatId: f.seatId,
    name: "heartcode.png",
    bytes: png(),
  });
  const [file] = await f.t.run((ctx) =>
    ctx.db.query("registrationSessionFiles").collect()
  );
  expect(file?.verification).toBeUndefined();
  expect(await f.roster()).toMatchObject({
    completion: "complete",
    certificate: { uploaded: true },
  });
  const scheduled = await f.t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(
    scheduled.some((job) => job.name.includes("certificateVerification"))
  ).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
