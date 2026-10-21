import { v } from "convex/values";
import {
  type Attendee,
  BATCH,
  quote,
  type Settings,
} from "../shared/registration/domain";
import { answer } from "../shared/registration/validators";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { audit, offering, settle, staff } from "./registrationHelpers";
import { allocateRefund } from "./registrationRefundAllocation";

async function retainedCredit(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">,
  depth = 0
): Promise<number> {
  if (depth >= 100) {
    throw new Error("Transfer history requires reconciliation");
  }
  const order = await ctx.db.get(seat.orderId);
  if (!order) {
    throw new Error("Original order missing");
  }
  const refunds = await ctx.db
    .query("registrationRefunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(1000);
  if (refunds.length === 1000) {
    throw new Error("Refund history requires reconciliation");
  }
  let refunded = 0;
  for (const refund of refunds) {
    if (refund.state === "failed") {
      continue;
    }
    if (!refund.allocations) {
      throw new Error("Legacy refund requires line allocation reconciliation");
    }
    refunded += refund.allocations
      .filter((allocation) => allocation.email === seat.email)
      .reduce((sum, allocation) => sum + allocation.cents, 0);
  }
  const purchased =
    order.source === "waived"
      ? 0
      : order.seats
          .filter((item) => item.attendee.email === seat.email)
          .reduce((sum, item) => sum + item.total, 0);
  const previous = seat.transferredFrom
    ? await ctx.db.get(seat.transferredFrom)
    : null;
  const inherited = previous
    ? await retainedCredit(ctx, previous, depth + 1)
    : 0;
  return Math.max(
    0,
    Math.min(seat.snapshot.total, purchased - refunded + inherited)
  );
}

export const transfer = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    sessionId: v.id("registrationSessions"),
    choice: v.union(
      v.literal("collect"),
      v.literal("refund"),
      v.literal("keep")
    ),
    reason: v.string(),
    requestKey: v.string(),
    answers: v.optional(v.array(answer)),
  },
  returns: v.object({
    orderId: v.id("registrationOrders"),
    seatId: v.id("registrationSeats"),
    adjustment: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Transfer reason required");
    }
    const previous = await previousTransfer(ctx, args.seatId);
    if (previous) {
      return previous;
    }
    const source = await ctx.db.get(args.seatId);
    const target = await ctx.db.get(args.sessionId);
    if (
      !source?.settledAt ||
      source.state !== "active" ||
      !target ||
      target.state !== "open" ||
      target._id === source.sessionId
    ) {
      throw new Error(
        "Choose a settled active registration and a different open session"
      );
    }
    const { config } = await offering(ctx, target.courseId, target._id);
    if (target.reserved >= target.capacity) {
      throw new Error("Target session is full");
    }
    const duplicate = await ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_email", (q) =>
        q.eq("sessionId", target._id).eq("email", source.email)
      )
      .take(BATCH);
    if (
      duplicate.some((seat) => seat.state === "active" || seat.state === "held")
    ) {
      throw new Error("Attendee already registered in destination");
    }
    await rejectOfferedSeat(ctx, target._id, source.email);
    const selections = new Set(config.materials.map((m) => m.id));
    const [snapshot] = quote(
      config,
      [
        {
          ...source.snapshot.attendee,
          answers: destinationAnswers(
            config,
            source.snapshot.attendee,
            args.answers
          ),
          selected: source.snapshot.attendee.selected.filter((id) =>
            selections.has(id)
          ),
          waived: source.snapshot.attendee.waived.filter((id) =>
            selections.has(id)
          ),
        },
      ],
      null,
      0
    );
    if (!snapshot) {
      throw new Error("Unable to price transfer");
    }
    const credit = await retainedCredit(ctx, source);
    const difference = snapshot.total - credit;
    if (difference > 0 && args.choice === "refund") {
      throw new Error("Choose collect or keep for a higher-price transfer");
    }
    if (difference < 0 && args.choice === "collect") {
      throw new Error("Choose refund or keep for a lower-price transfer");
    }
    const sourceOrder = await ctx.db.get(source.orderId);
    if (!sourceOrder) {
      throw new Error("Original order missing");
    }
    const adjustment = args.choice === "keep" ? 0 : difference;
    const total = Math.max(0, adjustment);
    const orderId = await ctx.db.insert("registrationOrders", {
      requestKey: args.requestKey,
      purchaser: sourceOrder.purchaser,
      purchaserName: sourceOrder.purchaserName,
      courseId: target.courseId,
      sessionId: target._id,
      title: target.title,
      status: "unpaid",
      seats: [
        {
          ...snapshot,
          lines: await adjustmentLines(ctx, snapshot, total, config.taxCode),
          total,
        },
      ],
      total,
      currency: "usd",
      expires: Date.now() + 1_800_000,
      couponUses: 0,
      restoredUses: 0,
      refunded: 0,
      refundReserved: 0,
    });
    const seatId = await ctx.db.insert("registrationSeats", {
      orderId,
      courseId: target.courseId,
      sessionId: target._id,
      email: source.email,
      name: source.name,
      state: "held",
      snapshot: {
        ...snapshot,
        total: args.choice === "keep" ? credit : snapshot.total,
      },
      outcomeDefinitions: config.outcomes,
      transferredFrom: source._id,
    });
    await ctx.db.patch(target._id, { reserved: target.reserved + 1 });
    await ctx.db.patch(source._id, { state: "transferred" });
    if (source.sessionId) {
      const old = await ctx.db.get(source.sessionId);
      if (old) {
        await ctx.db.patch(old._id, { reserved: old.reserved - 1 });
        await ctx.scheduler.runAfter(0, internal.registrationWaitlist.advance, {
          sessionId: old._id,
        });
      }
    }
    // Preserve historical assignments, and reference matching already-delivered assets without consuming stock again.
    const oldEntitlements = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", source._id))
      .take(BATCH);
    await Promise.all(
      oldEntitlements
        .filter(
          (e) =>
            e.state === "ready" &&
            snapshot.materials.some((m) => m.materialId === e.materialId)
        )
        .map(({ _id, _creationTime, ...entitlement }) =>
          ctx.db.insert("registrationEntitlements", { ...entitlement, seatId })
        )
    );
    const pendingEntitlements = await ctx.db
      .query("registrationEntitlements")
      .withIndex("by_seatId", (q) => q.eq("seatId", source._id))
      .take(BATCH);
    await Promise.all(
      pendingEntitlements
        .filter((e) => e.state === "pending")
        .map((e) => ctx.db.patch(e._id, { state: "canceled" }))
    );
    await queueTransferRefund(
      ctx,
      source,
      adjustment,
      args.requestKey,
      args.reason,
      actor.userId
    );
    if (total === 0) {
      const order = await ctx.db.get(orderId);
      if (order) {
        await settle(ctx, order, "transfer");
      }
    }
    await ctx.db.insert("registrationTransfers", {
      from: source._id,
      to: seatId,
      actor: actor.userId,
      reason: args.reason,
      adjustment,
      choice: args.choice,
      at: Date.now(),
    });
    await audit(
      ctx,
      actor.userId,
      "registration-transferred",
      source._id,
      `${target._id}: ${adjustment}; ${args.reason}`
    );
    return { orderId, seatId, adjustment };
  },
});

