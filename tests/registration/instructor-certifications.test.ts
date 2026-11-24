import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import {
  addDays,
  certificationStatus,
  certificationToday,
  dueReminderThreshold,
  expiringCounts,
  filterCertifications,
  instructorsMissing,
  supersededIds,
} from "../../shared/instructor-certifications";

const modules = import.meta.glob("../../convex/**/*.ts");
const SAFE = "safe@example.test";
const TODAY = "2027-03-01";

let current: ReturnType<typeof convexTest> | null = null;

async function drain(t: ReturnType<typeof convexTest>) {
  vi.useFakeTimers();
  try {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
}

beforeEach(() => {
  vi.stubEnv("REGISTRATION_MODE", "test");
  vi.stubEnv("REGISTRATION_TEST_RECIPIENT", SAFE);
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
    await drain(current);
    current = null;
  }
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const bls = {
  agency: "aha" as const,
  type: "bls-instructor",
  number: "AHA-1",
  issuedOn: "2025-03-01",
};

async function world() {
  const t = convexTest(schema, modules);
  current = t;
  const ids = await t.run(async (ctx) => {
    const user = (email: string, firstName?: string) =>
      ctx.db.insert("users", {
        email,
        firstName,
        emailVerificationTime: Date.now(),
      });
    const admin = await user(ADMIN_EMAILS[0], "Admin");
    const ana = await user("ana@example.test", "Ana");
    const ben = await user("ben@example.test", "Ben");
    const student = await user("student@example.test", "Stu");
    const former = await user("former@example.test", "Former");
    await Promise.all(
      [ana, ben].map((userId) =>
        ctx.db.insert("profiles", { userId, isInstructor: true })
      )
    );
    await ctx.db.insert("profiles", {
      userId: former,
      isInstructor: true,
      deactivatedAt: "2026-01-01T00:00:00.000Z",
    });
    return { admin, ana, ben, student, former };
  });
  const as = (id: string) => t.withIdentity({ subject: `${id}|session` });
  return {
    t,
    ids,
    admin: as(ids.admin),
    ana: as(ids.ana),
    ben: as(ids.ben),
    student: as(ids.student),
    former: as(ids.former),
    reminders: () =>
      t.run((ctx) =>
        ctx.db.query("instructorCertificationReminders").collect()
      ),
    activity: () =>
      t.run((ctx) => ctx.db.query("instructorCertificationActivity").collect()),
  };
}

function sentTo() {
  return vi.mocked(globalThis.fetch).mock.calls.map(([, init]) => {
    const body = JSON.parse(String((init as RequestInit).body));
    return { to: body.to as string[], subject: body.subject as string };
  });
}

describe("status calculations", () => {
  it("is valid through the expiration date and expired the day after", () => {
    expect(certificationStatus("2027-03-01", TODAY)).toBe("expiring");
    expect(certificationStatus("2027-02-28", TODAY)).toBe("expired");
    expect(certificationStatus(addDays(TODAY, 90), TODAY)).toBe("expiring");
    expect(certificationStatus(addDays(TODAY, 91), TODAY)).toBe("valid");
    expect(certificationStatus(addDays(TODAY, 45), TODAY, 30)).toBe("valid");
  });

  it("owes the most urgent threshold reached and nothing long after expiry", () => {
    const due = (days: number) =>
      dueReminderThreshold(addDays(TODAY, days), TODAY);
    expect(due(120)).toBeNull();
    expect(due(91)).toBeNull();
    expect(due(90)).toBe(90);
    expect(due(31)).toBe(90);
    expect(due(30)).toBe(30);
    expect(due(20)).toBe(30);
    expect(due(7)).toBe(7);
    expect(due(1)).toBe(7);
    expect(due(0)).toBe(0);
    expect(due(-7)).toBe(0);
    expect(due(-8)).toBeNull();
  });

  it("handles month ends and leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(certificationToday(Date.parse("2027-03-02T07:30:00Z"))).toBe(
      "2027-03-01"
    );
  });

  it("filters the report and finds instructors missing a type", () => {
    const rows = [
      {
        userId: "a",
        agency: "aha",
        type: "bls-instructor",
        expiresOn: addDays(TODAY, 10),
      },
      {
        userId: "b",
        agency: "arc",
        type: "bls-instructor",
        expiresOn: addDays(TODAY, -1),
      },
      {
        userId: "b",
        agency: "arc",
        type: "lifeguarding-instructor",
        expiresOn: addDays(TODAY, 400),
      },
      {
        userId: "c",
        agency: "arc",
        type: "bls-instructor",
        expiresOn: addDays(TODAY, -30),
        superseded: true,
      },
    ];
    const base = { withinDays: 30 };
    expect(
      filterCertifications(rows, { ...base, status: "expiring" }, TODAY)
    ).toHaveLength(1);
    expect(
      filterCertifications(rows, { ...base, status: "expired" }, TODAY)
    ).toEqual([rows[1]]);
    expect(
      filterCertifications(rows, { ...base, status: "valid" }, TODAY)
    ).toEqual([rows[2]]);
    expect(
      filterCertifications(rows, { ...base, status: "all" }, TODAY)
    ).toHaveLength(4);
    expect(
      filterCertifications(rows, { ...base, agency: "arc", userId: "b" }, TODAY)
    ).toHaveLength(2);
    expect(
      filterCertifications(rows, { withinDays: 5, status: "expiring" }, TODAY)
    ).toHaveLength(0);
    const people = [
      { userId: "a" },
      { userId: "b" },
      { userId: "c" },
      { userId: "d" },
    ];
    expect(
      instructorsMissing(people, rows, "bls-instructor", TODAY).map(
        (p) => p.userId
      )
    ).toEqual(["b", "c", "d"]);
    expect(
      instructorsMissing(people, rows, "bls-instructor", TODAY, "aha").map(
        (p) => p.userId
      )
    ).toEqual(["b", "c", "d"]);
    expect(
      instructorsMissing(people, rows, "lifeguarding-instructor", TODAY).map(
        (p) => p.userId
      )
    ).toEqual(["a", "c", "d"]);
  });

  it("retires an older card once a newer one of the same kind is added", () => {
    const ids = supersededIds([
      {
        id: "old",
        userId: "a",
        agency: "aha",
        type: "bls-instructor",
        expiresOn: "2026-01-01",
      },
      {
        id: "new",
        userId: "a",
        agency: "aha",
        type: "bls-instructor",
        expiresOn: "2028-01-01",
      },
      {
        id: "arc",
        userId: "a",
        agency: "arc",
        type: "bls-instructor",
        expiresOn: "2026-01-01",
      },
      {
        id: "x",
        userId: "a",
        agency: "aha",
        type: "other",
        typeOther: "ACLS",
        expiresOn: "2026-01-01",
      },
      {
        id: "y",
        userId: "a",
        agency: "aha",
        type: "other",
        typeOther: "PALS",
        expiresOn: "2027-01-01",
      },
    ]);
    expect([...ids]).toEqual(["old"]);
    expect(
      expiringCounts(
        [
          addDays(TODAY, -1),
          addDays(TODAY, 30),
          addDays(TODAY, 31),
          addDays(TODAY, 61),
          addDays(TODAY, 91),
        ],
        TODAY
      )
    ).toEqual({ expired: 1, within30: 1, within60: 2, within90: 3 });
  });
});

