import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import { parseStudents } from "../../shared/registration/independent";

const modules = import.meta.glob("../../convex/**/*.ts");
const PAGE = { numItems: 100, cursor: null };
const DAY = 86_400_000;
const INDEPENDENT_TABLE = /independent(Sessions|Students|Activity)/u;
const SOURCE_FILE = /\.(ts|tsx)$/u;
let current: ReturnType<typeof convexTest> | null = null;

beforeEach(() => {
  vi.stubEnv("REGISTRATION_MODE", "test");
  vi.stubEnv("REGISTRATION_TEST_RECIPIENT", "safe@example.test");
  vi.stubEnv("AUTH_EMAIL_FROM", "Training <sender@example.test>");
  vi.stubEnv("SITE_URL", "https://preview.example.test");
  vi.stubEnv("RESEND_API_KEY", "re_local_mock_only");
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify({ id: "local-email" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  );
});
afterEach(async () => {
  if (current) {
    vi.useFakeTimers();
    try {
      await current.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }
    current = null;
  }
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const settings = {
  tuition: 10_000,
  materials: [],
  questions: [],
  outcomes: [
    {
      id: "skills",
      title: "Skills test",
      type: "category" as const,
      options: ["Pass", "Fail"],
      required: true,
      passingValue: "Pass",
      version: 1,
    },
    {
      id: "cert",
      title: "Certificate",
      type: "category" as const,
      options: ["Uploaded"],
      required: false,
      certificateRequired: true,
      version: 1,
    },
  ],
  emails: [],
  cutoffMinutes: 0,
};

async function world() {
  const t = convexTest(schema, modules);
  current = t;
  const ids = await t.run(async (ctx) => {
    const user = (email: string) =>
      ctx.db.insert("users", { email, emailVerificationTime: Date.now() });
    const admin = await user(ADMIN_EMAILS[0] ?? "");
    const alice = await user("alice@example.test");
    const bob = await user("bob@example.test");
    const employed = await user("employed@example.test");
    const student = await user("student@example.test");
    await ctx.db.insert("profiles", { userId: employed, isInstructor: true });
    const course = (slug: string, publication: "published" | "archived") =>
      ctx.db.insert("registrationCourses", {
        slug,
        title: slug.toUpperCase(),
        description: "Test",
        delivery: "scheduled",
        publication,
        settings,
        enrollmentOpen: true,
        revision: 1,
      });
    const bls = await course("bls", "published");
    const heartsaver = await course("heartsaver", "published");
    const archived = await course("old", "archived");
    const start = Date.now() + DAY;
    const ours = await ctx.db.insert("registrationSessions", {
      courseId: bls,
      title: "Our BLS class",
      code: "our-bls",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 20,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "m1",
          start,
          end: start + 4 * 3_600_000,
          location: "Our center",
          instructions: "",
          sequence: 0,
        },
      ],
      firstStart: start,
      lastEnd: start + 4 * 3_600_000,
      overrides: {},
      revision: 1,
      instructors: [employed],
      offerMinutes: 1440,
    });
    return {
      admin,
      alice,
      bob,
      employed,
      student,
      bls,
      heartsaver,
      archived,
      ours,
    };
  });
  const as = (id: Id<"users">) => t.withIdentity({ subject: `${id}|session` });
  const admin = as(ids.admin);
  async function align(
    id: Id<"users">,
    email: string,
    courseIds: Id<"registrationCourses">[]
  ) {
    await admin.mutation(api.instructorInvitations.invite, {
      teaches: false,
      email,
      courseIds,
    });
    await as(id).mutation(api.instructorInvitations.accept, {});
  }
  await align(ids.alice, "alice@example.test", [ids.bls]);
  await align(ids.bob, "bob@example.test", [ids.bls, ids.heartsaver]);
  const alice = as(ids.alice);
  const bob = as(ids.bob);
  const start = Date.now() + 2 * DAY;
  const sessionId = await alice.mutation(api.aligned.createSession, {
    courseId: ids.bls,
    start,
    end: start + 3 * 3_600_000,
    timeZone: "America/Los_Angeles",
    location: "Alice's fire station",
    instructorNames: [],
  });
  await alice.mutation(api.aligned.addStudents, {
    sessionId,
    students: [
      {
        firstName: "Jane",
        lastName: "Doe",
        email: "Jane@Example.test",
        phone: "555-0100",
      },
      { firstName: "Sam", lastName: "Lee", email: "sam@example.test" },
    ],
  });
  const roster = await alice.query(api.aligned.sessionDetail, { sessionId });
  const studentId = roster.students[0]?._id as Id<"independentStudents">;
  return { t, ids, as, admin, alice, bob, sessionId, studentId };
}

describe("aligned with our Training Site", () => {
  it("grants the portal and eCards without making them our instructor", async () => {
    const { t, ids, as, alice } = await world();
    const profile = await alice.query(api.profiles.getProfile, {});
    expect(profile).toMatchObject({ is_aligned: true, is_instructor: false });
    expect(await alice.query(api.products.getEcardProducts, {})).toEqual([]);
    const directory = await as(ids.admin).query(
      api.registrationOperations.staffDirectory,
      {}
    );
    expect(directory.map((d) => d.id)).not.toContain(ids.alice);
    expect(directory.map((d) => d.id)).toContain(ids.employed);
    await expect(
      as(ids.student).query(api.products.getEcardProducts, {})
    ).rejects.toThrow("Instructor access required");
    const sent = await t.run((ctx) =>
      ctx.db.query("instructorInvitations").collect()
    );
    expect(sent.every((row) => row.teaches === false && row.acceptedAt)).toBe(
      true
    );
  });

  it("only admins align, edit, and remove alignment; removing keeps oversight", async () => {
    const { ids, as, admin, alice, sessionId } = await world();
    await expect(
      alice.mutation(api.instructorInvitations.invite, {
        teaches: false,
        email: "friend@example.test",
        courseIds: [ids.bls],
      })
    ).rejects.toThrow("Admin access required");
    await expect(
      alice.mutation(api.aligned.setAlignment, {
        userId: ids.alice,
        courseIds: [ids.bls, ids.heartsaver],
      })
    ).rejects.toThrow("Admin access required");
    await expect(
      admin.mutation(api.instructorInvitations.invite, {
        teaches: false,
        email: "new@example.test",
        courseIds: [ids.archived],
      })
    ).rejects.toThrow("Course not available");
    await admin.mutation(api.aligned.setAlignment, {
      userId: ids.alice,
      courseIds: null,
    });
    await expect(
      alice.query(api.aligned.mySessions, { paginationOpts: PAGE })
    ).rejects.toThrow("Active aligned instructor access required");
    await expect(
      alice.query(api.aligned.sessionDetail, { sessionId })
    ).rejects.toThrow("Session not found");
    await expect(
      alice.query(api.products.getEcardProducts, {})
    ).rejects.toThrow();
    expect((await alice.query(api.profiles.getProfile, {}))?.is_aligned).toBe(
      false
    );
    const { page: oversight } = await admin.query(api.aligned.allSessions, {
      instructorId: ids.alice,
      paginationOpts: PAGE,
    });
    expect(oversight.map((s) => s._id)).toEqual([sessionId]);
    expect(oversight[0]?.owner.email).toBe("alice@example.test");
    await admin.mutation(api.aligned.setAlignment, {
      userId: ids.alice,
      courseIds: [ids.bls],
    });
    expect(
      (
        await as(ids.alice).query(api.aligned.mySessions, {
          paginationOpts: PAGE,
        })
      ).page
    ).toHaveLength(1);
  });

  it("keeps an employed-instructor invitation separate from alignment", async () => {
    const { ids, as, admin } = await world();
    await admin.mutation(api.instructorInvitations.invite, {
      email: "student@example.test",
    });
    await as(ids.student).mutation(api.instructorInvitations.accept, {});
    const profile = await as(ids.student).query(api.profiles.getProfile, {});
    expect(profile).toMatchObject({ is_instructor: true, is_aligned: false });
    await expect(
      as(ids.student).query(api.aligned.mySessions, { paginationOpts: PAGE })
    ).rejects.toThrow("Active aligned instructor access required");
  });
});

describe("aligned instructor boundaries", () => {
  it("limits session creation to their aligned courses", async () => {
    const { ids, alice } = await world();
    const start = Date.now() + DAY;
    await expect(
      alice.mutation(api.aligned.createSession, {
        courseId: ids.heartsaver,
        start,
        end: start + 3_600_000,
        timeZone: "America/Los_Angeles",
        location: "Somewhere",
        instructorNames: [],
      })
    ).rejects.toThrow("not aligned to teach this course");
    await expect(
      alice.mutation(api.aligned.createSession, {
        courseId: ids.bls,
        start,
        end: start - 1,
        timeZone: "America/Los_Angeles",
        location: "Somewhere",
        instructorNames: [],
      })
    ).rejects.toThrow("End time must be after");
  });

  it("cannot read or change another instructor's sessions or students", async () => {
    const { ids, bob, sessionId, studentId } = await world();
    const attempts = [
      bob.query(api.aligned.sessionDetail, { sessionId }),
      bob.query(api.aligned.sessionActivity, {
        sessionId,
        paginationOpts: PAGE,
      }),
      bob.mutation(api.aligned.updateSession, {
        sessionId,
        courseId: ids.bls,
        start: Date.now() + DAY,
        end: Date.now() + DAY + 3_600_000,
        timeZone: "America/Los_Angeles",
        location: "Taken over",
        instructorNames: [],
      }),
      bob.mutation(api.aligned.setCanceled, { sessionId, canceled: true }),
      bob.mutation(api.aligned.addStudents, {
        sessionId,
        students: [{ firstName: "X", lastName: "Y", email: "x@example.test" }],
      }),
      bob.mutation(api.aligned.updateStudent, {
        studentId,
        firstName: "Hacked",
        lastName: "Name",
        email: "jane@example.test",
        phone: "",
        evaluation: "",
        reason: "",
        additionalInformation: "",
      }),
      bob.mutation(api.aligned.removeStudent, { studentId }),
      bob.mutation(api.aligned.recordOutcome, {
        studentId,
        fieldId: "skills",
        value: "Pass",
      }),
      bob.mutation(api.aligned.setAttendance, {
        sessionId,
        studentIds: [studentId],
        status: "present",
      }),
    ];
    for (const attempt of await Promise.allSettled(attempts)) {
      expect(attempt.status).toBe("rejected");
      expect(String((attempt as PromiseRejectedResult).reason)).toContain(
        "Session not found"
      );
    }
    expect(
      (await bob.query(api.aligned.mySessions, { paginationOpts: PAGE })).page
    ).toEqual([]);
  });

  it("cannot move another session's students through their own session", async () => {
    const { ids, bob, studentId } = await world();
    const start = Date.now() + DAY;
    const own = await bob.mutation(api.aligned.createSession, {
      courseId: ids.heartsaver,
      start,
      end: start + 3_600_000,
      timeZone: "America/Chicago",
      location: "Bob's gym",
      instructorNames: ["Bob B"],
    });
    await expect(
      bob.mutation(api.aligned.setAttendance, {
        sessionId: own,
        studentIds: [studentId],
        status: "absent",
      })
    ).rejects.toThrow("Student not found");
  });

  it("cannot reach our sessions, rosters, orders, materials, revenue, or customers", async () => {
    const { ids, alice } = await world();
    const denied = [
      alice.query(api.registrationOperations.roster, {
        sessionId: ids.ours,
        paginationOpts: PAGE,
      }),
      alice.query(api.registrationOperations.exportRoster, {
        sessionId: ids.ours,
        paginationOpts: PAGE,
      }),
      alice.query(api.registrationOperations.sessionForStaff, {
        sessionId: ids.ours,
      }),
      alice.query(api.registrationOperations.assignedSessions, {
        paginationOpts: PAGE,
      }),
      alice.query(api.registrationOperations.orders, { paginationOpts: PAGE }),
      alice.query(api.registrationOperations.materials, {
        paginationOpts: PAGE,
      }),
      alice.query(api.registrationOperations.staffDirectory, {}),
      alice.query(api.registrationDashboard.summary, {}),
      alice.query(api.registrationDashboard.lookup, {
        email: "jane@example.test",
      }),
      alice.query(api.registration.sessions, { paginationOpts: PAGE }),
      alice.query(api.aligned.allSessions, { paginationOpts: PAGE }),
      alice.query(api.admin.getAllInstructors, {}),
      alice.query(api.instructorInvitations.list, {}),
    ];
    for (const attempt of await Promise.allSettled(denied)) {
      expect(attempt.status).toBe("rejected");
    }
  });
});

describe("independent rosters", () => {
  it("records attendance, results, and ARC fields with an audit trail", async () => {
    const { ids, admin, alice, sessionId, studentId } = await world();
    const before = await alice.query(api.aligned.sessionDetail, { sessionId });
    expect(before.session.outcomeDefinitions.map((d) => d.id)).toEqual([
      "skills",
    ]);
    expect(before.session.instructorNames).toEqual(["alice@example.test"]);
    expect(before.students.map((s) => s.email)).toEqual([
      "jane@example.test",
      "sam@example.test",
    ]);
    await expect(
      alice.mutation(api.aligned.addStudents, {
        sessionId,
        students: [
          { firstName: "J", lastName: "D", email: "JANE@example.test" },
        ],
      })
    ).rejects.toThrow("already on this roster");
    await alice.mutation(api.aligned.setAttendance, {
      sessionId,
      studentIds: before.students.map((s) => s._id),
      status: "present",
    });
    await alice.mutation(api.aligned.recordOutcome, {
      studentId,
      fieldId: "skills",
      value: "Pass",
    });
    await expect(
      alice.mutation(api.aligned.recordOutcome, {
        studentId,
        fieldId: "skills",
        value: "Maybe",
      })
    ).rejects.toThrow("Invalid outcome value");
    await alice.mutation(api.aligned.updateStudent, {
      studentId,
      firstName: "Jane",
      lastName: "Doe-Smith",
      email: "jane@example.test",
      phone: "555-0100",
      evaluation: "Successful",
      reason: "",
      additionalInformation: "",
    });
    const after = await admin.query(api.aligned.sessionDetail, { sessionId });
    const jane = after.students.find((s) => s._id === studentId);
    expect(jane).toMatchObject({
      lastName: "Doe-Smith",
      attendance: "present",
      evaluation: "Successful",
      completion: "complete",
    });
    expect(after.owner?.email).toBe("alice@example.test");
    const { page: log } = await admin.query(api.aligned.sessionActivity, {
      sessionId,
      paginationOpts: PAGE,
    });
    expect(log.map((row) => row.action)).toEqual([
      "student-edited",
      "outcome-edited",
      "attendance",
      "students-added",
      "session-created",
    ]);
    expect(log.every((row) => row.actor === "alice@example.test")).toBe(true);
    await alice.mutation(api.aligned.setCanceled, {
      sessionId,
      canceled: true,
    });
    await expect(
      alice.mutation(api.aligned.removeStudent, { studentId })
    ).rejects.toThrow("Restore the session");
    expect(ids.alice).toBeDefined();
  });

  it("stays out of every public, payment, revenue, and email path", async () => {
    const { t, ids, admin, alice, sessionId } = await world();
    const catalog = await t.query(api.registration.publicCatalog, {});
    expect(JSON.stringify(catalog)).not.toContain("Alice's fire station");
    expect(catalog.sessions.map((s) => s.code)).toEqual(["our-bls"]);
    const forCourse = await t.query(api.registration.publicCourseSessions, {
      courseId: ids.bls,
    });
    expect(forCourse.map((s) => s.code)).toEqual(["our-bls"]);
    const discovered = await t.query(api.registration.discover, {
      paginationOpts: PAGE,
    });
    expect(JSON.stringify(discovered)).not.toContain("fire station");
    const summary = await admin.query(api.registrationDashboard.summary, {});
    expect(summary).toMatchObject({
      revenue: 0,
      seatsSold: 0,
      ordersSettled: 0,
    });
    const orders = await admin.query(api.registrationOperations.orders, {
      paginationOpts: PAGE,
    });
    expect(orders.page).toEqual([]);
    const lookup = await admin.query(api.registrationDashboard.lookup, {
      email: "jane@example.test",
    });
    expect(JSON.stringify(lookup)).not.toContain(sessionId);
    await alice.mutation(api.aligned.setAttendance, {
      sessionId,
      studentIds: (
        await alice.query(api.aligned.sessionDetail, { sessionId })
      ).students.map((s) => s._id),
      status: "present",
    });
    const touched = await t.run(async (ctx) => ({
      orders: await ctx.db.query("registrationOrders").collect(),
      seats: await ctx.db.query("registrationSeats").collect(),
      jobs: await ctx.db.query("registrationJobs").collect(),
      entitlements: await ctx.db.query("registrationEntitlements").collect(),
      activity: await ctx.db.query("registrationActivity").collect(),
    }));
    expect(touched).toEqual({
      orders: [],
      seats: [],
      jobs: [],
      entitlements: [],
      activity: [],
    });
    expect(
      (globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls
        .length
    ).toBe(0);
  });
});

/** Only the aligned module and its UI may read independent tables. */
it("keeps independent tables out of registration, payment, and reporting code", () => {
  const allowed = new Set([
    "convex/aligned.ts",
    "convex/alignedSchema.ts",
    "convex/_generated/api.d.ts",
    "convex/_generated/dataModel.d.ts",
  ]);
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (
        SOURCE_FILE.test(name) &&
        !allowed.has(path) &&
        INDEPENDENT_TABLE.test(readFileSync(path, "utf8"))
      ) {
        offenders.push(path);
      }
    }
  };
  for (const dir of [
    "convex",
    "app/api",
    "lib",
    "app/sitemap.ts",
    "app/llms.txt",
  ]) {
    if (statSync(dir).isDirectory()) {
      walk(dir);
    } else if (INDEPENDENT_TABLE.test(readFileSync(dir, "utf8"))) {
      offenders.push(dir);
    }
  }
  expect(offenders).toEqual([]);
});

