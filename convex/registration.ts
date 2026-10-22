import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { filter } from "convex-helpers/server/filter";
import { doc } from "convex-helpers/validators";
import type { Quote, Settings } from "../shared/registration/domain";
import {
  ADMIN_MAX_SEATS,
  BATCH,
  CHECKOUT_HOLD_MS,
  cents,
  effective,
  email,
  MAX_SEATS,
  normalizePhone,
  quote,
  safeUrl,
  validateSettings,
} from "../shared/registration/domain";
import {
  attendee,
  couponFields,
  courseFields,
  materialAttachment,
  meeting,
  overrides,
  publication,
  settingsFields,
  visibility,
} from "../shared/registration/validators";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  audit,
  enqueue,
  hash,
  offering,
  rate,
  release,
  settle,
  staff,
} from "./registrationHelpers";
import schema from "./schema";

/** A course material as shown to the public: the attachment plus the catalog blurb. */
const publicMaterial = v.object({
  ...materialAttachment.fields,
  summary: v.optional(v.string()),
  kind: v.optional(
    v.union(
      v.literal("pdf"),
      v.literal("link"),
      v.literal("keycode"),
      v.literal("physical")
    )
  ),
});
const publicConfig = v.object({
  ...settingsFields,
  materials: v.array(publicMaterial),
});
const publicOffering = v.object({
  id: v.string(),
  courseId: v.id("registrationCourses"),
  title: v.string(),
  description: v.string(),
  delivery: v.string(),
  code: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  firstStart: v.optional(v.number()),
  available: v.optional(v.number()),
  state: v.string(),
  config: publicConfig,
  meetings: v.array(
    v.object({
      id: v.string(),
      start: v.number(),
      end: v.number(),
      location: v.string(),
    })
  ),
});
export const discover = query({
  args: {
    paginationOpts: paginationOptsValidator,
    /** Case-insensitive match against the title and meeting locations. */
    search: v.optional(v.string()),
    /** Epoch bounds for the first meeting, when filtering by date. */
    dayStart: v.optional(v.number()),
    dayEnd: v.optional(v.number()),
  },
  returns: v.object({
    page: v.array(publicOffering),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null()
      )
    ),
  }),
  handler: async (ctx, args) => {
    const needle = args.search?.trim().toLowerCase() ?? "";
    const from = Math.max(Date.now(), args.dayStart ?? 0);
    const result = await filter(
      ctx.db
        .query("registrationSessions")
        .withIndex("by_publication_and_visibility_and_firstStart", (q) =>
          q
            .eq("publication", "published")
            .eq("visibility", "public")
            .gte("firstStart", from)
        ),
      (s) =>
        (args.dayEnd === undefined || s.firstStart <= args.dayEnd) &&
        (needle === "" ||
          `${s.title} ${s.meetings.map((m) => m.location).join(" ")}`
            .toLowerCase()
            .includes(needle))
    ).paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (s) => {
        const course = await ctx.db.get(s.courseId);
        if (
          course?.publication !== "published" ||
          !course.enrollmentOpen ||
          s.state !== "open" ||
          Date.now() >=
            s.firstStart -
              effective(course.settings, s.overrides).cutoffMinutes * 60_000
        ) {
          return null;
        }
        return {
          id: s._id,
          courseId: s.courseId,
          title: s.title,
          description: course.description,
          delivery: course.delivery,
          code: s.code,
          timeZone: s.timeZone,
          firstStart: s.firstStart,
          available: Math.max(0, s.capacity - s.reserved),
          state: s.state,
          config: publicSettings(effective(course.settings, s.overrides)),
          meetings: s.meetings.map(({ id, start, end, location }) => ({
            id,
            start,
            end,
            location,
          })),
        };
      })
    );
    return { ...result, page: page.filter((p) => p !== null) };
  },
});
export const detail = query({
  args: { code: v.optional(v.string()), slug: v.optional(v.string()) },
  returns: v.union(publicOffering, v.null()),
  handler: async (ctx, args) => {
    const session = args.code
      ? await ctx.db
          .query("registrationSessions")
          .withIndex("by_code", (q) => q.eq("code", args.code ?? ""))
          .unique()
      : null;
    const course = session
      ? await ctx.db.get(session.courseId)
      : await ctx.db
          .query("registrationCourses")
          .withIndex("by_slug", (q) => q.eq("slug", args.slug ?? ""))
          .unique();
    if (
      course?.publication !== "published" ||
      (args.code && !session) ||
      (session && session.publication !== "published")
    ) {
      return null;
    }
    if (session?.visibility === "admin") {
      try {
        await staff(ctx);
      } catch {
        return null;
      }
    }
    const enrollmentOpen =
      course.enrollmentOpen &&
      (!session ||
        (session.state === "open" &&
          Date.now() <
            session.firstStart -
              effective(course.settings, session.overrides).cutoffMinutes *
                60_000));
    const enrollmentState = enrollmentOpen ? "open" : "closed";
    return {
      id: session?._id ?? course._id,
      courseId: course._id,
      title: session?.title ?? course.title,
      description: course.description,
      delivery: course.delivery,
      code: session?.code,
      timeZone: session?.timeZone,
      firstStart: session?.firstStart,
      available: session
        ? Math.max(0, session.capacity - session.reserved)
        : undefined,
      state: session?.state === "canceled" ? "canceled" : enrollmentState,
      config: await describeMaterials(
        ctx,
        publicSettings(effective(course.settings, session?.overrides ?? {}))
      ),
      meetings: (session?.meetings ?? []).map(
        ({ id, start, end, location }) => ({ id, start, end, location })
      ),
    };
  },
});
export const courses = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(doc(schema, "registrationCourses")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationCourses")
      .paginate(args.paginationOpts);
  },
});
export const sessions = query({
  args: {
    courseId: v.optional(v.id("registrationCourses")),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "registrationSessions")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return args.courseId
      ? await ctx.db
          .query("registrationSessions")
          .withIndex("by_courseId", (q) =>
            q.eq("courseId", args.courseId as Doc<"registrationCourses">["_id"])
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("registrationSessions")
          .order("desc")
          .paginate(args.paginationOpts);
  },
});
export const deleteCourse = mutation({
  args: { id: v.id("registrationCourses") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const actor = await staff(ctx);
    const course = await ctx.db.get(id);
    if (!course) {
      throw new ConvexError("Course template no longer exists");
    }
    const [session, order, seat, coupon] = await Promise.all([
      ctx.db
        .query("registrationSessions")
        .withIndex("by_courseId", (q) => q.eq("courseId", id))
        .first(),
      ctx.db
        .query("registrationOrders")
        .withIndex("by_courseId", (q) => q.eq("courseId", id))
        .first(),
      ctx.db
        .query("registrationSeats")
        .withIndex("by_courseId", (q) => q.eq("courseId", id))
        .first(),
      filter(ctx.db.query("registrationCoupons"), (item) =>
        item.courseIds.includes(id)
      ).first(),
    ]);
    if (session || order || seat) {
      throw new ConvexError(
        "This template has sessions or registrations. Archive it instead to preserve their history."
      );
    }
    if (coupon) {
      throw new ConvexError(
        "Remove this template from its coupons before deleting it, or archive it instead."
      );
    }
    await ctx.db.delete(id);
    await audit(ctx, actor.userId, "course-deleted", id, course.title);
    return null;
  },
});