describe("reminder schedule", () => {
  it("sends each threshold once, never twice on rerun, only to the test mailbox", async () => {
    const w = await world();
    const expiresOn = addDays(TODAY, 90);
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn,
    });
    const run = async (day: string) => {
      const queued = await w.t.mutation(
        internal.instructorCertifications.runReminders,
        { today: day }
      );
      await drain(w.t);
      return queued;
    };
    expect(await run(TODAY)).toBe(1);
    expect(await run(TODAY)).toBe(0);
    expect(await run(addDays(TODAY, 1))).toBe(0);
    expect(await run(addDays(TODAY, 59))).toBe(0);
    expect(await run(addDays(TODAY, 60))).toBe(1);
    expect(await run(addDays(TODAY, 60))).toBe(0);
    expect(await run(addDays(TODAY, 83))).toBe(1);
    expect(await run(addDays(TODAY, 84))).toBe(0);
    expect(await run(expiresOn)).toBe(1);
    expect(await run(expiresOn)).toBe(0);
    expect(await run(addDays(expiresOn, 3))).toBe(0);
    const reminders = await w.reminders();
    expect(reminders.map((r) => [r.threshold, r.state, r.attempts])).toEqual([
      [90, "sent", 1],
      [30, "sent", 1],
      [7, "sent", 1],
      [0, "sent", 1],
    ]);
    expect(reminders.every((r) => r.recipient === "ana@example.test")).toBe(
      true
    );
    expect(reminders.every((r) => r.deliveredTo === SAFE)).toBe(true);
    const mail = sentTo();
    expect(mail).toHaveLength(4);
    expect(mail.every((m) => m.to.length === 1 && m.to[0] === SAFE)).toBe(true);
  });

  it("skips thresholds already passed when a card is added late", async () => {
    const w = await world();
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 20),
    });
    await w.t.mutation(internal.instructorCertifications.runReminders, {
      today: TODAY,
    });
    await drain(w.t);
    expect((await w.reminders()).map((r) => r.threshold)).toEqual([30]);
  });

  it("resets reminders when the expiration date is renewed", async () => {
    const w = await world();
    const id = await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 7),
    });
    await w.t.mutation(internal.instructorCertifications.runReminders, {
      today: TODAY,
    });
    await drain(w.t);
    const renewed = addDays(TODAY, 30);
    await w.ana.mutation(api.instructorCertifications.save, {
      id,
      ...bls,
      expiresOn: renewed,
    });
    expect(
      await w.t.mutation(internal.instructorCertifications.runReminders, {
        today: TODAY,
      })
    ).toBe(1);
    await drain(w.t);
    expect(
      (await w.reminders()).map((r) => [r.expiresOn, r.threshold, r.state])
    ).toEqual([
      [addDays(TODAY, 7), 7, "sent"],
      [renewed, 30, "sent"],
    ]);
    expect((await w.activity()).map((a) => a.action)).toEqual([
      "added",
      "renewed",
    ]);
  });

  it("cancels a queued reminder if the card is renewed before it sends", async () => {
    const w = await world();
    const id = await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 7),
    });
    await w.t.mutation(internal.instructorCertifications.runReminders, {
      today: TODAY,
    });
    await w.ana.mutation(api.instructorCertifications.save, {
      id,
      ...bls,
      expiresOn: addDays(TODAY, 700),
    });
    await drain(w.t);
    expect((await w.reminders()).map((r) => r.state)).toEqual(["canceled"]);
    expect(sentTo()).toHaveLength(0);
  });

  it("stops reminding about an old card once a newer one is added", async () => {
    const w = await world();
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 7),
    });
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 700),
    });
    expect(
      await w.t.mutation(internal.instructorCertifications.runReminders, {
        today: TODAY,
      })
    ).toBe(0);
  });

  it("does not remind deactivated instructors and retries failed sends", async () => {
    const w = await world();
    await w.t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("instructorCertifications", {
        ...bls,
        userId: w.ids.former,
        expiresOn: TODAY,
        createdAt: now,
        createdBy: w.ids.former,
        updatedAt: now,
        updatedBy: w.ids.former,
      });
    });
    expect(
      await w.t.mutation(internal.instructorCertifications.runReminders, {
        today: TODAY,
      })
    ).toBe(0);
    await w.ben.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: TODAY,
    });
    vi.mocked(globalThis.fetch).mockImplementationOnce(
      async () => new Response("down", { status: 500 })
    );
    await w.t.mutation(internal.instructorCertifications.runReminders, {
      today: TODAY,
    });
    await drain(w.t);
    expect((await w.reminders()).map((r) => r.state)).toEqual(["failed"]);
    expect(
      await w.t.mutation(internal.instructorCertifications.runReminders, {
        today: TODAY,
      })
    ).toBe(1);
    await drain(w.t);
    expect((await w.reminders()).map((r) => [r.state, r.attempts])).toEqual([
      ["sent", 2],
    ]);
  });
});