async function previousTransfer(
  ctx: QueryCtx,
  seatId: Id<"registrationSeats">
) {
  const previous = await ctx.db
    .query("registrationTransfers")
    .withIndex("by_from", (q) => q.eq("from", seatId))
    .first();
  if (previous) {
    const destination = await ctx.db.get(previous.to);
    if (!destination) {
      throw new Error("Transfer requires reconciliation");
    }
    return {
      orderId: destination.orderId,
      seatId: destination._id,
      adjustment: previous.adjustment,
    };
  }
  return null;
}

function destinationAnswers(
  config: Settings,
  attendee: Attendee,
  supplied?: Attendee["answers"]
) {
  return (supplied ?? attendee.answers).filter((a) =>
    config.questions.some((q) => q.id === a.id)
  );
}

async function adjustmentLines(
  ctx: QueryCtx,
  snapshot: Doc<"registrationSeats">["snapshot"],
  total: number,
  tuitionTax?: string
) {
  let remaining = total;
  return await Promise.all(
    snapshot.lines.map(async (line, index) => {
      const cents =
        index === snapshot.lines.length - 1
          ? remaining
          : Math.floor(
              (total * (line.cents - line.discount)) /
                Math.max(1, snapshot.total)
            );
      remaining -= cents;
      const material = line.materialId
        ? await ctx.db.get(line.materialId)
        : null;
      return {
        ...line,
        title: `Transfer adjustment: ${line.title}`,
        cents,
        discount: 0,
        taxCode: line.materialId ? material?.taxCode : tuitionTax,
      };
    })
  );
}

