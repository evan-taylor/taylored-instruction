import { ConvexError, v } from "convex/values";
import {
  AGREEMENT_LABEL,
  type CancellationPolicy,
  CURRENT_CANCELLATION_POLICY,
  cancellationPolicyUrl,
  policyDate,
  policySnapshot,
  sha256,
} from "../shared/cancellation-policy";
import type { EvidenceData } from "../shared/registration/evidence";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { audit, staff } from "./registrationHelpers";

/**
 * The only writer of registrationPolicyAcknowledgements. Rows are inserted
 * once and never patched, replaced, or deleted, except that the Stripe
 * Checkout Session and PaymentIntent ids are each filled in once when Stripe
 * reports them. No public function edits a row, for staff or anyone else.
 */

type Acknowledgement = Doc<"registrationPolicyAcknowledgements">;
type Evidence = Omit<
  Acknowledgement,
  | "_id"
  | "_creationTime"
  | "digest"
  | "stripeCheckoutSession"
  | "stripePaymentIntent"
>;

export const policyAgreement = v.object({
  version: v.string(),
  label: v.string(),
});

/** Rejects a missing agreement, an altered label, or an outdated version. */
export function requireAgreement(agreement?: {
  version: string;
  label: string;
}) {
  if (!agreement || agreement.label !== AGREEMENT_LABEL) {
    throw new ConvexError(
      "Agree to the Cancellation Policy to continue to payment"
    );
  }
  if (agreement.version !== CURRENT_CANCELLATION_POLICY.version) {
    throw new ConvexError(
      "Our Cancellation Policy was updated. Reload the page, review it, and agree again."
    );
  }
  return CURRENT_CANCELLATION_POLICY;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, field]) => field !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, field]) => [key, canonical(field)])
    );
  }
  return value;
}

/** SHA-256 over the immutable fields, in a stable key order. */
export function evidenceDigest(row: Evidence) {
  return sha256(JSON.stringify(canonical(row)));
}

export async function verifyAcknowledgement(row: Acknowledgement) {
  const {
    _id,
    _creationTime,
    digest,
    stripeCheckoutSession,
    stripePaymentIntent,
    ...fields
  } = row;
  const policy = CURRENT_CANCELLATION_POLICY.version === row.policyVersion;
  return {
    digestMatches: (await evidenceDigest(fields)) === digest,
    hashMatches: (await sha256(row.policySnapshot)) === row.policyHash,
    currentVersion: policy,
  };
}

async function record(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  entry: Pick<Evidence, "kind" | "channel" | "statement" | "actor"> & {
    invoiceId?: Id<"registrationInvoices">;
    policy: CancellationPolicy;
  }
) {
  const seats = await ctx.db
    .query("registrationSeats")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(100);
  const request =
    entry.kind === "click-through"
      ? await ctx.meta.getRequestMetadata()
      : { ip: null, userAgent: null };
  const snapshot = policySnapshot(entry.policy);
  const fields: Evidence = {
    kind: entry.kind,
    channel: entry.channel,
    policyVersion: entry.policy.version,
    policyHash: await sha256(snapshot),
    policySnapshot: snapshot,
    statement: entry.statement,
    recordedAt: Date.now(),
    purchaserName: order.purchaserName,
    purchaserEmail: order.purchaser,
    orderId: order._id,
    seatIds: seats.map((seat) => seat._id),
    sessionId: order.sessionId,
    courseId: order.courseId,
    invoiceId: entry.invoiceId,
    actor: entry.actor,
    ip: request.ip,
    userAgent: request.userAgent,
  };
  return await ctx.db.insert("registrationPolicyAcknowledgements", {
    ...fields,
    digest: await evidenceDigest(fields),
  });
}

function acknowledgements(ctx: QueryCtx, orderId: Id<"registrationOrders">) {
  return ctx.db
    .query("registrationPolicyAcknowledgements")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(50);
}

/** Records a purchaser's checkbox agreement, with their IP and user agent. */
export async function recordClickThrough(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  channel: "registration-form" | "payment-request-page",
  agreement?: { version: string; label: string }
) {
  const policy = requireAgreement(agreement);
  const existing = await acknowledgements(ctx, order._id);
  if (
    existing.some(
      (row) =>
        row.kind === "click-through" &&
        row.channel === channel &&
        row.policyVersion === policy.version
    )
  ) {
    return;
  }
  await record(ctx, order, {
    kind: "click-through",
    channel,
    statement: AGREEMENT_LABEL,
    actor: "guest",
    policy,
  });
}

