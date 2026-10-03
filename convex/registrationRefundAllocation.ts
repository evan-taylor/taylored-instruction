import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Stable seat/line order makes partial refunds reproducible and auditable.
export async function allocateRefund(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  amount: number
) {
  const prior = await ctx.db
    .query("registrationRefunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(1000);
  if (prior.length === 1000) {
    throw new Error("Refund history requires reconciliation");
  }
  const consumed = new Map<string, number>();
  for (const refund of prior.filter((r) => r.state !== "failed")) {
    if (!refund.allocations) {
      throw new Error("Legacy refund requires line allocation reconciliation");
    }
    for (const a of refund.allocations) {
      const key = `${a.email}:${a.lineId}`;
      consumed.set(key, (consumed.get(key) ?? 0) + a.cents);
    }
  }
  let remaining = amount;
  const allocations: { email: string; lineId: string; cents: number }[] = [];
  for (const seat of order.seats) {
    for (const line of seat.lines) {
      const available =
        line.cents -
        line.discount -
        (consumed.get(`${seat.attendee.email}:${line.id}`) ?? 0);
      const value = Math.min(remaining, Math.max(0, available));
      if (value > 0) {
        allocations.push({
          email: seat.attendee.email,
          lineId: line.id,
          cents: value,
        });
        remaining -= value;
      }
    }
  }
  if (remaining) {
    throw new Error("Refund exceeds unrefunded purchased lines");
  }
  return allocations;
}
