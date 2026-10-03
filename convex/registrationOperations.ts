import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import {
  BATCH,
  completion,
  csv,
  inventoryPreview,
  safeUrl,
} from "../shared/registration/domain";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  assignCode,
  audit,
  enqueue,
  grantMaterial,
  hash,
  offering,
  release,
  scheduleEmails,
  settle,
  staff,
} from "./registrationHelpers";
import schema from "./schema";

export const materials = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(doc(schema, "registrationMaterials")),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx);
    return await ctx.db
      .query("registrationMaterials")
      .paginate(args.paginationOpts);
  },
});
export const saveMaterial = mutation({
  args: {
    id: v.optional(v.id("registrationMaterials")),
    title: v.string(),
    kind: v.union(v.literal("pdf"), v.literal("link"), v.literal("keycode")),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    archived: v.boolean(),
  },
  returns: v.id("registrationMaterials"),
  handler: async (ctx, { id, ...args }) => {
    const actor = await staff(ctx);
    const previous = id ? await ctx.db.get(id) : null;
    if (!args.title.trim() || (previous && previous.kind !== args.kind)) {
      throw new Error("A material needs a title and an immutable kind");
    }
    if (args.kind === "pdf") {
      const file = args.storageId
        ? await ctx.db.system.get(args.storageId)
        : null;
      if (file?.contentType !== "application/pdf") {
        throw new Error("Upload a PDF");
      }
    }
    const value = {
      ...args,
      url: args.kind === "link" ? safeUrl(args.url ?? "") : undefined,
      version: (previous?.version ?? 0) + 1,
    };
    const result = id ?? (await ctx.db.insert("registrationMaterials", value));
    if (id) {
      await ctx.db.patch(id, value);
    }
    await audit(
      ctx,
      actor.userId,
      "material-saved",
      result,
      `version ${value.version}`
    );
    return result;
  },
});
export const uploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await staff(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
export const stock = query({
  args: {
    materialId: v.id("registrationMaterials"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(doc(schema, "registrationCodes")),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx);
    return await ctx.db
      .query("registrationCodes")
      .withIndex("by_materialId_and_state", (q) =>
        q.eq("materialId", args.materialId)
      )
      .paginate(args.paginationOpts);
  },
});
export const addStock = mutation({
  args: {
    materialId: v.id("registrationMaterials"),
    input: v.string(),
    preview: v.boolean(),
  },
  returns: v.object({
    added: v.number(),
    invalid: v.array(v.string()),
    duplicates: v.array(v.string()),
    valid: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const material = await ctx.db.get(args.materialId);
    if (material?.kind !== "keycode") {
      throw new Error("Choose keycode inventory");
    }
    const parsed = inventoryPreview(args.input);
    const valid: string[] = [];
    const duplicates = [...parsed.duplicates];
    await parsed.valid.reduce(async (prior, url) => {
      await prior;
      const fingerprint = await hash(url);
      const exists = await ctx.db
        .query("registrationCodes")
        .withIndex("by_fingerprint", (q) => q.eq("fingerprint", fingerprint))
        .unique();
      if (exists) {
        duplicates.push(url);
        return;
      }
      valid.push(url);
      if (!args.preview) {
        await ctx.db.insert("registrationCodes", {
          materialId: args.materialId,
          url,
          fingerprint,
          state: "available",
        });
      }
    }, Promise.resolve());
    if (!args.preview) {
      await ctx.db.patch(material._id, {
        availableCount: (material.availableCount ?? 0) + valid.length,
      });
      await audit(
        ctx,
        actor.userId,
        "inventory-restocked",
        args.materialId,
        `${valid.length} links`
      );
      await ctx.scheduler.runAfter(0, internal.registrationOperations.restock, {
        materialId: args.materialId,
      });
    }
    return {
      valid,
      invalid: parsed.invalid,
      duplicates,
      added: args.preview ? 0 : valid.length,
    };
  },
});
export const restock = internalMutation({
  args: { materialId: v.id("registrationMaterials") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_materialId_and_state_and_paidAt", (q) =>
        q.eq("materialId", args.materialId).eq("state", "pending")
      )
      .take(BATCH);
    const codes = await ctx.db
      .query("registrationCodes")
      .withIndex("by_materialId_and_state", (q) =>
        q.eq("materialId", args.materialId).eq("state", "available")
      )
      .take(BATCH);
    let assigned = 0;
    await pending.reduce(async (prior, entitlement) => {
      await prior;
      const code = codes[assigned];
      if (!code) {
        return;
      }
      const seat = await ctx.db.get(entitlement.seatId);
      const session = seat?.sessionId ? await ctx.db.get(seat.sessionId) : null;
      if (
        !seat?.settledAt ||
        seat.state !== "active" ||
        session?.state === "canceled"
      ) {
        await ctx.db.patch(entitlement._id, { state: "canceled" });
        return;
      }
      await assignCode(ctx, entitlement._id, code, "system", "FIFO restock");
      assigned += 1;
      await enqueue(ctx, {
        key: `restock:${entitlement._id}`,
        kind: "email",
        recipient: seat.email,
        subject: "Your course material is ready",
        body: "Your outstanding material is now available in your secure portal.",
        due: Date.now(),
        seatId: seat._id,
      });
    }, Promise.resolve());
    if (pending.length === BATCH && codes.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrationOperations.restock,
        args
      );
    }
    return null;
  },
});
export const manageCode = mutation({
  args: {
    codeId: v.id("registrationCodes"),
    entitlementId: v.optional(v.id("registrationEntitlements")),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Reason required");
    }
    const code = await ctx.db.get(args.codeId);
    if (code?.state !== "available") {
      throw new Error("Only unused codes can be assigned or retired");
    }
    if (args.entitlementId) {
      await assignCode(
        ctx,
        args.entitlementId,
        code,
        actor.userId,
        args.reason
      );
    } else {
      await ctx.db.patch(code._id, { state: "retired" });
      const material = await ctx.db.get(code.materialId);
      if (material) {
        await ctx.db.patch(material._id, {
          availableCount: Math.max(0, (material.availableCount ?? 0) - 1),
          retiredCount: (material.retiredCount ?? 0) + 1,
        });
      }
    }
    await audit(
      ctx,
      actor.userId,
      args.entitlementId ? "code-assigned" : "code-retired",
      code._id,
      args.reason
    );
    return null;
  },
});
export const roster = query({
  args: {
    sessionId: v.id("registrationSessions"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(doc(schema, "registrationSeats")),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx, args.sessionId);
    return await ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_state", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .paginate(args.paginationOpts);
  },
});
export const outcomeState = query({
  args: { seatId: v.id("registrationSeats") },
  returns: v.object({
    values: v.array(doc(schema, "registrationOutcomes")),
    attendance: v.array(doc(schema, "registrationAttendance")),
    completion: v.string(),
  }),
  handler: async (ctx, args) => {
    const seat = await ctx.db.get(args.seatId);
    if (!seat) {
      throw new Error("Registration not found");
    }
    await staff(ctx, seat.sessionId);
    const values = await ctx.db
      .query("registrationOutcomes")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .take(200);
    const attendance = await ctx.db
      .query("registrationAttendance")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .take(BATCH);
    const override = await ctx.db
      .query("registrationOverrides")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .order("desc")
      .first();
    const overridden = override?.complete
      ? "complete (admin override)"
      : "incomplete (admin override)";
    return {
      values,
      attendance,
      completion: override
        ? overridden
        : completion(seat.outcomeDefinitions, values),
    };
  },
});
export const recordOutcome = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    fieldId: v.string(),
    value: v.union(v.string(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const seat = await ctx.db.get(args.seatId);
    if (!seat) {
      throw new Error("Registration not found");
    }
    const actor = await staff(ctx, seat.sessionId);
    const definition = seat.outcomeDefinitions.find(
      (d) => d.id === args.fieldId
    );
    if (
      !definition ||
      (definition.type === "percentage"
        ? typeof args.value !== "number" || args.value < 0 || args.value > 100
        : typeof args.value !== "string" ||
          !definition.options.includes(args.value))
    ) {
      throw new Error("Invalid outcome value");
    }
    const values = await ctx.db
      .query("registrationOutcomes")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .take(200);
    const previous = values.find(
      (entry) =>
        entry.fieldId === args.fieldId && entry.version === definition.version
    );
    const value = {
      ...args,
      version: definition.version,
      actor: actor.userId,
      at: Date.now(),
    };
    if (previous) {
      await ctx.db.patch(previous._id, value);
    } else {
      await ctx.db.insert("registrationOutcomes", value);
    }
    await audit(
      ctx,
      actor.userId,
      "outcome-edited",
      seat._id,
      JSON.stringify({
        previous: previous?.value ?? null,
        value: args.value,
        field: args.fieldId,
        version: definition.version,
      })
    );
    return null;
  },
});
export const attendance = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    meetingId: v.string(),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("not-recorded")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const seat = await ctx.db.get(args.seatId);
    if (!seat?.sessionId) {
      throw new Error("Scheduled registration required");
    }
    const actor = await staff(ctx, seat.sessionId);
    const session = await ctx.db.get(seat.sessionId);
    if (!session?.meetings.some((m) => m.id === args.meetingId)) {
      throw new Error("Meeting not found");
    }
    const rows = await ctx.db
      .query("registrationAttendance")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .take(BATCH);
    const previous = rows.find((row) => row.meetingId === args.meetingId);
    if (previous) {
      await ctx.db.patch(previous._id, {
        status: args.status,
        actor: actor.userId,
      });
    } else {
      await ctx.db.insert("registrationAttendance", {
        ...args,
        actor: actor.userId,
      });
    }
    await audit(
      ctx,
      actor.userId,
      "attendance",
      seat._id,
      `${args.meetingId}: ${args.status}`
    );
    return null;
  },
});
export const overrideCompletion = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    complete: v.boolean(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Reason required");
    }
    await ctx.db.insert("registrationOverrides", {
      ...args,
      actor: actor.userId,
      at: Date.now(),
    });
    await audit(
      ctx,
      actor.userId,
      "completion-override",
      args.seatId,
      args.reason
    );
    return null;
  },
});
export const exportRoster = query({
  args: {
    sessionId: v.id("registrationSessions"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    csv: v.string(),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx, args.sessionId);
    const result = await ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_state", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .paginate(args.paginationOpts);
    return {
      csv: csv([
        ["Name", "Email", "State"],
        ...result.page.map((s) => [s.name, s.email, s.state]),
      ]),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});
export const selectedEmail = mutation({
  args: {
    sessionId: v.id("registrationSessions"),
    seats: v.array(v.id("registrationSeats")),
    subject: v.string(),
    body: v.string(),
    requestKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx, args.sessionId);
    if (args.seats.length > BATCH || !args.subject.trim()) {
      throw new Error("Choose 1–50 recipients and a subject");
    }
    await Promise.all(
      args.seats.map(async (id) => {
        const seat = await ctx.db.get(id);
        if (seat?.sessionId !== args.sessionId) {
          throw new Error("Recipient outside session");
        }
        await enqueue(ctx, {
          key: `staff:${args.requestKey}:${id}`,
          kind: "email",
          recipient: seat.email,
          subject: args.subject,
          body: args.body,
          due: Date.now(),
          seatId: id,
          sessionId: args.sessionId,
        });
      })
    );
    await audit(
      ctx,
      actor.userId,
      "selected-email",
      args.sessionId,
      JSON.stringify({
        seats: args.seats,
        subject: args.subject,
        body: args.body,
      })
    );
    return null;
  },
});
export const recordPayment = mutation({
  args: {
    orderId: v.id("registrationOrders"),
    source: v.union(v.literal("offline"), v.literal("waived")),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Reason required");
    }
    const order = await ctx.db.get(args.orderId);
    if (order?.status !== "unpaid") {
      throw new Error("Unpaid enrollment required");
    }
    await settle(ctx, order, args.source);
    await audit(ctx, actor.userId, args.source, order._id, args.reason);
    return null;
  },
});
export const restoreCoupon = mutation({
  args: { orderId: v.id("registrationOrders"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order?.couponId || order.status !== "settled" || !args.reason.trim()) {
      throw new Error("Settled coupon use and reason required");
    }
    const uses = order.couponUses - order.restoredUses;
    const coupon = await ctx.db.get(order.couponId);
    if (coupon && uses > 0) {
      await ctx.db.patch(coupon._id, { consumed: coupon.consumed - uses });
      await ctx.db.patch(order._id, { restoredUses: order.couponUses });
      await audit(ctx, actor.userId, "coupon-restored", order._id, args.reason);
    }
    return null;
  },
});
export const cancelSeat = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    reason: v.string(),
    notify: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Reason required");
    }
    const seat = await ctx.db.get(args.seatId);
    if (!seat || seat.state === "canceled" || seat.state === "transferred") {
      return null;
    }
    const order = await ctx.db.get(seat.orderId);
    if (order && (order.status === "hold" || order.status === "unpaid")) {
      await release(ctx, order, args.reason);
    } else {
      await ctx.db.patch(seat._id, { state: "canceled" });
      if (seat.sessionId) {
        const session = await ctx.db.get(seat.sessionId);
        if (session) {
          await ctx.db.patch(session._id, { reserved: session.reserved - 1 });
          await ctx.scheduler.runAfter(
            0,
            internal.registrationWaitlist.advance,
            { sessionId: session._id }
          );
        }
      }
    }
    const pendingEntitlements = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
      .take(BATCH);
    await Promise.all(
      pendingEntitlements
        .filter((e) => e.state === "pending")
        .map((e) => ctx.db.patch(e._id, { state: "canceled" }))
    );
    if (args.notify) {
      await enqueue(ctx, {
        key: `cancel:${seat._id}`,
        kind: "email",
        recipient: seat.email,
        subject: "Registration canceled",
        body: "Your registration was canceled. A cancellation does not automatically refund your payment. Please contact us for assistance.",
        due: Date.now(),
      });
    }
    await audit(
      ctx,
      actor.userId,
      "registration-canceled",
      seat._id,
      `${args.reason}; notify=${args.notify}`
    );
    return null;
  },
});
export const cancelSession = mutation({
  args: {
    sessionId: v.id("registrationSessions"),
    notify: v.boolean(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Reason required");
    }
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.state === "canceled") {
      return null;
    }
    await ctx.db.patch(session._id, {
      state: "canceled",
      revision: session.revision + 1,
      meetings: session.meetings.map((m) => ({
        ...m,
        sequence: m.sequence + 1,
      })),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.registrationOperations.reschedule,
      { sessionId: session._id, notify: args.notify, cursor: null }
    );
    await ctx.scheduler.runAfter(0, internal.registrationWaitlist.advance, {
      sessionId: session._id,
    });
    if (args.notify) {
      await Promise.all(
        session.instructors.map(async (userId) => {
          const user = await ctx.db.get(userId);
          if (user?.email) {
            await enqueue(ctx, {
              key: `instructor-cancel:${session._id}:${userId}`,
              kind: "email",
              recipient: user.email,
              subject: `Session canceled: ${session.title}`,
              body: "Your assigned session has been canceled. Review the roster for registration follow-up.",
              due: Date.now(),
            });
          }
        })
      );
    }
    await audit(
      ctx,
      actor.userId,
      "session-canceled",
      session._id,
      `${args.reason}; notify=${args.notify}`
    );
    return null;
  },
});
export const reschedule = internalMutation({
  args: {
    sessionId: v.id("registrationSessions"),
    notify: v.boolean(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }
    const { config } = await offering(ctx, session.courseId, session._id);
    const page = await ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_state", (q) =>
        q.eq("sessionId", session._id)
      )
      .paginate({ cursor: args.cursor, numItems: BATCH });
    await page.page.reduce(async (prior, seat) => {
      await prior;
      const jobs = await ctx.db
        .query("registrationJobs")
        .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
        .take(200);
      await Promise.all(
        jobs
          .filter((j) => j.stepId && j.state === "pending")
          .map((j) => ctx.db.patch(j._id, { state: "canceled" }))
      );
      if (session.state === "canceled" && seat.state === "held") {
        const order = await ctx.db.get(seat.orderId);
        if (order) {
          await release(ctx, order, "Session canceled");
        }
      }
      if (seat.state === "active" && seat.settledAt) {
        if (session.state === "open") {
          await scheduleEmails(ctx, seat, session, config);
        }
        if (args.notify) {
          await enqueue(ctx, {
            key: `schedule:${seat._id}:${session.revision}`,
            kind: "email",
            recipient: seat.email,
            subject: `Session ${session.state === "canceled" ? "canceled" : "updated"}: ${session.title}`,
            body: "Your session has changed. View the latest schedule in your portal. Contact us for assistance.",
            due: Date.now(),
            seatId: seat._id,
            sessionId: session._id,
          });
        }
      }
    }, Promise.resolve());
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrationOperations.reschedule,
        { ...args, cursor: page.continueCursor }
      );
    }
    return null;
  },
});
export const propagate = internalMutation({
  args: {
    courseId: v.id("registrationCourses"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (course?.delivery !== "scheduled") {
      return null;
    }
    const page = await ctx.db
      .query("registrationSeats")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .paginate({ cursor: args.cursor, numItems: BATCH });
    await page.page.reduce(async (prior, seat) => {
      await prior;
      if (!seat.settledAt || seat.state !== "active" || !seat.sessionId) {
        return;
      }
      const session = await ctx.db.get(seat.sessionId);
      if (session?.state !== "open" || session.firstStart <= Date.now()) {
        return;
      }
      if (session.overrides.outcomes === undefined) {
        await ctx.db.patch(seat._id, {
          outcomeDefinitions: course.settings.outcomes,
        });
      }
      if (session.overrides.materials !== undefined) {
        return;
      }
      await course.settings.materials
        .filter((m) => m.policy === "included")
        .reduce(async (before, material) => {
          await before;
          await grantMaterial(ctx, seat, material);
        }, Promise.resolve());
    }, Promise.resolve());
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrationOperations.propagate,
        { ...args, cursor: page.continueCursor }
      );
    }
    return null;
  },
});
export const orders = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(doc(schema, "registrationOrders")),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx);
    return await ctx.db
      .query("registrationOrders")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