export const saveCourse = mutation({
  args: { id: v.optional(v.id("registrationCourses")), ...courseFields },
  returns: v.id("registrationCourses"),
  handler: async (ctx, { id, ...value }) => {
    const actor = await staff(ctx);
    validateSettings(value.settings);
    if (!(value.title.trim() && value.slug.trim())) {
      throw new ConvexError("Title and slug are required");
    }
    const other = await ctx.db
      .query("registrationCourses")
      .withIndex("by_slug", (q) => q.eq("slug", value.slug))
      .unique();
    if (other && other._id !== id) {
      throw new ConvexError("Slug already exists");
    }
    const previous = id ? await ctx.db.get(id) : null;
    if (previous && previous.delivery !== value.delivery) {
      throw new ConvexError("Duplicate the template to change delivery type");
    }
    const revision = (previous?.revision ?? 0) + 1;
    const saved =
      id ??
      (await ctx.db.insert("registrationCourses", { ...value, revision }));
    if (id) {
      await ctx.db.patch(id, { ...value, revision });
    }
    await audit(
      ctx,
      actor.userId,
      "course-saved",
      saved,
      `revision ${revision}`
    );
    await ctx.scheduler.runAfter(0, internal.registrationOperations.propagate, {
      courseId: saved,
      cursor: null,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.registrationOperations.advanceCourseWaitlists,
      { courseId: saved, cursor: null }
    );
    return saved;
  },
});
export const saveSession = mutation({
  args: {
    id: v.optional(v.id("registrationSessions")),
    courseId: v.id("registrationCourses"),
    title: v.string(),
    publication,
    visibility,
    capacity: v.number(),
    timeZone: v.string(),
    meetings: v.array(meeting),
    overrides,
    instructors: v.array(v.id("users")),
    offerMinutes: v.number(),
    notify: v.boolean(),
  },
  returns: v.id("registrationSessions"),
  handler: async (ctx, { id, notify, ...value }) => {
    const actor = await staff(ctx);
    const course = await ctx.db.get(value.courseId);
    if (course?.delivery !== "scheduled") {
      throw new ConvexError("Choose a scheduled course");
    }
    validateSettings(effective(course.settings, value.overrides));
    new Intl.DateTimeFormat("en", {
      timeZone: value.timeZone,
    }).resolvedOptions();
    if (
      !Number.isInteger(value.capacity) ||
      value.capacity < 1 ||
      value.meetings.length < 1 ||
      value.meetings.length > 20 ||
      value.offerMinutes <= 0
    ) {
      throw new ConvexError("Invalid capacity, meetings, or offer duration");
    }
    validateMeetings(value.meetings);
    const previous = id ? await ctx.db.get(id) : null;
    if (
      previous &&
      (previous.courseId !== value.courseId ||
        value.capacity < previous.reserved)
    ) {
      throw new ConvexError(
        "Cannot change course or reduce capacity below reservations"
      );
    }
    const code = previous?.code ?? crypto.randomUUID().replaceAll("-", "");
    if (
      !previous &&
      (await ctx.db
        .query("registrationSessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique())
    ) {
      throw new ConvexError("Please retry creating the session");
    }
    const revision = (previous?.revision ?? 0) + 1;
    const values = {
      ...value,
      meetings: value.meetings.map((m) => ({
        ...m,
        sequence:
          (previous?.meetings.find((old) => old.id === m.id)?.sequence ?? -1) +
          1,
      })),
      firstStart: Math.min(...value.meetings.map((m) => m.start)),
      lastEnd: Math.max(...value.meetings.map((m) => m.end)),
      code,
      revision,
      reserved: previous?.reserved ?? 0,
      state: previous?.state ?? ("open" as const),
    };
    const saved = id ?? (await ctx.db.insert("registrationSessions", values));
    if (id) {
      await ctx.db.patch(id, values);
      await ctx.scheduler.runAfter(
        0,
        internal.registrationOperations.reschedule,
        { sessionId: id, notify, cursor: null }
      );
    }
    await ctx.scheduler.runAfter(0, internal.registrationWaitlist.advance, {
      sessionId: saved,
    });
    const assignments = await ctx.db
      .query("registrationInstructorAssignments")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", saved))
      .take(BATCH);
    await Promise.all(
      assignments.map((assignment) => ctx.db.delete(assignment._id))
    );
    await Promise.all(
      [...new Set(value.instructors)].map((userId) =>
        ctx.db.insert("registrationInstructorAssignments", {
          sessionId: saved,
          userId,
        })
      )
    );
    if (notify) {
      await Promise.all(
        [
          ...new Set([...(previous?.instructors ?? []), ...value.instructors]),
        ].map(async (userId) => {
          const user = await ctx.db.get(userId);
          if (user?.email) {
            await enqueue(ctx, {
              key: `instructor:${saved}:${revision}:${userId}`,
              kind: "email",
              recipient: user.email,
              subject: `Instructor schedule: ${value.title}`,
              body: `Your assignment or schedule has changed. Meetings: ${values.meetings.map((m) => `${new Date(m.start).toISOString()} ${m.location}`).join("; ")}. View your assigned-session roster.`,
              due: Date.now(),
            });
          }
        })
      );
    }
    await audit(
      ctx,
      actor.userId,
      "session-saved",
      saved,
      `revision ${revision}; notify=${notify}`
    );
    return saved;
  },
});
export const saveCoupon = mutation({
  args: { id: v.optional(v.id("registrationCoupons")), ...couponFields },
  returns: v.id("registrationCoupons"),
  handler: async (ctx, { id, ...value }) => {
    const actor = await staff(ctx);
    cents(value.amount);
    const code = value.code.trim().toUpperCase();
    if (
      !code ||
      value.limit < 0 ||
      !Number.isInteger(value.limit) ||
      (value.type === "percent" && value.amount > 100)
    ) {
      throw new ConvexError("Invalid coupon");
    }
    const previous = id ? await ctx.db.get(id) : null;
    const duplicate = await ctx.db
      .query("registrationCoupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (duplicate && duplicate._id !== id) {
      throw new ConvexError("Coupon code already exists");
    }
    const saved = {
      ...value,
      code,
      reserved: previous?.reserved ?? 0,
      consumed: previous?.consumed ?? 0,
    };
    if (saved.limit < saved.reserved + saved.consumed) {
      throw new ConvexError("Limit cannot be below reserved and consumed uses");
    }
    const result = id ?? (await ctx.db.insert("registrationCoupons", saved));
    if (id) {
      await ctx.db.patch(id, saved);
    }
    await audit(ctx, actor.userId, "coupon-saved", result, code);
    return result;
  },
});
export const coupons = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(doc(schema, "registrationCoupons")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationCoupons")
      .paginate(args.paginationOpts);
  },
});
export const reserve = mutation({
  args: {
    courseId: v.id("registrationCourses"),
    sessionId: v.optional(v.id("registrationSessions")),
    requestKey: v.string(),
    purchaser: v.string(),
    purchaserName: v.string(),
    purchaserPhone: v.optional(v.string()),
    attendees: v.array(attendee),
    coupon: v.optional(v.string()),
    admin: v.optional(
      v.object({
        overbook: v.boolean(),
        reason: v.string(),
        payment: v.union(
          v.literal("unpaid"),
          v.literal("offline"),
          v.literal("waived")
        ),
        /** Custom per-seat tuition in cents for negotiated group pricing. */
        tuition: v.optional(v.number()),
        organizationId: v.optional(v.id("registrationOrganizations")),
        pricingNote: v.optional(v.string()),
      })
    ),
    invitation: v.optional(v.string()),
  },
  returns: v.object({
    orderId: v.id("registrationOrders"),
    total: v.number(),
    status: v.string(),
    expires: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.requestKey.length < 24 || args.requestKey.length > 100) {
      throw new ConvexError("Invalid checkout attempt");
    }
    const purchaser = email(args.purchaser);
    const previous = await ctx.db
      .query("registrationOrders")
      .withIndex("by_requestKey", (q) => q.eq("requestKey", args.requestKey))
      .unique();
    if (previous) {
      return {
        orderId: previous._id,
        total: previous.total,
        status: previous.status,
        expires: previous.expires,
      };
    }
    const actor = args.admin ? await staff(ctx) : null;
    if (args.admin && !args.admin.reason.trim()) {
      throw new ConvexError("An admin reason is required");
    }
    await rate(ctx, `checkout:${purchaser}`);
    const { course, session, config } = await offering(
      ctx,
      args.courseId,
      args.sessionId
    );
    const now = Date.now();
    requireOpen(course, session, config, Boolean(actor));
    const coupon = await validCoupon(ctx, args.coupon, course._id);
    const pricing = adminPricing(config, args.admin);
    const seats = await withTaxCodes(
      ctx,
      pricing,
      quote(
        pricing,
        args.attendees,
        coupon,
        coupon ? coupon.limit - coupon.reserved - coupon.consumed : 0,
        actor ? ADMIN_MAX_SEATS : MAX_SEATS
      )
    );
    await reserveCapacity(
      ctx,
      session,
      seats,
      args.invitation,
      args.admin?.overbook ?? false
    );
    const couponUses = seats.filter((seat) => seat.couponUsed).length;
    if (coupon) {
      await ctx.db.patch(coupon._id, {
        reserved: coupon.reserved + couponUses,
      });
    }
    const total = seats.reduce((sum, seat) => sum + seat.total, 0);
    const expires = now + CHECKOUT_HOLD_MS;
    const id = await ctx.db.insert("registrationOrders", {
      requestKey: args.requestKey,
      purchaser,
      purchaserName: args.purchaserName,
      purchaserPhone: normalizePhone(args.purchaserPhone),
      courseId: course._id,
      sessionId: session?._id,
      title: session?.title ?? course.title,
      status: args.admin ? "unpaid" : "hold",
      seats,
      total,
      currency: "usd",
      expires,
      couponId: coupon?._id,
      couponUses,
      restoredUses: 0,
      refunded: 0,
      refundReserved: 0,
      organizationId: args.admin?.organizationId,
      pricingNote: args.admin?.pricingNote?.trim() || undefined,
    });
    await Promise.all(
      seats.map((seat) =>
        ctx.db.insert("registrationSeats", {
          orderId: id,
          courseId: course._id,
          sessionId: session?._id,
          email: seat.attendee.email,
          name: seat.attendee.name,
          state: "held",
          snapshot: seat,
          outcomeDefinitions: config.outcomes,
        })
      )
    );
    const order = await ctx.db.get(id);
    if (!order) {
      throw new ConvexError("Order insert failed");
    }
    const status = await settleReservation(ctx, order, args.admin);
    await audit(
      ctx,
      actor?.userId ?? "guest",
      "reserved",
      id,
      reservationDetail(args.admin)
    );
    return {
      orderId: id,
      total,
      status,
      expires,
    };
  },
});

/** Lets a purchaser give their held seats back instead of waiting out the hold. */
export const abandon = mutation({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (order?.requestKey !== args.requestKey || order.status !== "hold") {
      return null;
    }
    await release(ctx, order, "Checkout abandoned by purchaser");
    await audit(ctx, "guest", "abandoned", order._id, order.purchaser);
    return null;
  },
});

