import { v } from "convex/values";
import { BATCH, email, formatMoney } from "../shared/registration/domain";
import { MAGIC_LINK_MS, usesPortalAction } from "../shared/registration/email";
import { calendar } from "../shared/registration/schedule";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { hash } from "./registrationHelpers";

/**
 * The sign-in token behind the email's portal button. Minted on the first
 * delivery attempt and stored on the job, so an automatic retry always
 * carries the same link under the same idempotency key, even if the student
 * already used it because the provider accepted a send whose result was
 * lost. Only a staff retry, which resets attempts to zero, replaces a token
 * that has expired or been used, so the email it sends has a working button.
 */
async function portalToken(ctx: MutationCtx, job: Doc<"registrationJobs">) {
  if (job.kind !== "email" || !usesPortalAction(job)) {
    return;
  }
  if (
    job.portalToken &&
    (job.attempts > 0 || (await tokenUsable(ctx, job.portalToken)))
  ) {
    return job.portalToken;
  }
  const token = crypto.randomUUID() + crypto.randomUUID();
  await ctx.db.insert("registrationGrants", {
    email: email(job.recipient),
    hash: await hash(token),
    purpose: "challenge",
    expires: Date.now() + MAGIC_LINK_MS,
    consumed: false,
  });
  await ctx.db.patch(job._id, { portalToken: token });
  return token;
}

async function tokenUsable(ctx: MutationCtx, token: string) {
  const digest = await hash(token);
  const grant = await ctx.db
    .query("registrationGrants")
    .withIndex("by_hash", (q) => q.eq("hash", digest))
    .unique();
  return (
    grant?.purpose === "challenge" &&
    !grant.consumed &&
    grant.expires > Date.now()
  );
}

function billingDetails(
  order: Doc<"registrationOrders"> | null,
  invoice: Doc<"registrationInvoices"> | null
) {
  const details: { label: string; value: string }[] = [];
  if (order) {
    const waived = order.source === "waived";
    const tax = waived ? 0 : (invoice?.tax ?? order.tax ?? 0);
    if (waived) {
      details.push({
        label: "Payment waived",
        value: formatMoney(order.total),
      });
    }
    details.push(
      { label: "Subtotal", value: formatMoney(order.total) },
      { label: "Sales tax", value: formatMoney(tax) },
      {
        label: invoice ? "Invoice total" : "Total paid",
        value: formatMoney(waived ? 0 : order.total + tax),
      },
      {
        label: "Attendees",
        value: order.seats.map((s) => s.attendee.name).join("\n"),
      }
    );
  }
  if (invoice) {
    details.push(
      { label: "Invoice number", value: invoice.number },
      {
        label: "Due date",
        value: new Date(invoice.dueAt).toLocaleDateString("en-US", {
          dateStyle: "long",
          timeZone: "America/Los_Angeles",
        }),
      },
      { label: "Bill to", value: invoice.billToName }
    );
    if (invoice.poNumber) {
      details.push({ label: "Purchase order", value: invoice.poNumber });
    }
  }
  return details;
}
function messageBody(
  job: Doc<"registrationJobs">,
  kind: string | undefined,
  seat: Doc<"registrationSeats"> | null,
  session: Doc<"registrationSessions"> | null,
  invoice: Doc<"registrationInvoices"> | null
) {
  const categories: Record<string, string> = {
    receipt: "Payment receipt",
    "payment-request": "Payment requested",
    confirmation: "Registration confirmed",
    invoice: "Invoice",
    "invoice-reminder": "Payment reminder",
  };
  const category = categories[kind ?? ""] ?? "Your training";
  let { body } = job;
  if (kind === "receipt") {
    body =
      "Thank you for your payment. Keep this receipt for your records.\nClass details and materials are sent separately to each attendee.";
  }
  if (kind === "confirmation") {
    body = `Hi ${seat?.name ?? "there"}, your place is confirmed.${session ? " Your class details are below. Please review your materials before class." : " This is a self-paced course. Open your registration to access the available course materials."}`;
  }
  if (kind === "invoice" && invoice) {
    body = `Hello ${invoice.billToName}, your training invoice is ready.\nView the itemized invoice, download a PDF, or pay securely online using the button below.${invoice.notes ? `\n${invoice.notes}` : ""}`;
  }
  return { category, body };
}
async function messageContext(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null,
  session: Doc<"registrationSessions"> | null
) {
  const [kind, reference] = job.key.split(":");
  const invoiceId =
    (kind === "invoice" || kind === "invoice-reminder") && reference
      ? ctx.db.normalizeId("registrationInvoices", reference)
      : null;
  const invoice = invoiceId ? await ctx.db.get(invoiceId) : null;
  const receiptId =
    kind === "receipt" && reference
      ? ctx.db.normalizeId("registrationOrders", reference)
      : null;
  const orderId = invoice?.orderId ?? receiptId;
  const order = orderId ? await ctx.db.get(orderId) : null;
  const course = seat ? await ctx.db.get(seat.courseId) : null;
  const title =
    session?.title ?? course?.title ?? order?.title ?? "Taylored Instruction";
  const details: { label: string; value: string }[] = [];
  if (title !== "Taylored Instruction") {
    details.push({ label: "Course", value: title });
  }
  if (seat) {
    details.push({ label: "Attendee", value: seat.name });
    if (course?.delivery === "self-paced") {
      details.push({
        label: "Format",
        value: "Self-paced · start on your schedule",
      });
    }
  }
  details.push(...billingDetails(order, invoice));
  if (order?.source === "waived" && kind === "receipt") {
    return {
      title,
      details,
      category: "Payment waived",
      body: "Your training payment has been waived. No payment was collected. Keep this confirmation for your records.",
    };
  }
  return { title, details, ...messageBody(job, kind, seat, session, invoice) };
}

