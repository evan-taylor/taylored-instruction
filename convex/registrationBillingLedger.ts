import {
  agreedAmount,
  amountAfterCancellation,
} from "../shared/registration/billing";
import { formatMoney, type Quote } from "../shared/registration/domain";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * The organization balance ledger. Checkout, settlement, cancellation, and
 * transfers call these so every code-covered seat keeps exactly one line.
 */

export async function billingCodeByCode(ctx: QueryCtx, code: string) {
  return await ctx.db
    .query("registrationBillingCodes")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
}

/** Zeroes what the student pays and returns what the organization owes per seat. */
export function coverSeats(
  seats: Quote[],
  code: Pick<Doc<"registrationBillingCodes">, "pricing" | "amount">
) {
  return seats.map((seat) => ({
    listPrice: seat.total,
    lines: seat.lines.map((line) => ({
      id: line.id,
      title: line.title,
      cents: line.cents - line.discount,
      ...(line.taxCode ? { taxCode: line.taxCode } : {}),
    })),
    amount: agreedAmount(code, seat.total),
    seat: {
      ...seat,
      lines: seat.lines.map((line) => ({ ...line, discount: line.cents })),
      total: 0,
      couponUsed: false,
    },
  }));
}

export async function recordCharges(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  code: Doc<"registrationBillingCodes">,
  covered: ReturnType<typeof coverSeats>,
  seatIds: Id<"registrationSeats">[],
  session: Doc<"registrationSessions"> | null
) {
  await Promise.all(
    covered.map(({ listPrice, amount, lines, seat }, index) => {
      const seatId = seatIds[index];
      if (!seatId) {
        throw new Error("Seat missing for billing line");
      }
      return ctx.db.insert("registrationOrganizationCharges", {
        organizationId: code.organizationId,
        billingCodeId: code._id,
        code: code.code,
        orderId: order._id,
        seatId,
        courseId: order.courseId,
        sessionId: session?._id,
        attendeeName: seat.attendee.name,
        attendeeEmail: seat.attendee.email,
        title: order.title,
        classStart: session?.firstStart,
        listPrice,
        amount,
        lines,
        state: "unbilled",
      });
    })
  );
  await ctx.db.patch(code._id, { uses: code.uses + covered.length });
}

async function chargeForSeat(ctx: QueryCtx, seatId: Id<"registrationSeats">) {
  const rows = await ctx.db
    .query("registrationOrganizationCharges")
    .withIndex("by_seatId", (q) => q.eq("seatId", seatId))
    .take(10);
  return rows.find((row) => row.state !== "void") ?? null;
}

/**
 * Applies the cancellation policy to a canceled seat's balance line. Unbilled
 * lines are reversed or reduced to the administrative fee; invoiced lines keep
 * their amount and are flagged for staff. Returns what changed, if anything.
 */
export async function cancelCharge(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats">,
  actor: string,
  reason: string
) {
  const charge = await chargeForSeat(ctx, seat._id);
  if (!charge) {
    return null;
  }
  const now = Date.now();
  const session = charge.sessionId ? await ctx.db.get(charge.sessionId) : null;
  const remaining = amountAfterCancellation(
    charge.amount,
    session?.firstStart ?? charge.classStart,
    session?.state === "canceled",
    now
  );
  if (charge.state === "invoiced") {
    const detail = `Canceled after invoicing: ${reason}. Under the cancellation policy the organization owes ${formatMoney(remaining)} of ${formatMoney(charge.amount)}; credit or adjust the invoice by hand.`;
    await ctx.db.patch(charge._id, {
      followUp: { at: now, actor, reason: detail },
    });
    return detail;
  }
  const detail =
    remaining === 0
      ? `Canceled: ${reason}. Line reversed under the cancellation policy.`
      : `Canceled less than 7 days before class: ${reason}. The ${formatMoney(remaining)} administrative fee stays under the cancellation policy.`;
  await ctx.db.patch(charge._id, {
    amount: remaining,
    state: remaining === 0 ? "void" : "unbilled",
    adjustment: { at: now, actor, reason: detail },
  });
  if (remaining === 0) {
    const code = await ctx.db.get(charge.billingCodeId);
    if (code) {
      await ctx.db.patch(code._id, { uses: Math.max(0, code.uses - 1) });
    }
  }
  return detail;
}

/** Keeps a transferred seat's balance line pointing at the new class. */
export async function moveCharge(
  ctx: MutationCtx,
  fromSeatId: Id<"registrationSeats">,
  to: { orderId: Id<"registrationOrders">; seatId: Id<"registrationSeats"> },
  session: Doc<"registrationSessions">
) {
  const charge = await chargeForSeat(ctx, fromSeatId);
  if (!charge) {
    return;
  }
  await ctx.db.patch(charge._id, {
    orderId: to.orderId,
    seatId: to.seatId,
    sessionId: session._id,
    courseId: session.courseId,
    title: session.title,
    classStart: session.firstStart,
    followUpResolved: undefined,
  });
}

/** Puts an organization balance order's lines back on the unbilled balance. */
export async function returnBalanceLines(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">
) {
  if (!order.organizationBalance) {
    return;
  }
  const lines = await ctx.db
    .query("registrationOrganizationCharges")
    .withIndex("by_billingOrderId", (q) => q.eq("billingOrderId", order._id))
    .collect();
  await Promise.all(
    lines
      .filter((line) => line.state === "invoiced")
      .map((line) =>
        ctx.db.patch(line._id, { state: "unbilled", billingOrderId: undefined })
      )
  );
}
