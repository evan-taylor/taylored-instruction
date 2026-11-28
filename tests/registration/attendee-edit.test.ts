import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";
import { agreement } from "./fixtures/policy";

const modules = import.meta.glob("../../convex/**/*.ts");
const PAGE = { numItems: 100, cursor: null };

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const verified = (email: string) =>
      ctx.db.insert("users", { email, emailVerificationTime: Date.now() });
    const admin = await verified(ADMIN_EMAILS[0]);
    const instructor = await verified("instructor@example.test");
    const oldStudent = await verified("jane@example.test");
    const newStudent = await verified("janet@example.test");
    const course = await ctx.db.insert("registrationCourses", {
      slug: "bls",
      title: "BLS",
      description: "Test",
      delivery: "scheduled",
      publication: "published",
      settings: {
        tuition: 10_000,
        materials: [],
        questions: [],
        outcomes: [],
        emails: [],
        cutoffMinutes: 0,
      },
      enrollmentOpen: true,
      revision: 1,
    });
    const session = await ctx.db.insert("registrationSessions", {
      courseId: course,
      title: "BLS class",
      code: "bls-class",
      publication: "published",
      visibility: "public",
      state: "open",
      capacity: 20,
      reserved: 0,
      timeZone: "America/Los_Angeles",
      meetings: [
        {
          id: "first",
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
      instructors: [instructor],
      offerMinutes: 1440,
    });
    return { admin, instructor, oldStudent, newStudent, course, session };
  });
  const as = (user: Id<"users">) =>
    t.withIdentity({ subject: `${user}|session` });

  async function registerPaid(first: string, last: string, email: string) {
    const requestKey = crypto.randomUUID();
    const order = await t.mutation(api.registration.reserve, {
      courseId: ids.course,
      sessionId: ids.session,
      requestKey,
      purchaser: "buyer@example.test",
      purchaserName: "Buyer",
      cancellationPolicy: agreement,
      attendees: [
        {
          name: `${first} ${last}`,
          firstName: first,
          lastName: last,
          email,
          phone: "555-010-0100",
          selected: [],
          waived: [],
          answers: [],
        },
      ],
    });
    const session = `cs_${requestKey}`;
    await t.mutation(internal.registrationPayments.attachCheckout, {
      orderId: order.orderId,
      session,
      secret: "secret",
    });
    await t.mutation(internal.registrationPayments.paymentEvent, {
      orderId: order.orderId,
      session,
      eventId: `evt_${requestKey}`,
      amount: order.total,
      currency: "usd",
      paid: true,
      live: false,
      type: "checkout.session.completed",
    });
    const seat = await t.run((ctx) =>
      ctx.db
        .query("registrationSeats")
        .withIndex("by_orderId", (q) => q.eq("orderId", order.orderId))
        .first()
    );
    if (!seat) {
      throw new Error("Seat missing");
    }
    return seat;
  }

  return { t, ...ids, as, registerPaid };
}

const correction = {
  firstName: " Janet ",
  lastName: "Doe",
  email: " Janet@Example.test ",
  phone: "(555) 010-0199",
  reason: "Typo at checkout",
};

