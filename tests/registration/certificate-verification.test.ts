import { createCanvas } from "@napi-rs/canvas";
import { getServiceToken } from "convex/server";
import { convexTest } from "convex-test";
import { PDFDocument, StandardFonts } from "pdf-lib";
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

async function pdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  page.drawText("Certificate of Completion: HeartCode BLS", {
    x: 60,
    y: 700,
    size: 18,
    font: await document.embedFont(StandardFonts.Helvetica),
  });
  return new Uint8Array(await document.save()).buffer;
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

it("renders page one of a PDF certificate to an image for Jev", async () => {
  const f = await fixture();
  fetchMock.mockImplementation(async () => jevAnswers());
  const fileId = await f.upload(await pdf(), "heartcode.pdf");
  await f.verify(fileId);
  const body = JSON.parse(String(fetchMock.mock.calls.at(0)?.[1]?.body));
  expect(body.state[1].image_url.url).toMatch(JPEG_DATA_URL);
  expect((await f.file(fileId))?.verification?.state).toBe("auto_passed");
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