async function settleReservation(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  admin?: { payment: string }
) {
  if (
    order.total === 0 ||
    ["offline", "waived"].includes(admin?.payment ?? "")
  ) {
    const source =
      admin && order.total === 0 ? "staff-free" : (admin?.payment ?? "free");
    await settle(ctx, order, source);
  }
  const saved = await ctx.db.get(order._id);
  if (!saved) {
    throw new ConvexError("Order missing after settlement");
  }
  return saved.status;
}

/** Stamps each line with its Stripe tax code: tuition from settings, materials from the material. */
async function withTaxCodes(
  ctx: QueryCtx,
  config: Settings,
  seats: Quote[]
): Promise<Quote[]> {
  const ids = [
    ...new Set(
      seats.flatMap((seat) =>
        seat.lines.flatMap((l) => (l.materialId ? [l.materialId] : []))
      )
    ),
  ];
  const materials = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const codes = new Map(
    materials.flatMap((m) => (m?.taxCode ? [[m._id, m.taxCode] as const] : []))
  );
  return seats.map((seat) => ({
    ...seat,
    lines: seat.lines.map((line) => {
      const code = line.materialId
        ? codes.get(line.materialId)
        : config.taxCode;
      return code ? { ...line, taxCode: code } : line;
    }),
  }));
}
type AdminReservation = {
  reason: string;
  tuition?: number;
  pricingNote?: string;
};
/** Applies negotiated group tuition for staff enrollments; public checkout keeps template pricing. */
function adminPricing(config: Settings, admin?: AdminReservation): Settings {
  if (admin?.tuition === undefined) {
    return config;
  }
  if (!admin.pricingNote?.trim()) {
    throw new ConvexError("Explain the custom group price");
  }
  return { ...config, tuition: cents(admin.tuition) };
}
function reservationDetail(admin?: AdminReservation) {
  if (!admin) {
    return "Guest checkout";
  }
  return admin.tuition === undefined
    ? admin.reason
    : `${admin.reason}; custom tuition ${admin.tuition} cents (${admin.pricingNote})`;
}