it("parses pasted rosters with names, emails, and phones in any order", () => {
  const rows = parseStudents(
    [
      "First name, Last name, Email",
      "Jane Doe, JANE@example.test, 555-123-4567",
      "sam@example.test\tSam\tLee",
      "Pat, pat@example.test",
      "No Email Person",
      "Old Student, old@example.test",
    ].join("\n"),
    ["old@example.test"]
  );
  expect(rows).toEqual([
    {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.test",
      phone: "555-123-4567",
    },
    { firstName: "Sam", lastName: "Lee", email: "sam@example.test", phone: "" },
    {
      firstName: "Pat",
      lastName: "",
      email: "pat@example.test",
      phone: "",
      issue: "Needs a first and last name",
    },
    {
      firstName: "No",
      lastName: "Email Person",
      email: "",
      phone: "",
      issue: "Missing email",
    },
    {
      firstName: "Old",
      lastName: "Student",
      email: "old@example.test",
      phone: "",
      issue: "Already on this roster",
    },
  ]);
});

describe("keeping independent records consistent", () => {
  it("keeps archived courses editable, clears results on a course change, and counts students", async () => {
    const { t, ids, bob, admin } = await world();
    const start = Date.now() + 3 * DAY;
    const input = {
      courseId: ids.bls,
      start,
      end: start + 3_600_000,
      timeZone: "America/Los_Angeles",
      location: "Bob's gym",
      instructorNames: [],
    };
    const sessionId = await bob.mutation(api.aligned.createSession, input);
    await bob.mutation(api.aligned.addStudents, {
      sessionId,
      students: [
        { firstName: "A", lastName: "One", email: "a@example.test" },
        { firstName: "B", lastName: "Two", email: "b@example.test" },
      ],
    });
    const roster = await bob.query(api.aligned.sessionDetail, { sessionId });
    const [first, second] = roster.students;
    await bob.mutation(api.aligned.removeStudent, {
      studentId: second?._id as Id<"independentStudents">,
    });
    await bob.mutation(api.aligned.recordOutcome, {
      studentId: first?._id as Id<"independentStudents">,
      fieldId: "skills",
      value: "Pass",
    });
    const { page } = await bob.query(api.aligned.mySessions, {
      paginationOpts: PAGE,
    });
    expect(page.find((s) => s._id === sessionId)?.studentCount).toBe(1);

    await t.run((ctx) => ctx.db.patch(ids.bls, { publication: "archived" }));
    await bob.mutation(api.aligned.updateSession, {
      sessionId,
      ...input,
      location: "Bob's new gym",
    });
    await expect(
      bob.mutation(api.aligned.createSession, input)
    ).rejects.toThrow("Course not available");

    await bob.mutation(api.aligned.updateSession, {
      sessionId,
      ...input,
      courseId: ids.heartsaver,
    });
    const moved = await bob.query(api.aligned.sessionDetail, { sessionId });
    expect(moved.session.title).toBe("HEARTSAVER");
    expect(moved.students[0]?.outcomes).toEqual([]);
    expect(moved.students[0]?.completion).not.toBe("complete");
    const { page: log } = await admin.query(api.aligned.sessionActivity, {
      sessionId,
      paginationOpts: PAGE,
    });
    expect(log[0]?.action).toBe("session-edited");
    expect(log[1]?.action).toBe("results-cleared");
  });

  it("pages through older sessions", async () => {
    const { alice } = await world();
    const first = await alice.query(api.aligned.mySessions, {
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(first.page).toHaveLength(1);
  });

  it("refuses to delete a course aligned instructors use", async () => {
    const { t, ids, admin } = await world();
    await expect(
      admin.mutation(api.registration.deleteCourse, { id: ids.heartsaver })
    ).rejects.toThrow("Aligned instructors use this template");
    const unused = await t.run((ctx) =>
      ctx.db.insert("registrationCourses", {
        slug: "unused",
        title: "UNUSED",
        description: "Test",
        delivery: "scheduled",
        publication: "published",
        settings,
        enrollmentOpen: true,
        revision: 1,
      })
    );
    await admin.mutation(api.registration.deleteCourse, { id: unused });
    expect(await t.run((ctx) => ctx.db.get(unused))).toBeNull();
  });

  it("shows approved courses on the pending invitation", async () => {
    const { t, ids, admin } = await world();
    const carol = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "carol@example.test",
        emailVerificationTime: Date.now(),
      })
    );
    await admin.mutation(api.instructorInvitations.invite, {
      teaches: false,
      email: "carol@example.test",
      courseIds: [ids.bls, ids.heartsaver],
    });
    const mine = await t
      .withIdentity({ subject: `${carol}|session` })
      .query(api.instructorInvitations.mine, {});
    expect(mine?.courses).toEqual(["BLS", "HEARTSAVER"]);
  });
});