/**
 * Records that staff booked the order, so the payer never saw a checkbox;
 * the policy is disclosed to them by email and, when invoiced, on the invoice.
 */
export async function recordDisclosure(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  actor: string,
  invoice?: Doc<"registrationInvoices">
) {
  const policy = CURRENT_CANCELLATION_POLICY;
  const path = `/cancellation-policy/v/${policy.version}`;
  await record(ctx, order, {
    kind: "disclosed",
    channel: invoice ? "invoice" : "staff-booking",
    statement: invoice
      ? `Not a click-through. Invoice ${invoice.number} was sent to ${invoice.billToEmail}; its footer and the invoice email state that the order is subject to Cancellation Policy version ${policy.version} and link to ${path}.`
      : `Not a click-through. Staff booked this order, so the purchaser did not check an agreement box. Their confirmation email states that the order is subject to Cancellation Policy version ${policy.version} and links to ${path}.`,
    actor,
    invoiceId: invoice?._id,
    policy,
  });
}

/**
 * A public reservation needs the purchaser's agreement, or the whole
 * mutation rolls back; a staff booking records a disclosure instead.
 */
export async function recordReservationAgreement(
  ctx: MutationCtx,
  order: Doc<"registrationOrders">,
  staffUserId: string | undefined,
  agreement?: { version: string; label: string }
) {
  if (staffUserId) {
    await recordDisclosure(ctx, order, staffUserId);
    return;
  }
  await recordClickThrough(ctx, order, "registration-form", agreement);
}

export async function hasClickThrough(
  ctx: QueryCtx,
  orderId: Id<"registrationOrders">
) {
  const rows = await acknowledgements(ctx, orderId);
  return rows.some((row) => row.kind === "click-through");
}

/** Fills in each Stripe id once; an id already recorded is never replaced. */
export async function linkStripePayment(
  ctx: MutationCtx,
  orderId: Id<"registrationOrders">,
  stripe: { checkoutSession?: string; paymentIntent?: string }
) {
  const rows = await acknowledgements(ctx, orderId);
  await Promise.all(
    rows.map((row) => {
      const patch = {
        ...(row.stripeCheckoutSession === undefined &&
        row.kind === "click-through" &&
        stripe.checkoutSession
          ? { stripeCheckoutSession: stripe.checkoutSession }
          : {}),
        ...(row.stripePaymentIntent === undefined && stripe.paymentIntent
          ? { stripePaymentIntent: stripe.paymentIntent }
          : {}),
      };
      return Object.keys(patch).length
        ? ctx.db.patch(row._id, patch)
        : Promise.resolve();
    })
  );
}

/** The acknowledgement an email should cite: the newest click-through, else the newest disclosure. */
export async function citedAcknowledgement(
  ctx: QueryCtx,
  orderId: Id<"registrationOrders">
) {
  const rows = await acknowledgements(ctx, orderId);
  const newest = (kind: Acknowledgement["kind"]) =>
    [...rows].reverse().find((row) => row.kind === kind);
  return newest("click-through") ?? newest("disclosed") ?? null;
}

/** The post-purchase notice line for confirmation and invoice emails. */
export function policyEmailLine(
  ack: Pick<Acknowledgement, "kind" | "policyVersion" | "recordedAt">,
  origin: string
) {
  const url = cancellationPolicyUrl(origin, ack.policyVersion);
  const link = `[${url}](${url})`;
  return ack.kind === "click-through"
    ? `You agreed to our Cancellation Policy (version ${ack.policyVersion}) on ${policyDate(ack.recordedAt)}. Read that version at ${link}`
    : `This registration is subject to our Cancellation Policy (version ${ack.policyVersion}). Read it at ${link}`;
}

const EMAIL_LABELS: Record<string, string> = {
  receipt: "Purchaser confirmation (receipt)",
  invoice: "Invoice email",
};