async function reserveCapacity(
  ctx: MutationCtx,
  session: Doc<"registrationSessions"> | null,
  seats: Quote[],
  invitation?: string,
  overbook = false
) {
  let offeredSeats = 0;
  if (invitation && session) {
    const digest = await hash(invitation);
    const offer = await ctx.db
      .query("registrationWaitlist")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", digest))
      .unique();
    if (
      offer?.state !== "offered" ||
      offer.sessionId !== session._id ||
      (offer.expires ?? 0) <= Date.now() ||
      !seats.some((s) => s.attendee.email === offer.email)
    ) {
      throw new ConvexError("Invitation invalid or expired");
    }
    offeredSeats = 1;
    await ctx.db.patch(offer._id, { state: "accepted" });
  }
  if (session) {
    if (
      session.reserved + seats.length - offeredSeats > session.capacity &&
      !overbook
    ) {
      throw new ConvexError("Not enough seats available");
    }
    const duplicate = await Promise.all(
      seats.map(async (seat) => {
        const rows = await ctx.db
          .query("registrationSeats")
          .withIndex("by_sessionId_and_email", (q) =>
            q.eq("sessionId", session._id).eq("email", seat.attendee.email)
          )
          .take(100);
        const offers = await ctx.db
          .query("registrationWaitlist")
          .withIndex("by_sessionId_and_email", (q) =>
            q.eq("sessionId", session._id).eq("email", seat.attendee.email)
          )
          .take(BATCH);
        return (
          rows.some((row) => row.state === "held" || row.state === "active") ||
          offers.some((offer) => offer.state === "offered")
        );
      })
    );
    if (duplicate.some(Boolean)) {
      throw new ConvexError(
        "An attendee already has a registration or reservation for this session"
      );
    }
    await ctx.db.patch(session._id, {
      reserved: session.reserved + seats.length - offeredSeats,
    });
  }
}