describe("weekly staff digest", () => {
  it("sends once per week to the staff address and skips quiet weeks", async () => {
    const w = await world();
    expect(
      await w.t.mutation(internal.instructorCertifications.runDigest, {
        today: TODAY,
      })
    ).toBe(0);
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 45),
    });
    await w.ben.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, -3),
    });
    await w.ben.mutation(api.instructorCertifications.save, {
      ...bls,
      agency: "arc",
      type: "lifeguarding-instructor",
      expiresOn: addDays(TODAY, 300),
    });
    expect(
      await w.t.mutation(internal.instructorCertifications.runDigest, {
        today: TODAY,
      })
    ).toBe(2);
    expect(
      await w.t.mutation(internal.instructorCertifications.runDigest, {
        today: TODAY,
      })
    ).toBe(0);
    await drain(w.t);
    const digests = await w.t.run((ctx) =>
      ctx.db.query("instructorCertificationDigests").collect()
    );
    expect(digests.map((d) => [d.recipient, d.state, d.count])).toEqual([
      [ADMIN_EMAILS[0], "sent", 2],
    ]);
    expect(sentTo()).toEqual([
      {
        to: [SAFE],
        subject:
          "Instructor certifications: 1 expiring within 90 days, 1 expired",
      },
    ]);
  });
});

