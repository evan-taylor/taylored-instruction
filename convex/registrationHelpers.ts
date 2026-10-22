import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { ADMIN_EMAILS, isAdminEmail } from "../shared/adminEmails";
import { effective, email, HOLD_MS } from "../shared/registration/domain";
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
    throw new ConvexError("Verified staff sign-in required");
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
  throw new ConvexError("Forbidden");
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
    throw new ConvexError("Too many attempts. Try again later.");
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
    throw new ConvexError("Access expired. Request another access email.");
  }
  const id = await getAuthUserId(ctx);
  const user = id ? await ctx.db.get(id) : null;
  if (user?.email && user.emailVerificationTime !== undefined) {
    return email(user.email);
  }
  throw new ConvexError("Verified access required");
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
    throw new ConvexError("Offering not found");
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
  if (
    existing &&
    job.stepId &&
    (existing.state === "pending" || existing.state === "canceled")
  ) {
    await ctx.db.patch(existing._id, { ...job, state: "pending", attempts: 0 });
  }
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
    .collect();
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
  const invoices = await ctx.db
    .query("registrationInvoices")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .collect();
  await Promise.all(
    invoices
      .filter((i) => i.status === "open" || i.status === "draft")
      .map(async (invoice) => {
        await ctx.db.patch(invoice._id, {
          status: "void",
          voidedAt: Date.now(),
        });
        if (invoice.stripeInvoiceId) {
          await ctx.scheduler.runAfter(
            0,
            internal.registrationInvoiceActions.closeRemote,
            { id: invoice._id, attempt: 0 }
          );
        }
      })
  );
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
  const [sameMaterial, sameAttachment] = await Promise.all([
    ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId_and_materialId", (q) =>
        q.eq("seatId", seat._id).eq("materialId", attachment.materialId)
      )
      .first(),
    ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId_and_attachmentId", (q) =>
        q.eq("seatId", seat._id).eq("attachmentId", attachment.id)
      )
      .first(),
  ]);
  if (sameMaterial || sameAttachment) {
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
    const firstPending = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_materialId_and_state_and_paidAt", (q) =>
        q.eq("materialId", material._id).eq("state", "pending")
      )
      .first();
    if (code && firstPending?._id === id) {
      await assignCode(ctx, id, code, "system", "settlement");
    } else {
      if (code) {
        await ctx.scheduler.runAfter(
          0,
          internal.registrationOperations.restock,
          { materialId: material._id }
        );
      }
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
  reason: string,
  replace = false
) {
  const entitlement = await ctx.db.get(entitlementId);
  if (
    !entitlement ||
    code.state !== "available" ||
    code.materialId !== entitlement.materialId ||
    entitlement.state === "canceled" ||
    (entitlement.codeId !== undefined && !replace)
  ) {
    throw new ConvexError("Code unavailable or wrong inventory");
  }
  const seat = await ctx.db.get(entitlement.seatId);
  const session = seat?.sessionId ? await ctx.db.get(seat.sessionId) : null;
  if (
    !seat?.settledAt ||
    seat.state !== "active" ||
    session?.state === "canceled"
  ) {
    throw new ConvexError(
      "Code assignment requires an active paid registration"
    );
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
  await enqueue(ctx, {
    key: `assigned:${entitlementId}:${code._id}`,
    kind: "email",
    recipient: seat.email,
    subject: replace
      ? "Your replacement course code is ready"
      : "Your course material is ready",
    body: "Your course code is available in your secure registration portal.",
    due: Date.now(),
    seatId: seat._id,
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
  config: Doc<"registrationCourses">["settings"],
  initialRegistration = false
) {
  const previousJobs = await ctx.db
    .query("registrationJobs")
    .withIndex("by_seatId_and_state", (q) =>
      q.eq("seatId", seat._id).eq("state", "pending")
    )
    .take(100);
  await Promise.all(
    previousJobs
      .filter((job) => job.stepId)
      .map((job) => ctx.db.patch(job._id, { state: "canceled" }))
  );
  await Promise.all(
    config.emails.map(async (step) => {
      const sent = await ctx.db
        .query("registrationJobs")
        .withIndex("by_seatId_and_stepId_and_state", (q) =>
          q.eq("seatId", seat._id).eq("stepId", step.id).eq("state", "sent")
        )
        .first();
      if (sent) {
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
      const pending = previousJobs.some((job) => job.stepId === step.id);
      if (
        due < Date.now() &&
        !(pending || (step.anchor === "registration" && initialRegistration))
      ) {
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
  paymentIntent?: string,
  paidAt = Date.now()
) {
  if (order.status === "settled") {
    return;
  }
  if (order.status !== "hold" && order.status !== "unpaid") {
    await ctx.db.patch(order._id, {
      status: "exception",
      paymentIntent,
      source,
      settledAt: Date.now(),
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
    (source.startsWith("stripe-") &&
      session &&
      paidAt >= session.firstStart - config.cutoffMinutes * 60_000) ||
    (!course.enrollmentOpen &&
      source !== "staff-free" &&
      source !== "offline" &&
      source !== "waived" &&
      source !== "transfer" &&
      source !== "invoice")
  ) {
    await release(ctx, order, "Session canceled");
    await ctx.db.patch(order._id, {
      status: "exception",
      paymentIntent,
      source,
      settledAt: Date.now(),
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
    .collect();
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
    await scheduleEmails(ctx, paid, session, config, true);
  }, Promise.resolve());
  await enqueue(ctx, {
    key: `receipt:${order._id}`,
    kind: "email",
    recipient: order.purchaser,
    subject: `Receipt: ${order.title}`,
    body: `Payment recorded: USD ${((order.total + (order.tax ?? 0)) / 100).toFixed(2)}${order.tax ? ` (includes USD ${(order.tax / 100).toFixed(2)} sales tax)` : ""}. Attendees: ${order.seats.map((s) => s.attendee.name).join(", ")}. Request secure purchaser access to view your order.`,
    due: now,
  });
  await audit(ctx, "system", "settled", order._id, source);
}