export const due = internalQuery({
  args: {},
  returns: v.array(v.id("registrationJobs")),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("registrationJobs")
      .withIndex("by_state_and_due", (q) =>
        q.eq("state", "pending").lte("due", Date.now())
      )
      .take(BATCH);
    const abandoned = await ctx.db
      .query("registrationJobs")
      .withIndex("by_state_and_due", (q) =>
        q.eq("state", "sending").lte("due", Date.now() - 300_000)
      )
      .take(BATCH);
    return [...pending, ...abandoned].map((j) => j._id);
  },
});
function scheduleContent(
  session: Doc<"registrationSessions"> | null,
  seat: Doc<"registrationSeats"> | null
) {
  return {
    schedule: session
      ? session.meetings
          .map(
            (m) =>
              `${new Date(m.start).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: session.timeZone })} – ${new Date(m.end).toLocaleTimeString("en-US", { timeStyle: "short", timeZone: session.timeZone })} (${session.timeZone})\n${m.location}${seat?.state === "active" && seat.settledAt && m.instructions ? `\n${m.instructions}` : ""}`
          )
          .join("\n")
      : "",
    calendar:
      session && seat?.state === "active" && seat.settledAt
        ? calendar(session, Date.now())
        : undefined,
  };
}

async function invoiceStillOpen(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">
) {
  const [kind, reference] = job.key.split(":");
  const invoiceId =
    (kind === "invoice" || kind === "invoice-reminder") && reference
      ? ctx.db.normalizeId("registrationInvoices", reference)
      : null;
  const invoice = invoiceId ? await ctx.db.get(invoiceId) : null;
  return !invoiceId || invoice?.status === "open";
}

async function offerStillOpen(ctx: MutationCtx, job: Doc<"registrationJobs">) {
  if (!job.key.startsWith("offer:")) {
    return true;
  }
  const id = ctx.db.normalizeId("registrationWaitlist", job.key.slice(6));
  const offer = id ? await ctx.db.get(id) : null;
  return offer?.state === "offered" && (offer.expires ?? 0) > Date.now();
}

async function paymentStillOpen(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">
) {
  if (!job.key.startsWith("payment-request:")) {
    return true;
  }
  const [, reference] = job.key.split(":");
  const id = reference
    ? ctx.db.normalizeId("registrationOrders", reference)
    : null;
  const order = id ? await ctx.db.get(id) : null;
  return (
    order?.status === "unpaid" ||
    (order?.status === "hold" && order.expires > Date.now())
  );
}

/**
 * A reschedule can enqueue a replacement while the prior job for the same
 * seat and step is still sending; whichever runs first wins.
 */