describe("permissions", () => {
  it("lets instructors see and edit only their own certifications", async () => {
    const w = await world();
    const anaCert = await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: "2028-01-01",
    });
    await w.ben.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: "2028-06-01",
    });
    const mine = await w.ana.query(api.instructorCertifications.mine, {});
    expect(mine?.certifications.map((c) => c.userId)).toEqual([w.ids.ana]);
    const blocked = "Forbidden";
    await expect(
      w.ben.mutation(api.instructorCertifications.save, {
        id: anaCert,
        ...bls,
        expiresOn: "2030-01-01",
      })
    ).rejects.toThrow(blocked);
    await expect(
      w.ben.mutation(api.instructorCertifications.remove, { id: anaCert })
    ).rejects.toThrow(blocked);
    await expect(
      w.ben.mutation(api.instructorCertifications.removeCard, { id: anaCert })
    ).rejects.toThrow(blocked);
    await expect(
      w.ben.mutation(api.instructorCertifications.save, {
        userId: w.ids.ana,
        ...bls,
        expiresOn: "2030-01-01",
      })
    ).rejects.toThrow(blocked);
    await expect(
      w.ben.action(api.instructorCertifications.uploadCard, {
        id: anaCert,
        name: "card.pdf",
        bytes: new TextEncoder().encode("%PDF-1.4").buffer,
      })
    ).rejects.toThrow(blocked);
    await expect(
      w.ana.query(api.instructorCertifications.report, {})
    ).rejects.toThrow("Admin access required");
    await expect(
      w.ana.query(api.instructorCertifications.expiringSummary, {})
    ).rejects.toThrow("Admin access required");
    await expect(
      w.ana.query(api.instructorCertifications.forInstructor, {
        userId: w.ids.ben,
      })
    ).rejects.toThrow("Admin access required");
    await expect(
      w.ana.mutation(api.instructorCertifications.setVerified, {
        id: anaCert,
        verified: true,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("keeps students and deactivated instructors out", async () => {
    const w = await world();
    expect(
      await w.student.query(api.instructorCertifications.mine, {})
    ).toBeNull();
    expect(
      await w.former.query(api.instructorCertifications.mine, {})
    ).toBeNull();
    expect(await w.t.query(api.instructorCertifications.mine, {})).toBeNull();
    await expect(
      w.student.mutation(api.instructorCertifications.save, {
        ...bls,
        expiresOn: "2028-01-01",
      })
    ).rejects.toThrow("Forbidden");
    await expect(
      w.former.mutation(api.instructorCertifications.save, {
        ...bls,
        expiresOn: "2028-01-01",
      })
    ).rejects.toThrow("Forbidden");
    await expect(
      w.admin.mutation(api.instructorCertifications.save, {
        userId: w.ids.student,
        ...bls,
        expiresOn: "2028-01-01",
      })
    ).rejects.toThrow("not an active instructor");
  });

  it("lets staff see everyone, act for an instructor, verify, and audit", async () => {
    const w = await world();
    const anaCert = await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: "2028-01-01",
    });
    const benCert = await w.admin.mutation(api.instructorCertifications.save, {
      userId: w.ids.ben,
      ...bls,
      agency: "arc",
      type: "other",
      typeOther: "Basic Water Rescue Instructor",
      expiresOn: "2027-06-01",
    });
    const report = await w.admin.query(api.instructorCertifications.report, {});
    expect(report.instructors.map((i) => i.name)).toEqual(["Ana", "Ben"]);
    expect(report.certifications.map((c) => c.id).sort()).toEqual(
      [anaCert, benCert].sort()
    );
    expect(
      (await w.ben.query(api.instructorCertifications.mine, {}))
        ?.certifications[0]?.id
    ).toBe(benCert);

    await w.admin.mutation(api.instructorCertifications.setVerified, {
      id: anaCert,
      verified: true,
    });
    const verified = await w.ana.query(api.instructorCertifications.mine, {});
    expect(verified?.certifications[0]?.verified?.by).toBe("Admin");
    await w.ana.mutation(api.instructorCertifications.save, {
      id: anaCert,
      ...bls,
      number: "AHA-2",
      expiresOn: "2028-01-01",
    });
    expect(
      (await w.ana.query(api.instructorCertifications.mine, {}))
        ?.certifications[0]?.verified
    ).toBeNull();

    await w.admin.mutation(api.instructorCertifications.remove, {
      id: benCert,
    });
    const history = await w.admin.query(
      api.instructorCertifications.forInstructor,
      { userId: w.ids.ana }
    );
    expect(history.activity.map((a) => [a.action, a.actor])).toEqual([
      ["updated", "Ana"],
      ["verified", "Admin"],
      ["added", "Ana"],
    ]);
    expect(history.activity[0]?.detail).toContain("staff verification cleared");
    expect(
      (await w.activity())
        .filter((a) => a.userId === w.ids.ben)
        .map((a) => a.action)
    ).toEqual(["added", "removed"]);
  });

  it("validates input", async () => {
    const w = await world();
    const save = (extra: object) =>
      w.ana.mutation(api.instructorCertifications.save, {
        ...bls,
        expiresOn: "2028-01-01",
        ...extra,
      });
    await expect(save({ expiresOn: "2025-01-01" })).rejects.toThrow(
      "after the issue date"
    );
    await expect(save({ expiresOn: "2028-02-30" })).rejects.toThrow(
      "valid issue and expiration"
    );
    await expect(save({ type: "astronaut" })).rejects.toThrow(
      "certification type"
    );
    await expect(save({ agency: "other" })).rejects.toThrow(
      "Name the certifying agency"
    );
    await expect(save({ type: "other" })).rejects.toThrow(
      "Name the certification"
    );
  });

  it("stores a card only when the file really is a PDF or image", async () => {
    const w = await world();
    const id = await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: "2028-01-01",
    });
    await expect(
      w.ana.action(api.instructorCertifications.uploadCard, {
        id,
        name: "card.pdf",
        bytes: new TextEncoder().encode("hello").buffer,
      })
    ).rejects.toThrow("PDF, JPEG, or PNG");
    await w.ana.action(api.instructorCertifications.uploadCard, {
      id,
      name: "card.pdf",
      bytes: new TextEncoder().encode("%PDF-1.4 card").buffer,
    });
    const card = (await w.ana.query(api.instructorCertifications.mine, {}))
      ?.certifications[0]?.card;
    expect(card).toMatchObject({ name: "card.pdf", type: "application/pdf" });
    await w.ana.mutation(api.instructorCertifications.removeCard, {
      id: id as Id<"instructorCertifications">,
    });
    expect(
      (await w.ana.query(api.instructorCertifications.mine, {}))
        ?.certifications[0]?.card
    ).toBeNull();
  });
});