describe("Staff attendee edits", () => {
  it("update the seat, its snapshot and the order's copy together, with an audit entry", async () => {
    const f = await fixture();
    const seat = await f.registerPaid("Jane", "Doe", "jane@example.test");
    await f.as(f.admin).mutation(api.registrationAttendees.updateContact, {
      seatId: seat._id,
      ...correction,
    });
    const [after, order, activity] = await f.t.run(async (ctx) => [
      await ctx.db.get(seat._id),
      await ctx.db.get(seat.orderId),
      await ctx.db
        .query("registrationActivity")
        .withIndex("by_entity", (q) => q.eq("entity", seat._id))
        .collect(),
    ]);
    expect(after?.name).toBe("Janet Doe");
    expect(after?.email).toBe("janet@example.test");
    expect(after?.snapshot.attendee).toMatchObject({
      name: "Janet Doe",
      firstName: "Janet",
      lastName: "Doe",
      email: "janet@example.test",
      phone: "(555) 010-0199",
    });
    expect(after?.snapshot.lines).toEqual(seat.snapshot.lines);
    expect(order?.seats[0]?.attendee).toMatchObject({
      name: "Janet Doe",
      email: "janet@example.test",
      phone: "(555) 010-0199",
    });
    expect(order?.purchaser).toBe("buyer@example.test");
    const entry = activity.find((row) => row.action === "attendee-updated");
    expect(entry?.actor).toBe(f.admin);
    expect(JSON.parse(entry?.detail ?? "{}")).toEqual({
      "first name": "Jane → Janet",
      name: "Jane Doe → Janet Doe",
      email: "jane@example.test → janet@example.test",
      phone: "555-010-0100 → (555) 010-0199",
      reason: "Typo at checkout",
    });
  });

  it("move portal access from the old email to the new one", async () => {
    const f = await fixture();
    const seat = await f.registerPaid("Jane", "Doe", "jane@example.test");
    const portal = (user: Id<"users">) =>
      f.as(user).query(api.registrationPortal.registrations, {
        paginationOpts: PAGE,
      });
    expect((await portal(f.oldStudent)).page.map((s) => s.id)).toEqual([
      seat._id,
    ]);
    await f.as(f.admin).mutation(api.registrationAttendees.updateContact, {
      seatId: seat._id,
      ...correction,
    });
    expect((await portal(f.oldStudent)).page).toEqual([]);
    expect((await portal(f.newStudent)).page.map((s) => s.id)).toEqual([
      seat._id,
    ]);
    expect(
      await f.as(f.oldStudent).query(api.registrationPortal.certificate, {
        seatId: seat._id,
      })
    ).toBeNull();
  });

  it("send unsent mail to the new email and leave sent mail and invoiced lines alone", async () => {
    const f = await fixture();
    const seat = await f.registerPaid("Jane", "Doe", "jane@example.test");
    const job = (state: "pending" | "sent", recipient: string) =>
      f.t.run((ctx) =>
        ctx.db.insert("registrationJobs", {
          key: `${state}-${recipient}`,
          kind: "email",
          recipient,
          subject: "Reminder",
          body: "See you soon",
          due: Date.now() + 60_000,
          state,
          attempts: 0,
          seatId: seat._id,
        })
      );
    const pending = await job("pending", "jane@example.test");
    const sent = await job("sent", "jane@example.test");
    const charge = (state: "unbilled" | "invoiced") =>
      f.t.run(async (ctx) => {
        const organizationId = await ctx.db.insert(
          "registrationOrganizations",
          {
            name: "Acme",
            contactName: "Pat",
            contactEmail: "pat@acme.test",
            phone: "",
            address: "",
            notes: "",
            archived: false,
          }
        );
        const billingCodeId = await ctx.db.insert("registrationBillingCodes", {
          organizationId,
          code: `ACME-${state.toUpperCase()}`,
          pricing: "full",
          amount: 0,
          courseIds: [],
          uses: 0,
          active: true,
        });
        return await ctx.db.insert("registrationOrganizationCharges", {
          organizationId,
          billingCodeId,
          code: "ACME",
          orderId: seat.orderId,
          seatId: seat._id,
          courseId: seat.courseId,
          attendeeName: "Jane Doe",
          attendeeEmail: "jane@example.test",
          title: "BLS",
          listPrice: 10_000,
          amount: 10_000,
          lines: [],
          state,
        });
      });
    const unbilled = await charge("unbilled");
    const invoiced = await charge("invoiced");
    await f.as(f.admin).mutation(api.registrationAttendees.updateContact, {
      seatId: seat._id,
      ...correction,
    });
    const rows = await f.t.run(async (ctx) => ({
      pending: await ctx.db.get(pending),
      sent: await ctx.db.get(sent),
      unbilled: await ctx.db.get(unbilled),
      invoiced: await ctx.db.get(invoiced),
    }));
    expect(rows.pending?.recipient).toBe("janet@example.test");
    expect(rows.sent?.recipient).toBe("jane@example.test");
    expect(rows.unbilled).toMatchObject({
      attendeeName: "Janet Doe",
      attendeeEmail: "janet@example.test",
    });
    expect(rows.invoiced).toMatchObject({
      attendeeName: "Jane Doe",
      attendeeEmail: "jane@example.test",
    });
  });

  it("apply checkout's validation", async () => {
    const f = await fixture();
    const seat = await f.registerPaid("Jane", "Doe", "jane@example.test");
    const edit = (changes: Partial<typeof correction>) =>
      f.as(f.admin).mutation(api.registrationAttendees.updateContact, {
        seatId: seat._id,
        ...correction,
        ...changes,
      });
    await expect(edit({ email: "not-an-email" })).rejects.toThrow(
      "Enter a valid email address"
    );
    await expect(edit({ lastName: "  " })).rejects.toThrow(
      "Enter a first and last name"
    );
    await expect(edit({ phone: "call me" })).rejects.toThrow(
      "Enter a valid phone number"
    );
    await expect(
      edit({
        firstName: "Jane",
        email: "jane@example.test",
        phone: "555-010-0100",
      })
    ).rejects.toThrow("Nothing changed");
    const other = await f.registerPaid("Sam", "Lee", "sam@example.test");
    await expect(edit({ email: other.email })).rejects.toThrow(
      "already has a registration for this session"
    );
    const unchanged = await f.t.run((ctx) => ctx.db.get(seat._id));
    expect(unchanged?.email).toBe("jane@example.test");
  });

  it("are limited to admins", async () => {
    const f = await fixture();
    const seat = await f.registerPaid("Jane", "Doe", "jane@example.test");
    await expect(
      f.as(f.instructor).mutation(api.registrationAttendees.updateContact, {
        seatId: seat._id,
        ...correction,
      })
    ).rejects.toThrow("Forbidden");
    await expect(
      f.as(f.oldStudent).mutation(api.registrationAttendees.updateContact, {
        seatId: seat._id,
        ...correction,
      })
    ).rejects.toThrow("Forbidden");
  });
});