export const activity = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(doc(schema, "registrationActivity")),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx);
    return await ctx.db
      .query("registrationActivity")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
export const attention = query({
  args: {},
  returns: v.object({
    emails: v.array(doc(schema, "registrationJobs")),
    unpaid: v.array(doc(schema, "registrationOrders")),
    payments: v.array(doc(schema, "registrationOrders")),
    refunds: v.array(doc(schema, "registrationRefunds")),
  }),
  handler: async (ctx) => {
    await staff(ctx);
    return {
      refunds: await ctx.db
        .query("registrationRefunds")
        .withIndex("by_state", (q) => q.eq("state", "pending"))
        .take(BATCH),
      emails: await ctx.db
        .query("registrationJobs")
        .withIndex("by_state_and_due", (q) => q.eq("state", "failed"))
        .take(BATCH),
      unpaid: await ctx.db
        .query("registrationOrders")
        .withIndex("by_status_and_expires", (q) => q.eq("status", "unpaid"))
        .take(BATCH),
      payments: await ctx.db
        .query("registrationOrders")
        .withIndex("by_status_and_expires", (q) => q.eq("status", "exception"))
        .take(BATCH),
    };
  },
});
export const retryEmail = mutation({
  args: { id: v.id("registrationJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const job = await ctx.db.get(args.id);
    if (job?.state === "failed") {
      await ctx.db.patch(job._id, {
        state: "pending",
        due: Date.now(),
        attempts: 0,
      });
      await audit(
        ctx,
        actor.userId,
        "email-retry",
        job._id,
        "Retry existing delivery"
      );
    }
    return null;
  },
});
export const assignedSessions = query({
  args: {},
  returns: v.array(doc(schema, "registrationSessions")),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Sign in required");
    }
    const assignments = await ctx.db
      .query("registrationInstructorAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(BATCH);
    const sessions = await Promise.all(
      assignments.map((a) => ctx.db.get(a.sessionId))
    );
    return sessions.filter((s) => s !== null);
  },
});
export const sessionForStaff = query({
  args: { sessionId: v.id("registrationSessions") },
  returns: v.union(doc(schema, "registrationSessions"), v.null()),
  handler: async (ctx, args) => {
    await staff(ctx, args.sessionId);
    return await ctx.db.get(args.sessionId);
  },
});
export const staffDirectory = query({
  args: {},
  returns: v.array(v.object({ id: v.id("users"), email: v.string() })),
  handler: async (ctx) => {
    await staff(ctx);
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_instructor_status", (q) => q.eq("isInstructor", true))
      .take(BATCH);
    const users = await Promise.all(
      profiles.filter((p) => !p.deactivatedAt).map((p) => ctx.db.get(p.userId))
    );
    return users
      .filter((u) => u !== null)
      .filter((u) => u.emailVerificationTime !== undefined && Boolean(u.email))
      .map((u) => ({ id: u._id, email: u.email ?? "" }));
  },
});
export const saveLocation = mutation({
  args: {
    id: v.optional(v.id("registrationLocations")),
    name: v.string(),
    address: v.string(),
    instructions: v.string(),
    archived: v.boolean(),
  },
  returns: v.id("registrationLocations"),
  handler: async (ctx, { id, ...value }) => {
    const actor = await staff(ctx);
    if (!value.name.trim()) {
      throw new Error("Location name required");
    }
    const saved = id ?? (await ctx.db.insert("registrationLocations", value));
    if (id) {
      await ctx.db.patch(id, value);
    }
    await audit(ctx, actor.userId, "location-saved", saved, value.name);
    return saved;
  },
});
export const locations = query({
  args: {},
  returns: v.array(doc(schema, "registrationLocations")),
  handler: async (ctx) => {
    await staff(ctx);
    return await ctx.db.query("registrationLocations").take(BATCH);
  },
});
export const orderSeats = query({
  args: { orderId: v.id("registrationOrders") },
  returns: v.array(doc(schema, "registrationSeats")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationSeats")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(BATCH);
  },
});
export const seatMaterials = query({
  args: { seatId: v.id("registrationSeats") },
  returns: v.array(doc(schema, "registrationEntitlements")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", args.seatId))
      .take(BATCH);
  },
});
export const missingMaterials = query({
  args: {
    materialId: v.id("registrationMaterials"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(doc(schema, "registrationEntitlements")),
    continueCursor: v.string(),
    isDone: v.boolean(),
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
    await staff(ctx);
    return await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_materialId_and_state_and_paidAt", (q) =>
        q.eq("materialId", args.materialId).eq("state", "pending")
      )
      .paginate(args.paginationOpts);
  },
});
export const resendMaterials = mutation({
  args: { seatId: v.id("registrationSeats"), key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const seat = await ctx.db.get(args.seatId);
    if (!seat?.settledAt) {
      throw new Error("Settled registration required");
    }
    await enqueue(ctx, {
      key: `resend:${args.key}:${seat._id}`,
      kind: "email",
      recipient: seat.email,
      subject: "Your course materials",
      body: "Your assigned materials are available in your secure portal. Request email access to view them.",
      due: Date.now(),
      seatId: seat._id,
    });
    await audit(
      ctx,
      actor.userId,
      "materials-resent",
      seat._id,
      "Existing assignments retained"
    );
    return null;
  },
});
export const testEmail = mutation({
  args: {
    subject: v.string(),
    body: v.string(),
    recipient: v.string(),
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (
      !process.env.REGISTRATION_TEST_RECIPIENT ||
      args.recipient !== process.env.REGISTRATION_TEST_RECIPIENT
    ) {
      throw new Error("Choose the configured safe test recipient");
    }
    await enqueue(ctx, {
      key: `test:${args.key}`,
      kind: "email",
      recipient: args.recipient,
      subject: args.subject,
      body: args.body,
      due: Date.now(),
    });
    await audit(ctx, actor.userId, "email-test", args.key, args.subject);
    return null;
  },
});
export const replaceCode = mutation({
  args: { entitlementId: v.id("registrationEntitlements"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const entitlement = await ctx.db.get(args.entitlementId);
    if (entitlement?.kind !== "keycode" || !args.reason.trim()) {
      throw new Error("Choose a keycode entitlement and provide a reason");
    }
    const code = await ctx.db
      .query("registrationCodes")
      .withIndex("by_materialId_and_state", (q) =>
        q.eq("materialId", entitlement.materialId).eq("state", "available")
      )
      .first();
    if (!code) {
      throw new Error("Restock this inventory before replacing a code");
    }
    await assignCode(ctx, entitlement._id, code, actor.userId, args.reason);
    await audit(
      ctx,
      actor.userId,
      "keycode-replaced",
      entitlement._id,
      args.reason
    );
    return null;
  },
});

export const assignmentHistory = query({
  args: { entitlementId: v.id("registrationEntitlements") },
  returns: v.array(
    v.object({ at: v.number(), reason: v.string(), url: v.string() })
  ),
  handler: async (ctx, args) => {
    await staff(ctx);
    const rows = await ctx.db
      .query("registrationAssignments")
      .withIndex("by_entitlementId", (q) =>
        q.eq("entitlementId", args.entitlementId)
      )
      .take(100);
    return await Promise.all(
      rows.map(async (row) => ({
        at: row.at,
        reason: row.reason,
        url: (await ctx.db.get(row.codeId))?.url ?? "Unavailable",
      }))
    );
  },
});