function requireOpen(
  course: Doc<"registrationCourses">,
  session: Doc<"registrationSessions"> | null,
  config: Settings,
  admin: boolean
) {
  if (
    !admin &&
    (course.publication !== "published" ||
      !course.enrollmentOpen ||
      (session &&
        (session.publication !== "published" ||
          session.visibility === "admin" ||
          Date.now() >= session.firstStart - config.cutoffMinutes * 60_000)))
  ) {
    throw new ConvexError("Registration is closed");
  }
  if (session && session.state !== "open") {
    throw new ConvexError("Session is closed");
  }
}

async function validCoupon(
  ctx: QueryCtx,
  couponCode: string | undefined,
  courseId: Doc<"registrationCourses">["_id"]
) {
  const coupon = couponCode
    ? await ctx.db
        .query("registrationCoupons")
        .withIndex("by_code", (q) =>
          q.eq("code", couponCode?.trim().toUpperCase())
        )
        .unique()
    : null;
  if (
    couponCode &&
    (!coupon ||
      coupon.disabled ||
      coupon.expires <= Date.now() ||
      (coupon.courseIds.length && !coupon.courseIds.includes(courseId)))
  ) {
    throw new ConvexError("Coupon is not valid for this course");
  }
  return coupon;
}

function validateMeetings(meetings: Doc<"registrationSessions">["meetings"]) {
  for (const m of meetings) {
    if (
      m.end <= m.start ||
      !Number.isFinite(m.start) ||
      !Number.isFinite(m.end) ||
      !(m.location || m.onlineUrl)
    ) {
      throw new ConvexError(
        "Every meeting needs valid times and a location or online link"
      );
    }
    if (m.onlineUrl) {
      safeUrl(m.onlineUrl);
    }
  }
  if (new Set(meetings.map((m) => m.id)).size !== meetings.length) {
    throw new ConvexError("Meeting IDs must be unique");
  }
}