async function queueTransferRefund(
  ctx: MutationCtx,
  source: Doc<"registrationSeats">,
  adjustment: number,
  requestKey: string,
  reason: string,
  actorId: Id<"users">
) {
  if (adjustment >= 0) {
    return;
  }
  await refundLineage(ctx, source, -adjustment, requestKey, reason, actorId, 0);
}

async function refundLineage(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  amount: number,
  requestKey: string,
  reason: string,
  actor: Id<"users">,
  depth: number
): Promise<void> {
  if (depth >= 100) {
    throw new Error("Transfer history requires reconciliation");
  }
  const order = await ctx.db.get(seat.orderId);
  let remaining = amount;
  if (order?.paymentIntent) {
    const history = await ctx.db
      .query("registrationRefunds")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect();
    const spent = history
      .filter((r) => r.state !== "failed")
      .reduce(
        (sum, r) =>
          sum +
          (r.allocations ?? [])
            .filter((a) => a.email === seat.email)
            .reduce((n, a) => n + a.cents, 0),
        0
      );
    const purchased = order.seats.filter(
      (s) => s.attendee.email === seat.email
    );
    const balance = purchased.reduce((sum, s) => sum + s.total, 0) - spent;
    const cents = Math.max(
      0,
      Math.min(
        remaining,
        balance,
        order.total - order.refunded - order.refundReserved
      )
    );
    if (cents > 0) {
      await ctx.db.patch(order._id, {
        refundReserved: order.refundReserved + cents,
      });
      await ctx.db.insert("registrationRefunds", {
        orderId: order._id,
        key: `transfer:${requestKey}:${order._id}`,
        cents,
        allocations: await allocateRefund(
          ctx,
          { ...order, seats: purchased, tax: 0 },
          cents
        ),
        reason,
        actor,
        state: "pending",
      });
      remaining -= cents;
    }
  }
  if (remaining === 0) {
    return;
  }
  const previous = seat.transferredFrom
    ? await ctx.db.get(seat.transferredFrom)
    : null;
  if (!previous) {
    throw new Error(
      "Original payments cannot support this refund; choose keep or reconcile first"
    );
  }
  await refundLineage(
    ctx,
    previous,
    remaining,
    requestKey,
    reason,
    actor,
    depth + 1
  );
}

export const preview = query({
  args: {
    seatId: v.id("registrationSeats"),
    sessionId: v.id("registrationSessions"),
  },
  returns: v.object({
    original: v.number(),
    destination: v.number(),
    difference: v.number(),
  }),
  handler: async (ctx, args) => {
    await staff(ctx);
    const seat = await ctx.db.get(args.seatId);
    const target = await ctx.db.get(args.sessionId);
    if (!(seat && target)) {
      throw new Error("Registration or session missing");
    }
    const { config } = await offering(ctx, target.courseId, target._id);
    const allowed = new Set(config.materials.map((m) => m.id));
    const [priced] = quote(
      { ...config, questions: [] },
      [
        {
          ...seat.snapshot.attendee,
          answers: [],
          selected: seat.snapshot.attendee.selected.filter((id) =>
            allowed.has(id)
          ),
          waived: seat.snapshot.attendee.waived.filter((id) => allowed.has(id)),
        },
      ],
      null,
      0
    );
    if (!priced) {
      throw new Error("Unable to price transfer");
    }
    return {
      original: seat.snapshot.total,
      destination: priced.total,
      difference: priced.total - (await retainedCredit(ctx, seat)),
    };
  },
});

async function rejectOfferedSeat(
  ctx: MutationCtx,
  sessionId: Id<"registrationSessions">,
  email: string
) {
  const offer = await ctx.db
    .query("registrationWaitlist")
    .withIndex("by_sessionId_and_email", (q) =>
      q.eq("sessionId", sessionId).eq("email", email)
    )
    .first();
  if (offer?.state === "offered") {
    throw new Error(
      "Decline the attendee’s waitlist offer before transferring into this session"
    );
  }
}
