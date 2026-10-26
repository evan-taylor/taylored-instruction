import { ConvexError, v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { BATCH, type Quote } from "../shared/registration/domain";
import { materialAttachment } from "../shared/registration/validators";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  activeSeatMaterials,
  audit,
  materialJobEntitlementId,
  offering,
  release,
  staff,
} from "./registrationHelpers";
import { selectedMaterials } from "./registrationMaterialSelection";
import schema from "./schema";

async function currentSelection(
  ctx: QueryCtx,
  seat: Doc<"registrationSeats">
): Promise<Quote["materials"]> {
  const entitlements = await activeSeatMaterials(ctx, seat._id);
  const known = new Set(seat.snapshot.materials.map((item) => item.materialId));
  return [
    ...seat.snapshot.materials,
    ...entitlements
      .filter((item) => !known.has(item.materialId))
      .map((item) => ({
        id: item.attachmentId,
        materialId: item.materialId,
        title: item.title,
        cents: 0,
        policy: "included" as const,
      })),
  ];
}

export const selection = query({
  args: { seatId: v.id("registrationSeats") },
  returns: v.array(materialAttachment),
  handler: async (ctx, args) => {
    await staff(ctx);
    const seat = await ctx.db.get(args.seatId);
    if (!seat) {
      throw new ConvexError("Registration not found");
    }
    return await currentSelection(ctx, seat);
  },
});

export const additions = query({
  args: { orderId: v.id("registrationOrders") },
  returns: v.array(doc(schema, "registrationOrders")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationOrders")
      .withIndex("by_parentOrderId", (q) => q.eq("parentOrderId", args.orderId))
      .order("desc")
      .take(100);
  },
});

/** Read selection and revision together so agent edits cannot use a mixed snapshot. */
export const selectionState = query({
  args: { seatId: v.id("registrationSeats") },
  returns: v.object({
    orderId: v.id("registrationOrders"),
    revision: v.number(),
    materials: v.array(materialAttachment),
  }),
  handler: async (ctx, args) => {
    await staff(ctx);
    const seat = await ctx.db.get(args.seatId);
    const order = seat ? await ctx.db.get(seat.orderId) : null;
    if (!(seat && order)) {
      throw new ConvexError("Registration not found");
    }
    return {
      orderId: order._id,
      revision: order.materialRevision ?? 0,
      materials: await currentSelection(ctx, seat),
    };
  },
});

async function editableOrder(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  revision: number
) {
  const order = await ctx.db.get(seat.orderId);
  if (
    !order ||
    order.materialSeatId ||
    !["unpaid", "settled"].includes(order.status) ||
    !["held", "active"].includes(seat.state)
  ) {
    throw new ConvexError("Only active or unpaid registrations can be edited");
  }
  if ((order.materialRevision ?? 0) !== revision) {
    throw new ConvexError(
      "This order changed. Reopen the material editor and review the latest version."
    );
  }
  const additionsForOrder = await ctx.db
    .query("registrationOrders")
    .withIndex("by_parentOrderId", (q) => q.eq("parentOrderId", order._id))
    .take(101);
  if (additionsForOrder.length > 100) {
    throw new ConvexError("Material order history requires reconciliation");
  }
  if (
    additionsForOrder.some(
      (item) =>
        item.materialSeatId === seat._id &&
        ["unpaid", "hold", "exception"].includes(item.status)
    )
  ) {
    throw new ConvexError(
      "Settle or cancel the pending material balance before editing this attendee again"
    );
  }
  if (order.status === "unpaid") {
    if (seat.transferredFrom) {
      throw new ConvexError(
        "Settle the transfer balance before editing materials so the transfer credit is preserved"
      );
    }
    const invoices = await ctx.db
      .query("registrationInvoices")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(101);
    if (
      order.stripeSession ||
      invoices.length > 100 ||
      invoices.some((item) => item.status === "open" || item.status === "draft")
    ) {
      throw new ConvexError(
        "Void the invoice before editing. Orders with a card checkout already attached cannot be edited."
      );
    }
    if (order.couponId) {
      throw new ConvexError(
        "Unpaid discounted orders must be canceled and re-enrolled to recalculate the coupon safely"
      );
    }
  }
  return order;
}

async function cancelMaterials(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  removed: Quote["materials"]
) {
  const entitlements = await ctx.db
    .query("registrationEntitlements")
    .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
    .take(1001);
  if (entitlements.length > 1000) {
    throw new ConvexError("Material history requires reconciliation");
  }
  const ids = new Set(removed.map((item) => item.materialId));
  await Promise.all(
    entitlements
      .filter((item) => ids.has(item.materialId))
      .map((item) => ctx.db.patch(item._id, { state: "canceled" }))
  );
  const jobs = await ctx.db
    .query("registrationJobs")
    .withIndex("by_seatId_and_state", (q) =>
      q.eq("seatId", seat._id).eq("state", "pending")
    )
    .take(1001);
  if (jobs.length > 1000) {
    throw new ConvexError("Pending delivery history requires reconciliation");
  }
  const canceled = new Set(
    entitlements
      .filter((item) => ids.has(item.materialId))
      .map((item) => item._id)
  );
  await Promise.all(
    jobs
      .filter((job) => {
        const entitlementId = materialJobEntitlementId(ctx, job);
        return entitlementId && canceled.has(entitlementId);
      })
      .map((job) => ctx.db.patch(job._id, { state: "canceled" }))
  );
}