function idempotencyKeys() {
  return vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([, init]) =>
      new Headers((init as RequestInit).headers).get("Idempotency-Key")
    );
}

describe("delivery safeguards", () => {
  it("cancels a queued reminder when a newer card replaces it or the instructor leaves", async () => {
    const w = await world();
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 7),
    });
    await w.ben.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 7),
    });
    await w.t.mutation(internal.instructorCertifications.runReminders, {
      today: TODAY,
    });
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 700),
    });
    await w.t.run(async (ctx) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", w.ids.ben))
        .unique();
      if (profile) {
        await ctx.db.patch(profile._id, { deactivatedAt: "2027-01-01" });
      }
    });
    await drain(w.t);
    expect((await w.reminders()).map((r) => r.state)).toEqual([
      "canceled",
      "canceled",
    ]);
    expect(sentTo()).toHaveLength(0);
  });

  it("retries an interrupted send with the same key and content", async () => {
    const w = await world();
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 7),
    });
    await w.t.mutation(internal.instructorCertifications.runReminders, {
      today: TODAY,
    });
    await w.t.run(async (ctx) => {
      const [row] = await ctx.db
        .query("instructorCertificationReminders")
        .collect();
      if (row) {
        await ctx.db.patch(row._id, {
          state: "sending",
          attempts: 1,
          claimedAt: Date.now(),
        });
      }
    });
    await drain(w.t);
    expect(
      await w.t.mutation(internal.instructorCertifications.runReminders, {
        today: TODAY,
      })
    ).toBe(0);
    await w.t.run(async (ctx) => {
      const [row] = await ctx.db
        .query("instructorCertificationReminders")
        .collect();
      if (row) {
        await ctx.db.patch(row._id, { claimedAt: Date.now() - 16 * 60_000 });
      }
    });
    expect(
      await w.t.mutation(internal.instructorCertifications.runReminders, {
        today: addDays(TODAY, 1),
      })
    ).toBe(1);
    await drain(w.t);
    const [reminder] = await w.reminders();
    expect([reminder?.state, reminder?.attempts]).toEqual(["sent", 2]);
    expect(idempotencyKeys()).toEqual([
      `certification-reminder:${reminder?._id}`,
    ]);
    expect(sentTo().map((m) => m.subject)).toEqual([
      "Your BLS Instructor certification expires in 7 days",
    ]);
  });

  it("retries a failed digest with identical content", async () => {
    const w = await world();
    await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: addDays(TODAY, 10),
    });
    vi.mocked(globalThis.fetch).mockImplementationOnce(
      async () => new Response("down", { status: 500 })
    );
    await w.t.mutation(internal.instructorCertifications.runDigest, {
      today: TODAY,
    });
    await drain(w.t);
    const [digest] = await w.t.run((ctx) =>
      ctx.db.query("instructorCertificationDigests").collect()
    );
    expect([digest?.state, digest?.attempts]).toEqual(["sent", 2]);
    const keys = idempotencyKeys();
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
  });

  it("clears staff verification when an instructor removes the card", async () => {
    const w = await world();
    const id = await w.ana.mutation(api.instructorCertifications.save, {
      ...bls,
      expiresOn: "2028-01-01",
    });
    await w.ana.action(api.instructorCertifications.uploadCard, {
      id,
      name: "card.pdf",
      bytes: new TextEncoder().encode("%PDF-1.4 card").buffer,
    });
    await w.admin.mutation(api.instructorCertifications.setVerified, {
      id,
      verified: true,
    });
    await w.ana.mutation(api.instructorCertifications.removeCard, { id });
    const [row] =
      (await w.ana.query(api.instructorCertifications.mine, {}))
        ?.certifications ?? [];
    expect(row?.verified).toBeNull();
  });

  it("keeps cards from different custom agencies apart", () => {
    const rows = [
      {
        id: "a",
        userId: "u",
        agency: "other",
        agencyOther: "NSC",
        type: "bls-instructor",
        expiresOn: "2027-01-01",
      },
      {
        id: "b",
        userId: "u",
        agency: "other",
        agencyOther: "ASHI",
        type: "bls-instructor",
        expiresOn: "2028-01-01",
      },
      {
        id: "c",
        userId: "u",
        agency: "other",
        agencyOther: "ashi ",
        type: "bls-instructor",
        expiresOn: "2029-01-01",
      },
    ];
    expect([...supersededIds(rows)]).toEqual(["b"]);
  });

  it("rejects a malformed report date", async () => {
    const w = await world();
    await expect(
      w.ana.query(api.instructorCertifications.mine, { today: "tomorrow" })
    ).rejects.toThrow("Invalid date");
  });
});