async function evidenceFor(
  ctx: QueryCtx,
  orderId: Id<"registrationOrders">
): Promise<EvidenceData | null> {
  const order = await ctx.db.get(orderId);
  if (!order) {
    return null;
  }
  const [rows, seats, session, course, invoices] = await Promise.all([
    acknowledgements(ctx, order._id),
    ctx.db
      .query("registrationSeats")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(100),
    order.sessionId ? ctx.db.get(order.sessionId) : null,
    ctx.db.get(order.courseId),
    ctx.db
      .query("registrationInvoices")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20),
  ]);
  const keys = [
    `receipt:${order._id}`,
    ...invoices.map((invoice) => `invoice:${invoice._id}`),
  ];
  const jobs = (
    await Promise.all(
      keys.map((key) =>
        ctx.db
          .query("registrationJobs")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique()
      )
    )
  ).filter((job) => job !== null);
  const emails = await Promise.all(
    jobs.map(async (job) => {
      const tracking = job.providerId
        ? await ctx.db
            .query("registrationEmailTracking")
            .withIndex("by_providerId", (q) =>
              q.eq("providerId", job.providerId ?? "")
            )
            .unique()
        : null;
      return {
        description: EMAIL_LABELS[job.key.split(":")[0] ?? ""] ?? job.key,
        recipient: job.recipient,
        deliveredTo: job.deliveredTo,
        subject: job.sentCopy?.subject ?? job.subject,
        state: job.state,
        sentAt: job.sentAt,
        providerId: job.providerId,
        deliveryStatus: tracking?.status,
        deliveryStatusAt: tracking?.statusAt,
        deliveredAt: tracking?.deliveredAt,
        text: job.sentCopy?.text,
      };
    })
  );
  return {
    generatedAt: Date.now(),
    order: {
      id: order._id,
      title: order.title,
      courseTitle: course?.title ?? order.title,
      sessionStart: session?.firstStart,
      sessionTimeZone: session?.timeZone,
      purchaserName: order.purchaserName,
      purchaserEmail: order.purchaser,
      status: order.status,
      total: order.total,
      tax: order.tax ?? 0,
      refunded: order.refunded,
      createdAt: order._creationTime,
      settledAt: order.settledAt,
      source: order.source,
      stripeCheckoutSession: order.stripeSession,
      stripePaymentIntent: order.paymentIntent,
      seats: seats.map((seat) => ({
        id: seat._id,
        name: seat.name,
        email: seat.email,
        state: seat.state,
      })),
    },
    acknowledgements: await Promise.all(
      rows.map(async (row) => ({
        id: row._id,
        kind: row.kind,
        channel: row.channel,
        policyVersion: row.policyVersion,
        policyHash: row.policyHash,
        policySnapshot: row.policySnapshot,
        statement: row.statement,
        recordedAt: row.recordedAt,
        purchaserName: row.purchaserName,
        purchaserEmail: row.purchaserEmail,
        orderId: row.orderId,
        seatIds: row.seatIds,
        sessionId: row.sessionId,
        courseId: row.courseId,
        invoiceId: row.invoiceId,
        actor: row.actor,
        ip: row.ip,
        userAgent: row.userAgent,
        digest: row.digest,
        stripeCheckoutSession: row.stripeCheckoutSession,
        stripePaymentIntent: row.stripePaymentIntent,
        integrity: await verifyAcknowledgement(row),
      }))
    ),
    emails,
  };
}

/** Admin-only: the acknowledgements and the policy emails for one order. */
export const evidence = query({
  args: { orderId: v.id("registrationOrders") },
  handler: async (ctx, args): Promise<EvidenceData | null> => {
    await staff(ctx);
    return await evidenceFor(ctx, args.orderId);
  },
});

/** Evidence for the order a disputed PaymentIntent paid. */
export const disputeEvidence = internalQuery({
  args: { paymentIntent: v.string() },
  handler: async (ctx, args): Promise<EvidenceData | null> => {
    const order = await ctx.db
      .query("registrationOrders")
      .withIndex("by_paymentIntent", (q) =>
        q.eq("paymentIntent", args.paymentIntent)
      )
      .first();
    return order ? await evidenceFor(ctx, order._id) : null;
  },
});

export const disputeDrafted = internalMutation({
  args: { orderId: v.string(), disputeId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await audit(
      ctx,
      "system",
      "dispute-evidence-drafted",
      args.orderId,
      `Stripe dispute ${args.disputeId}: evidence drafted from the cancellation policy acknowledgement, not submitted`
    );
    return null;
  },
});

/** Queues a draft of Stripe's dispute evidence; staff still review and submit it. */
export const disputeOpened = internalMutation({
  args: { disputeId: v.string(), paymentIntent: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.registrationEvidence.prefillDispute,
      args
    );
    return null;
  },
});