function publicSettings(config: Settings): Settings {
  return { ...config, outcomes: [], emails: [] };
}
/** Attaches each material's catalog summary and kind so checkout can explain it. */
async function describeMaterials(ctx: QueryCtx, config: Settings) {
  const materials = await Promise.all(
    config.materials.map(async (attachment) => {
      const material = await ctx.db.get(attachment.materialId);
      const summary = material?.summary?.trim();
      return {
        ...attachment,
        kind: material?.kind,
        ...(summary ? { summary } : {}),
      };
    })
  );
  return { ...config, materials };
}
export const publicCourseSessions = query({
  args: { courseId: v.id("registrationCourses") },
  returns: v.array(
    v.object({
      code: v.string(),
      title: v.string(),
      start: v.number(),
      timeZone: v.string(),
      available: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (course?.publication !== "published") {
      return [];
    }
    const matchingSessions = await ctx.db
      .query("registrationSessions")
      .withIndex("by_courseId_and_firstStart", (q) =>
        q.eq("courseId", args.courseId).gt("firstStart", Date.now())
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("visibility"), "public"),
          q.eq(q.field("publication"), "published"),
          q.eq(q.field("state"), "open")
        )
      )
      .take(BATCH);
    return matchingSessions
      .filter((s) => s.state === "open" && s.firstStart > Date.now())
      .map((s) => ({
        code: s.code,
        title: s.title,
        start: s.firstStart,
        timeZone: s.timeZone,
        available: Math.max(0, s.capacity - s.reserved),
      }));
  },
});
export const selfPaced = query({
  args: {},
  returns: v.array(
    v.object({ slug: v.string(), title: v.string(), tuition: v.number() })
  ),
  handler: async (ctx) => {
    const matchingCourses = await ctx.db
      .query("registrationCourses")
      .withIndex("by_publication_and_delivery", (q) =>
        q.eq("publication", "published").eq("delivery", "self-paced")
      )
      .take(BATCH);
    return matchingCourses
      .filter((c) => c.enrollmentOpen)
      .map((c) => ({
        slug: c.slug,
        title: c.title,
        tuition:
          c.settings.tuition +
          c.settings.materials
            .filter((m) => m.policy !== "optional")
            .reduce((sum, m) => sum + m.cents, 0),
      }));
  },
});
