import { getAuthUserId } from "@convex-dev/auth/server";
import { ADMIN_EMAILS, isAdminEmail } from "../shared/adminEmails";
import {
  BATCH,
  effective,
  email,
  HOLD_MS,
} from "../shared/registration/domain";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function staff(
  ctx: QueryCtx,
  sessionId?: Id<"registrationSessions">
) {
  const userId = await getAuthUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (
    !(user && userId && user.email) ||
    user.emailVerificationTime === undefined
  ) {
    throw new Error("Verified staff sign-in required");
  }
  if (isAdminEmail(user.email)) {
    return { userId, admin: true };
  }
  if (sessionId) {
    const session = await ctx.db.get(sessionId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (
      profile?.isInstructor &&
      !profile.deactivatedAt &&
      session?.instructors.includes(userId)
    ) {
      return { userId, admin: false };
    }
  }
  throw new Error("Forbidden");
}
export async function audit(
  ctx: MutationCtx,
  actor: string,
  action: string,
  entity: string,
  detail: string
) {
  await ctx.db.insert("registrationActivity", {
    actor,
    action,
    entity,
    detail,
    at: Date.now(),
  });
}
export async function rate(ctx: MutationCtx, key: string, limit = 10) {
  const row = await ctx.db
    .query("registrationRates")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const now = Date.now();
  if (row && row.until > now && row.count >= limit) {
    throw new Error("Too many attempts. Try again later.");
  }
  if (row) {
    await ctx.db.patch(row._id, {
      count: row.until > now ? row.count + 1 : 1,
      until: row.until > now ? row.until : now + HOLD_MS,
    });
  } else {
    await ctx.db.insert("registrationRates", {
      key,
      count: 1,
      until: now + HOLD_MS,
    });
  }
}
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
export async function portalEmail(ctx: QueryCtx, grant?: string) {
  if (grant) {
    const digest = await hash(grant);
    const row = await ctx.db
      .query("registrationGrants")
      .withIndex("by_hash", (q) => q.eq("hash", digest))
      .unique();
    if (
      row?.purpose === "portal" &&
      !row.consumed &&
      row.expires > Date.now()
    ) {
      return row.email;
    }
    throw new Error("Access expired. Request another access email.");
  }
  const id = await getAuthUserId(ctx);
  const user = id ? await ctx.db.get(id) : null;
  if (user?.email && user.emailVerificationTime !== undefined) {
    return email(user.email);
  }
  throw new Error("Verified access required");
}
export async function offering(
  ctx: QueryCtx,
  courseId: Id<"registrationCourses">,
  sessionId?: Id<"registrationSessions">
) {
  const course = await ctx.db.get(courseId);
  const session = sessionId ? await ctx.db.get(sessionId) : null;
  if (
    !course ||
    (course.delivery === "scheduled" &&
      (!session || session.courseId !== courseId)) ||
    (course.delivery === "self-paced" && session)
  ) {
    throw new Error("Offering not found");
  }
  return {
    course,
    session,
    config: effective(course.settings, session?.overrides ?? {}),
  };
}
export async function enqueue(
  ctx: MutationCtx,
  job: Omit<
    Doc<"registrationJobs">,
    "_id" | "_creationTime" | "state" | "attempts"
  >
) {
  const existing = await ctx.db
    .query("registrationJobs")
    .withIndex("by_key", (q) => q.eq("key", job.key))
    .unique();
  if (!existing) {
    await ctx.db.insert("registrationJobs", {
      ...job,
      state: "pending",
      attempts: 0,
    });
  }
}
export async function release(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  reason: string
) {
  if (order.status !== "hold" && order.status !== "unpaid") {
    return;
  }
  const seats = await ctx.db
    .query("registrationSeats")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(BATCH);
  const active = seats.filter(
    (seat) => seat.state === "held" || seat.state === "active"
  );
  await Promise.all(
    active.map((seat) => ctx.db.patch(seat._id, { state: "canceled" }))
  );
  if (order.sessionId) {
    const session = await ctx.db.get(order.sessionId);
    if (session) {
      await ctx.db.patch(session._id, {
        reserved: session.reserved - active.length,
      });
      await ctx.scheduler.runAfter(0, internal.registrationWaitlist.advance, {
        sessionId: session._id,
      });
    }
  }
  if (order.couponId) {
    const coupon = await ctx.db.get(order.couponId);
    if (coupon) {
      await ctx.db.patch(coupon._id, {
        reserved: coupon.reserved - order.couponUses,
      });
    }
  }
  await ctx.db.patch(order._id, { status: "expired", error: reason });
  if (order.stripeSession) {
    await ctx.scheduler.runAfter(
      0,
      internal.registrationExternal.expireCheckout,
      { session: order.stripeSession, attempt: 0 }
    );
  }
}
export async function grantMaterial(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  attachment: Doc<"registrationSeats">["snapshot"]["materials"][number]
) {
  const existing = await ctx.db
    .query("registrationEntitlements")
    .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
    .take(BATCH);
  if (
    existing.some(
      (e) =>
        e.attachmentId === attachment.id ||
        e.materialId === attachment.materialId
    )
  ) {
    return;
  }
  const material = await ctx.db.get(attachment.materialId);
  if (!(material && seat.settledAt)) {
    return;
  }
  const id = await ctx.db.insert("registrationEntitlements", {
    seatId: seat._id,
    materialId: material._id,
    attachmentId: attachment.id,
    title: material.title,
    version: material.version,
    kind: material.kind,
    url: material.url,
    storageId: material.storageId,
    paidAt: seat.settledAt,
    state: material.kind === "keycode" ? "pending" : "ready",
  });
  if (material.kind !== "keycode") {
    await enqueue(ctx, {
      key: `material:${id}`,
      kind: "email",
      recipient: seat.email,
      subject: `Material available: ${material.title}`,
      body: "Your course material is available in your secure portal.",
      due: Date.now(),
      seatId: seat._id,
    });
  }
  if (material.kind === "keycode") {
    const code = await ctx.db
      .query("registrationCodes")
      .withIndex("by_materialId_and_state", (q) =>
        q.eq("materialId", material._id).eq("state", "available")
      )
      .first();
    if (code) {
      await assignCode(ctx, id, code, "system", "settlement");
    } else {
      await enqueue(ctx, {
        key: `shortage:${id}`,
        kind: "shortage",
        recipient: seat.email,
        subject: `Material pending: ${material.title}`,
        body: "Your registration is confirmed. Please contact Taylored Instruction for your missing keycode. Other available materials are in your portal.",
        due: Date.now(),
        seatId: seat._id,
        entitlementId: id,
      });
      await enqueue(ctx, {
        key: `admin-shortage:${id}`,
        kind: "admin-shortage",
        recipient: process.env.REGISTRATION_ADMIN_EMAIL ?? ADMIN_EMAILS[0],
        subject: "Keycode inventory shortage",
        body: `${seat.name} (${seat.email}), order ${seat.orderId}, material ${material.title} needs fulfillment.`,
        due: Date.now(),
        seatId: seat._id,
        entitlementId: id,
      });
    }
  }
}
export async function assignCode(
  ctx: MutationCtx,
  entitlementId: Id<"registrationEntitlements">,
  code: Doc<"registrationCodes">,
  actor: string,
  reason: string
) {
  const entitlement = await ctx.db.get(entitlementId);
  if (
    !entitlement ||
    code.state !== "available" ||
    code.materialId !== entitlement.materialId
  ) {
    throw new Error("Code unavailable or wrong inventory");
  }
  const material = await ctx.db.get(code.materialId);
  if (material) {
    await ctx.db.patch(material._id, {
      availableCount: Math.max(0, (material.availableCount ?? 0) - 1),
      assignedCount: (material.assignedCount ?? 0) + 1,
    });
  }
  await ctx.db.patch(code._id, { state: "assigned", entitlementId });
  await ctx.db.patch(entitlementId, {
    state: "ready",
    codeId: code._id,
    url: code.url,
  });
  await ctx.db.insert("registrationAssignments", {
    entitlementId,
    codeId: code._id,
    actor,
    reason,
    at: Date.now(),
  });
}
export async function scheduleEmails(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  session: Doc<"registrationSessions"> | null,
  config: Doc<"registrationCourses">["settings"]
) {
  const previousJobs = await ctx.db
    .query("registrationJobs")
    .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
    .take(200);
  await Promise.all(
    config.emails.map(async (step) => {
      if (
        previousJobs.some(
          (job) => job.stepId === step.id && job.state === "sent"
        )
      ) {
        return;
      }
      const anchor = {
        registration: seat.settledAt,
        first: session?.firstStart,
        last: session?.lastEnd,
      }[step.anchor];
      if (anchor === undefined) {
        return;
      }
      const due = anchor + step.offsetMinutes * 60_000;
      if (due < Date.now() && step.anchor !== "registration") {
        return;
      }
      await enqueue(ctx, {
        key: `step:${seat._id}:${step.id}:${session?.revision ?? 0}`,
        kind: "email",
        recipient: seat.email,
        subject: step.subject,
        body: step.body,
        due,
        seatId: seat._id,
        sessionId: session?._id,
        stepId: step.id,
        scheduleRevision: session?.revision,
      });
    })
  );
}
export async function settle(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  source: string,
  paymentIntent?: string
) {
  if (order.status === "settled") {
    return;
  }
  if (order.status !== "hold" && order.status !== "unpaid") {
    await ctx.db.patch(order._id, {
      status: "exception",
      error:
        "Payment arrived after reservation release; reconcile or refund without overbooking",
    });
    return;
  }
  const { course, session, config } = await offering(
    ctx,
    order.courseId,
    order.sessionId
  );
  const coupon = order.couponId ? await ctx.db.get(order.couponId) : null;
  if (
    session?.state === "canceled" ||
    coupon?.disabled ||
    !course.enrollmentOpen
  ) {
    await release(ctx, order, "Session canceled");
    await ctx.db.patch(order._id, {
      status: "exception",
      error:
        "Payment for canceled or disabled offering/coupon requires reconciliation",
    });
    return;
  }
  const now = Date.now();
  await ctx.db.patch(order._id, {
    status: "settled",
    settledAt: now,
    source,
    paymentIntent,
  });
  if (order.couponId) {
    const settledCoupon = await ctx.db.get(order.couponId);
    if (settledCoupon) {
      await ctx.db.patch(settledCoupon._id, {
        reserved: settledCoupon.reserved - order.couponUses,
        consumed: settledCoupon.consumed + order.couponUses,
      });
    }
  }
  const seats = await ctx.db
    .query("registrationSeats")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(BATCH);
  await seats.reduce(async (previous, seat) => {
    await previous;
    await ctx.db.patch(seat._id, { state: "active", settledAt: now });
    const paid = { ...seat, settledAt: now };
    await seat.snapshot.materials.reduce(async (before, attachment) => {
      await before;
      await grantMaterial(ctx, paid, attachment);
    }, Promise.resolve());
    await enqueue(ctx, {
      key: `confirmation:${seat._id}`,
      kind: "email",
      recipient: seat.email,
      subject: `Registration confirmed: ${order.title}`,
      body: "Your registration is confirmed. Access your meetings and materials in your secure portal.",
      due: now,
      seatId: seat._id,
      sessionId: session?._id,
    });
    await scheduleEmails(ctx, paid, session, config);
  }, Promise.resolve());
  await enqueue(ctx, {
    key: `receipt:${order._id}`,
    kind: "email",
    recipient: order.purchaser,
    subject: `Receipt: ${order.title}`,
    body: `Payment recorded: USD ${(order.total / 100).toFixed(2)}. Attendees: ${order.seats.map((s) => s.attendee.name).join(", ")}. Request secure purchaser access to view your order.`,
    due: now,
  });
  await audit(ctx, "system", "settled", order._id, source);
}