async function pricedLines(
  ctx: MutationCtx,
  materials: Quote["materials"]
): Promise<Quote["lines"]> {
  return await Promise.all(
    materials.map(async (item) => {
      const material = await ctx.db.get(item.materialId);
      return {
        id: item.id,
        materialId: item.materialId,
        title: item.title,
        cents: item.cents,
        discount: 0,
        ...(material?.taxCode ? { taxCode: material.taxCode } : {}),
      };
    })
  );
}

export const edit = mutation({
  args: {
    seatId: v.id("registrationSeats"),
    materialIds: v.array(v.id("registrationMaterials")),
    revision: v.number(),
    reason: v.string(),
    requestKey: v.string(),
  },
  returns: v.union(v.id("registrationOrders"), v.null()),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim() || args.requestKey.length < 24) {
      throw new ConvexError("A reason and operation key are required");
    }
    const storedSeat = await ctx.db.get(args.seatId);
    if (!storedSeat) {
      throw new ConvexError("Registration not found");
    }
    const seat = {
      ...storedSeat,
      snapshot: {
        ...storedSeat.snapshot,
        materials: await currentSelection(ctx, storedSeat),
      },
    };
    const previous = await ctx.db
      .query("registrationOrders")
      .withIndex("by_requestKey", (q) => q.eq("requestKey", args.requestKey))
      .unique();
    if (previous) {
      if (previous.materialSeatId !== seat._id) {
        throw new ConvexError("Operation key already used");
      }
      return previous._id;
    }
    const order = await editableOrder(ctx, seat, args.revision);
    const { config } = await offering(ctx, seat.courseId, seat.sessionId);
    const retained = seat.snapshot.materials.filter((item) =>
      args.materialIds.includes(item.materialId)
    );
    const removed = seat.snapshot.materials.filter(
      (item) => !args.materialIds.includes(item.materialId)
    );
    if (
      args.materialIds.length > BATCH ||
      new Set(args.materialIds).size !== args.materialIds.length
    ) {
      throw new ConvexError("Choose at most 50 distinct materials");
    }
    const added = await selectedMaterials(
      ctx,
      config,
      args.materialIds.filter(
        (id) => !retained.some((item) => item.materialId === id)
      ),
      seat.sessionId
    );
    if (!(added.length || removed.length)) {
      throw new ConvexError("No material changes to save");
    }
    const newLines = await pricedLines(ctx, added);
    const removedIds = new Set(removed.map((item) => item.materialId));
    let balanceId: Doc<"registrationOrders">["_id"] | null = null;
    if (order.status === "unpaid") {
      const lines = [
        ...seat.snapshot.lines.filter(
          (line) => !(line.materialId && removedIds.has(line.materialId))
        ),
        ...newLines,
      ];
      const snapshot = {
        ...seat.snapshot,
        materials: [...retained, ...added],
        lines,
        total: lines.reduce((sum, line) => sum + line.cents - line.discount, 0),
      };
      const seats = order.seats.map((item) =>
        item.attendee.email === seat.email ? snapshot : item
      );
      await ctx.db.patch(seat._id, {
        snapshot,
        excludedMaterialIds: [
          ...new Set([
            ...(seat.excludedMaterialIds ?? []),
            ...removed.map((item) => item.materialId),
          ]),
        ].filter((id) => !args.materialIds.includes(id)),
      });
      await ctx.db.patch(order._id, {
        seats,
        total: seats.reduce((sum, item) => sum + item.total, 0),
      });
    } else {
      // Purchase lines remain immutable so receipts and refund caps remain accurate.
      await cancelMaterials(ctx, seat, removed);
      await ctx.db.patch(seat._id, {
        snapshot: { ...seat.snapshot, materials: retained },
        excludedMaterialIds: [
          ...new Set([
            ...(seat.excludedMaterialIds ?? []),
            ...removed.map((item) => item.materialId),
            ...added.map((item) => item.materialId),
          ]),
        ],
      });
      if (added.length) {
        const total = newLines.reduce((sum, line) => sum + line.cents, 0);
        balanceId = await ctx.db.insert("registrationOrders", {
          requestKey: args.requestKey,
          parentOrderId: order._id,
          materialSeatId: seat._id,
          purchaser: order.purchaser,
          purchaserName: order.purchaserName,
          courseId: seat.courseId,
          sessionId: seat.sessionId,
          title: `Materials for ${seat.name} · ${order.title}`,
          status: "unpaid",
          seats: [
            {
              ...seat.snapshot,
              materials: added,
              lines: newLines,
              total,
              couponUsed: false,
            },
          ],
          total,
          currency: "usd",
          expires: Date.now(),
          couponUses: 0,
          restoredUses: 0,
          refunded: 0,
          refundReserved: 0,
          organizationId: order.organizationId,
          pricingNote: args.reason,
        });
      }
    }
    await ctx.db.patch(order._id, {
      materialRevision: (order.materialRevision ?? 0) + 1,
    });
    await audit(
      ctx,
      actor.userId,
      "materials-edited",
      order._id,
      JSON.stringify({
        seatId: seat._id,
        added,
        removed,
        balanceId,
        reason: args.reason,
      })
    );
    return balanceId;
  },
});

export const cancelAddition = mutation({
  args: { orderId: v.id("registrationOrders"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (
      !(
        order?.materialSeatId &&
        ["unpaid", "hold"].includes(order.status) &&
        args.reason.trim()
      )
    ) {
      throw new ConvexError(
        "An unpaid material balance and reason are required"
      );
    }
    await release(ctx, order, args.reason);
    await audit(
      ctx,
      actor.userId,
      "material-balance-canceled",
      order.parentOrderId ?? order._id,
      args.reason
    );
    return null;
  },
});