it("strips quotes around pasted fields after trimming", () => {
  expect(parseStudents('"Jane Doe", "jane@example.test"', [])).toEqual([
    {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.test",
      phone: "",
    },
  ]);
});

it("keeps an invitation pending when its courses were archived", async () => {
  const { t, ids, admin } = await world();
  const dee = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "dee@example.test",
      emailVerificationTime: Date.now(),
    })
  );
  await admin.mutation(api.instructorInvitations.invite, {
    teaches: false,
    email: "dee@example.test",
    courseIds: [ids.heartsaver],
  });
  await t.run((ctx) =>
    ctx.db.patch(ids.heartsaver, { publication: "archived" })
  );
  const asDee = t.withIdentity({ subject: `${dee}|session` });
  await expect(
    asDee.mutation(api.instructorInvitations.accept, {})
  ).rejects.toThrow("no longer available");
  expect(await asDee.query(api.instructorInvitations.mine, {})).not.toBeNull();
});

describe("one instructor record", () => {
  it("teaches for us and is aligned on the same record, each removable alone", async () => {
    const { t, ids, as, admin } = await world();
    await admin.mutation(api.instructorInvitations.invite, {
      email: "student@example.test",
      teaches: true,
      courseIds: [ids.bls],
    });
    const both = as(ids.student);
    await both.mutation(api.instructorInvitations.accept, {});
    expect(await both.query(api.profiles.getProfile, {})).toMatchObject({
      is_instructor: true,
      is_aligned: true,
    });
    const profiles = await t.run((ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ids.student))
        .collect()
    );
    expect(profiles).toHaveLength(1);
    const staff = async () =>
      (await admin.query(api.registrationOperations.staffDirectory, {})).map(
        (row) => row.id
      );
    expect(await staff()).toContain(ids.student);
    const start = Date.now() + 5 * DAY;
    await both.mutation(api.aligned.createSession, {
      courseId: ids.bls,
      start,
      end: start + 3_600_000,
      timeZone: "America/Los_Angeles",
      location: "Station 7",
      instructorNames: [],
    });

    await admin.mutation(api.profiles.approveInstructor, {
      userId: ids.student,
      approve: false,
    });
    expect(await staff()).not.toContain(ids.student);
    expect(
      (await both.query(api.aligned.mySessions, { paginationOpts: PAGE })).page
    ).toHaveLength(1);
    expect(await both.query(api.products.getEcardProducts, {})).toEqual([]);

    await admin.mutation(api.profiles.approveInstructor, {
      userId: ids.student,
      approve: true,
    });
    await admin.mutation(api.profiles.deactivateUser, { userId: ids.student });
    expect(await both.query(api.profiles.getProfile, {})).toBeNull();
    expect(await staff()).not.toContain(ids.student);
    await expect(
      both.query(api.aligned.mySessions, { paginationOpts: PAGE })
    ).rejects.toThrow("Active aligned instructor access required");
  });

  it("lets staff mark an existing instructor aligned from their record", async () => {
    const { t, ids, as, admin, alice } = await world();
    const employed = as(ids.employed);
    await expect(
      employed.query(api.aligned.mySessions, { paginationOpts: PAGE })
    ).rejects.toThrow("Active aligned instructor access required");
    await expect(
      alice.mutation(api.aligned.setAlignment, {
        userId: ids.employed,
        courseIds: [ids.bls],
      })
    ).rejects.toThrow("Admin access required");
    await expect(
      admin.mutation(api.aligned.setAlignment, {
        userId: ids.student,
        courseIds: [ids.bls],
      })
    ).rejects.toThrow("No instructor record yet");
    await admin.mutation(api.aligned.setAlignment, {
      userId: ids.employed,
      courseIds: [ids.bls, ids.heartsaver],
    });
    expect(await employed.query(api.profiles.getProfile, {})).toMatchObject({
      is_instructor: true,
      is_aligned: true,
    });
    expect(
      (await employed.query(api.aligned.portal, {})).courses.map((c) => c.title)
    ).toEqual(["BLS", "HEARTSAVER"]);
    const row = (await admin.query(api.admin.getAllInstructors, {})).find(
      (r) => r.userId === ids.employed
    );
    expect(row?.is_instructor).toBe(true);
    expect(row?.alignment?.courses.map((c) => c.title)).toEqual([
      "BLS",
      "HEARTSAVER",
    ]);
    const audit = await t.run((ctx) =>
      ctx.db.query("registrationActivity").collect()
    );
    expect(audit.map((a) => a.action)).toContain("instructor-aligned");
    await expect(
      admin.mutation(api.instructorInvitations.invite, {
        email: "employed@example.test",
        courseIds: [ids.bls],
      })
    ).rejects.toThrow("already an approved instructor or aligned");
  });

  it("migrates legacy grants and invitations idempotently, with a dry run", async () => {
    const { t, ids } = await world();
    const legacy = await t.run(async (ctx) => {
      const erin = await ctx.db.insert("users", {
        email: "erin@example.test",
        emailVerificationTime: Date.now(),
      });
      await ctx.db.insert("alignedInstructors", {
        userId: erin,
        email: "erin@example.test",
        courseIds: [ids.heartsaver],
        grantedBy: ids.admin,
        grantedAt: 1000,
      });
      await ctx.db.insert("alignedInstructors", {
        userId: ids.employed,
        email: "employed@example.test",
        courseIds: [ids.bls],
        grantedBy: ids.admin,
        grantedAt: 2000,
      });
      await ctx.db.insert("alignedInstructors", {
        userId: ids.student,
        email: "student@example.test",
        courseIds: [ids.bls],
        grantedBy: ids.admin,
        grantedAt: 3000,
        revokedAt: 4000,
      });
      await ctx.db.insert("instructorInvitations", {
        email: "pending@example.test",
        invitedBy: ids.admin,
        createdAt: 5000,
        kind: "aligned",
        courseIds: [ids.bls],
      });
      return { erin };
    });
    const snapshot = () =>
      t.run(async (ctx) => ({
        grants: (await ctx.db.query("alignedInstructors").collect()).length,
        profiles: await ctx.db.query("profiles").collect(),
        invitations: (
          await ctx.db.query("instructorInvitations").collect()
        ).map(({ email, kind, teaches, courseIds }) => ({
          email,
          kind,
          teaches,
          courseIds,
        })),
      }));
    const before = await snapshot();
    const dry = await t.mutation(internal.alignmentMigration.run, {
      dryRun: true,
    });
    expect(dry).toMatchObject({
      dryRun: true,
      aligned: ["erin@example.test", "employed@example.test"],
      skippedRevoked: ["student@example.test"],
      createdProfiles: ["erin@example.test"],
      invitations: ["pending@example.test"],
    });
    expect(await snapshot()).toEqual(before);

    await t.mutation(internal.alignmentMigration.run, { dryRun: false });
    const after = await snapshot();
    expect(after.grants).toBe(0);
    const byUser = new Map(after.profiles.map((p) => [p.userId, p]));
    expect(byUser.get(legacy.erin)).toMatchObject({
      isInstructor: false,
      alignment: { courseIds: [ids.heartsaver], since: 1000, by: ids.admin },
    });
    expect(byUser.get(ids.employed)).toMatchObject({ isInstructor: true });
    expect(byUser.get(ids.employed)?.alignment?.courseIds).toEqual([ids.bls]);
    expect(byUser.get(ids.student)).toBeUndefined();
    const pending = after.invitations.find(
      (i) => i.email === "pending@example.test"
    );
    expect(pending?.teaches).toBe(false);
    expect(pending?.kind).toBeUndefined();

    expect(
      await t.mutation(internal.alignmentMigration.run, { dryRun: false })
    ).toEqual({
      dryRun: false,
      aligned: [],
      skippedRevoked: [],
      createdProfiles: [],
      invitations: [],
    });
    expect(await snapshot()).toEqual(after);
  });
});
