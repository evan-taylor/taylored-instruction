import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const seed = internalMutation({
  args: {},
  returns: v.object({ code: v.string(), freeCode: v.string() }),
  handler: async (ctx) => {
    if (process.env.REGISTRATION_ALLOW_TEST_FIXTURES !== "true") {
      throw new Error(
        "Fixtures must be explicitly enabled on an isolated test deployment"
      );
    }
    const prior = await ctx.db
      .query("registrationCourses")
      .withIndex("by_slug", (q) => q.eq("slug", "registration-test-blended"))
      .unique();
    if (prior) {
      return {
        code: "registration-test-public",
        freeCode: "registration-test-free",
      };
    }
    const material = await ctx.db.insert("registrationMaterials", {
      title: "Online prerequisite",
      kind: "keycode",
      version: 1,
      archived: false,
    });
    const manual = await ctx.db.insert("registrationMaterials", {
      title: "Student manual",
      kind: "link",
      url: "https://example.com/manual",
      version: 1,
      archived: false,
    });
    const optional = await ctx.db.insert("registrationMaterials", {
      title: "Practice guide",
      kind: "link",
      url: "https://example.com/practice",
      version: 1,
      archived: false,
    });
    const settings = {
      tuition: 10_000,
      materials: [
        {
          id: "online",
          materialId: material,
          title: "Online prerequisite",
          policy: "included" as const,
          cents: 1000,
        },
        {
          id: "manual",
          materialId: manual,
          title: "Student manual",
          policy: "waivable" as const,
          cents: 2000,
        },
        {
          id: "practice",
          materialId: optional,
          title: "Practice guide",
          policy: "optional" as const,
          cents: 1500,
        },
      ],
      questions: [
        {
          id: "policy",
          title: "I accept the course participation policy",
          type: "checkbox" as const,
          required: true,
          options: [],
          version: 1,
        },
      ],
      outcomes: [
        {
          id: "online",
          title: "Online learning",
          type: "category" as const,
          options: ["complete", "incomplete"],
          required: true,
          passingValue: "complete",
          version: 1,
        },
        {
          id: "prerequisite",
          title: "Prerequisites",
          type: "category" as const,
          options: ["met", "unmet"],
          required: true,
          passingValue: "met",
          version: 1,
        },
        {
          id: "exam",
          title: "Exam",
          type: "percentage" as const,
          options: [],
          required: true,
          minimum: 80,
          version: 1,
        },
      ],
      emails: [
        {
          id: "reminder",
          anchor: "first" as const,
          offsetMinutes: -1440,
          subject: "Your class is tomorrow",
          body: "Hello {{attendeeName}}, see your portal for class information.",
        },
      ],
      cutoffMinutes: 0,
    };
    const course = await ctx.db.insert("registrationCourses", {
      slug: "registration-test-blended",
      title: "Blended CPR test course",
      description:
        "Test fixture: three meetings, scarce codes, and all material policies.",
      delivery: "scheduled",
      publication: "published",
      settings,
      enrollmentOpen: true,
      revision: 1,
    });
    const instructor = await ctx.db.insert("users", {
      email: "instructor@example.test",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("profiles", { userId: instructor, isInstructor: true });
    const unassigned = await ctx.db.insert("users", {
      email: "unassigned@example.test",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("profiles", { userId: unassigned, isInstructor: true });
    const meetings = [0, 1, 2].map((day) => ({
      id: `meeting-${day}`,
      start: Date.now() + (10 + day) * 86_400_000,
      end: Date.now() + (10 + day) * 86_400_000 + 3_600_000,
      location: "Test training center",
      onlineUrl: "https://example.com/private-meeting",
      instructions: "Private test instructions",
      sequence: 0,
    }));
    await Promise.all(
      (["public", "private", "admin"] as const).map(async (visibility) => {
        const id = await ctx.db.insert("registrationSessions", {
          courseId: course,
          title: `Blended CPR ${visibility} test session`,
          code: `registration-test-${visibility}`,
          publication: "published",
          visibility,
          state: "open",
          capacity: 12,
          reserved: 0,
          timeZone: "America/Los_Angeles",
          meetings,
          firstStart: meetings[0].start,
          lastEnd: meetings[2].end,
          overrides: {},
          revision: 1,
          instructors: [instructor],
          offerMinutes: 1440,
        });
        await ctx.db.insert("registrationInstructorAssignments", {
          sessionId: id,
          userId: instructor,
        });
      })
    );
    await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "Free registration acceptance class",
      code: "registration-test-free",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 100,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings,
      firstStart: meetings[0].start,
      lastEnd: meetings[2].end,
      overrides: { tuition: 0, materials: [], questions: [] },
      revision: 1,
      instructors: [],
      offerMinutes: 1440,
    });
    await ctx.db.insert("registrationCourses", {
      slug: "registration-test-self-paced",
      title: "Self-paced test course",
      description: "Test repeat purchases",
      delivery: "self-paced",
      publication: "published",
      settings,
      enrollmentOpen: true,
      revision: 1,
    });
    await ctx.db.insert("registrationCoupons", {
      code: "TEST-TWO",
      type: "percent",
      amount: 100,
      materialIds: [],
      allMaterials: false,
      courseIds: [course],
      expires: Date.now() + 30 * 86_400_000,
      limit: 2,
      reserved: 0,
      consumed: 0,
      disabled: false,
    });
    return {
      code: "registration-test-public",
      freeCode: "registration-test-free",
    };
  },
});