async function stepAlreadyHandled(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">
) {
  if (!(job.seatId && job.stepId)) {
    return null;
  }
  const stepJobs = await ctx.db
    .query("registrationJobs")
    .withIndex("by_seatId_and_stepId_and_state", (q) =>
      q.eq("seatId", job.seatId).eq("stepId", job.stepId)
    )
    .take(BATCH);
  const others = stepJobs.filter((other) => other._id !== job._id);
  if (others.some((other) => other.state === "sent")) {
    return "sent";
  }
  if (
    others.some(
      (other) => other.state === "sending" && other.due > Date.now() - 300_000
    )
  ) {
    return "sending";
  }
  return null;
}
export const claim = internalMutation({
  args: { id: v.id("registrationJobs") },
  returns: v.union(
    v.object({
      body: v.string(),
      subject: v.string(),
      recipient: v.string(),
      category: v.string(),
      details: v.array(v.object({ label: v.string(), value: v.string() })),
      name: v.string(),
      title: v.string(),
      schedule: v.string(),
      materials: v.array(
        v.object({ title: v.string(), url: v.union(v.string(), v.null()) })
      ),
      calendar: v.optional(v.string()),
      link: v.optional(v.object({ label: v.string(), url: v.string() })),
      portalToken: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (
      !job ||
      job.state === "sent" ||
      job.state === "canceled" ||
      job.state === "failed" ||
      (job.state === "sending" && job.due > Date.now() - 300_000)
    ) {
      return null;
    }
    const seat = job.seatId ? await ctx.db.get(job.seatId) : null;
    const session = job.sessionId ? await ctx.db.get(job.sessionId) : null;
    const entitlement = job.entitlementId
      ? await ctx.db.get(job.entitlementId)
      : null;
    const explicit =
      job.key.startsWith("staff:") || job.key.startsWith("schedule:");
    const invoiceOpen = await invoiceStillOpen(ctx, job);
    const paymentOpen = await paymentStillOpen(ctx, job);
    const offerOpen = await offerStillOpen(ctx, job);
    if (
      !(invoiceOpen && offerOpen && paymentOpen) ||
      (seat && seat.state !== "active" && !explicit) ||
      (session &&
        ((session.state === "canceled" && !explicit) ||
          (job.stepId && job.scheduleRevision !== session.revision))) ||
      (entitlement && job.kind !== "email" && entitlement.state !== "pending")
    ) {
      await ctx.db.patch(job._id, { state: "canceled" });
      return null;
    }
    const handled = await stepAlreadyHandled(ctx, job);
    if (handled === "sent") {
      await ctx.db.patch(job._id, { state: "canceled" });
      return null;
    }
    if (handled === "sending") {
      // Let the in-flight send finish; this job is retried afterwards and
      // canceled only if that send succeeded.
      await ctx.db.patch(job._id, { due: Date.now() + 60_000 });
      return null;
    }
    await ctx.db.patch(job._id, {
      state: "sending",
      attempts: job.attempts + 1,
      due: Date.now(),
    });
    const entitlements = seat?.settledAt
      ? await ctx.db
          .query("registrationEntitlements")
          .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
          .take(BATCH)
      : [];
    const materials = await Promise.all(
      entitlements
        .filter((e) => e.state === "ready")
        .map(async (e) => ({
          title: e.title,
          url: e.storageId
            ? await ctx.storage.getUrl(e.storageId)
            : (e.url ?? null),
        }))
    );
    const context = await messageContext(ctx, job, seat, session);
    return {
      materials,
      ...context,
      subject: job.subject,
      recipient: job.recipient,
      name: seat?.name ?? "",
      ...scheduleContent(session, seat),
      link: job.link,
      portalToken: await portalToken(ctx, job),
    };
  },
});
export const result = internalMutation({
  args: {
    id: v.id("registrationJobs"),
    success: v.boolean(),
    error: v.optional(v.string()),
    providerId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (job?.state !== "sending") {
      return null;
    }
    const failureState = job.attempts >= 5 ? "failed" : "pending";
    await ctx.db.patch(job._id, {
      state: args.success ? "sent" : failureState,
      due: Date.now() + 60_000 * 2 ** job.attempts,
      error: args.error,
      providerId: args.providerId,
    });
    return null;
  },
});
