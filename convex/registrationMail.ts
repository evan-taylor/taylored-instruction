import { v } from "convex/values";
import { registrationEmailCampaign } from "../shared/email-attribution";
import { analyticsContext } from "../shared/registration/analytics-validator";
import { BATCH, effective, formatMoney } from "../shared/registration/domain";
import { calendar, formatSchedule } from "../shared/registration/schedule";
import {
  businessDate,
  certificateCourseTitle,
} from "../shared/registration/student-certificates";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { preferenceToken } from "./emailPreferences";
import { certificateStatus } from "./registrationCertificates";
import {
  activeSeatMaterials,
  materialJobEntitlementId,
} from "./registrationHelpers";
import { citedAcknowledgement, policyEmailLine } from "./registrationPolicy";
import { certificateAgency } from "./studentCertificateSchema";
import { reminderBlocked } from "./studentCertificates";

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
  if (kind === "invoice" && invoice) {
    body = `Hello ${invoice.billToName}, your training invoice is ready.\nView the itemized invoice, download a PDF, or pay securely online using the button below.${invoice.notes ? `\n${invoice.notes}` : ""}`;
  }
  return { category, body };
}
/**
 * The order behind a job. Receipts and invoices bill it; an attendee's
 * confirmation only cites its policy, so it never shows the order's billing.
 */
async function jobOrder(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null
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
  const billingOrderId = invoice?.orderId ?? receiptId;
  const orderId =
    billingOrderId ?? (kind === "confirmation" ? seat?.orderId : undefined);
  const order = orderId ? await ctx.db.get(orderId) : null;
  return { invoice, order, billing: Boolean(billingOrderId) };
}

/** Receipts for orders nobody paid for say why instead of thanking for payment. */
function receiptMessage(
  kind: string | undefined,
  order: Doc<"registrationOrders"> | null
) {
  if (kind !== "receipt") {
    return null;
  }
  if (order?.source === "waived") {
    return {
      category: "Payment waived",
      body: "Your training payment has been waived. No payment was collected. Keep this confirmation for your records.",
    };
  }
  if (order?.billedTo) {
    return {
      category: "Registration confirmed",
      body: `Your registration is covered by ${order.billedTo}. Nothing is due from you. Keep this confirmation for your records.\nClass details and materials are sent separately to each attendee.`,
    };
  }
  return null;
}

async function messageContext(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null,
  session: Doc<"registrationSessions"> | null
) {
  const [kind] = job.key.split(":");
  const { invoice, order, billing } = await jobOrder(ctx, job, seat);
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
  details.push(...billingDetails(billing ? order : null, invoice));
  const message =
    receiptMessage(kind, order) ?? messageBody(job, kind, invoice);
  const notice = order ? await policyNotice(ctx, job, order) : null;
  if (notice) {
    message.body += `\n${notice}`;
  }
  return { title, details, ...message };
}

/** Only the purchaser agreed; anyone else is told the policy applies. */
async function policyNotice(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  order: Doc<"registrationOrders">
) {
  const acknowledgement = await citedAcknowledgement(ctx, order._id);
  const site = process.env.SITE_URL;
  if (!(acknowledgement && site)) {
    return null;
  }
  const agreedByRecipient =
    job.recipient.toLowerCase() === order.purchaser.toLowerCase();
  return policyEmailLine(
    agreedByRecipient
      ? acknowledgement
      : { ...acknowledgement, kind: "disclosed" },
    new URL(site).origin
  );
}

async function dueJobs(ctx: QueryCtx, limit: number) {
  const pending = await ctx.db
    .query("registrationJobs")
    .withIndex("by_state_and_due", (q) =>
      q.eq("state", "pending").lte("due", Date.now())
    )
    .take(limit);
  const abandoned = await ctx.db
    .query("registrationJobs")
    .withIndex("by_state_and_due", (q) =>
      q.eq("state", "sending").lte("due", Date.now() - 300_000)
    )
    .take(limit);
  return [...pending, ...abandoned].map((j) => j._id);
}
export const due = internalQuery({
  args: {},
  returns: v.array(v.id("registrationJobs")),
  handler: async (ctx) => await dueJobs(ctx, BATCH),
});
/**
 * Cron entry for the outbox. Starts the Node sender only when mail is due, so
 * an idle minute costs one indexed read instead of a Node action.
 */
export const kickDelivery = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if ((await dueJobs(ctx, 1)).length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrationExternal.deliver,
        {}
      );
    }
    return null;
  },
});
/**
 * A step scheduled for after the class ends, not a certificate nudge. Late
 * pre-class reminders stay excluded because the step's anchor decides.
 */
async function sentAfterClass(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  session: Doc<"registrationSessions"> | null
) {
  if (
    !(job.stepId && session && session.lastEnd <= Date.now()) ||
    job.onlyMissingCertificate
  ) {
    return false;
  }
  return await afterClassStep(ctx, job.stepId, session);
}
async function afterClassStep(
  ctx: MutationCtx,
  stepId: string,
  session: Doc<"registrationSessions">
) {
  const course = await ctx.db.get(session.courseId);
  const step = course
    ? effective(course.settings, session.overrides).emails.find(
        (s) => s.id === stepId
      )
    : undefined;
  return Boolean(
    step?.anchor === "last" &&
      step.offsetMinutes >= 0 &&
      !step.onlyMissingCertificate
  );
}
/**
 * A post-class email that asked for a review is sending or went to this
 * attendee, so the certificate email should not ask again. Sends from before
 * `reviewAsked` was recorded count when their step ran after class.
 */
async function reviewLetterSent(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats"> | null,
  current: Id<"registrationJobs">
) {
  const session = seat?.sessionId ? await ctx.db.get(seat.sessionId) : null;
  if (!(seat && session)) {
    return false;
  }
  const [sent, sending] = await Promise.all(
    (["sent", "sending"] as const).map((state) =>
      ctx.db
        .query("registrationJobs")
        .withIndex("by_seatId_and_state", (q) =>
          q.eq("seatId", seat._id).eq("state", state)
        )
        .take(BATCH)
    )
  );
  if (
    [...sent, ...sending].some((job) => job._id !== current && job.reviewAsked)
  ) {
    return true;
  }
  const legacy = await Promise.all(
    sent.map((job) =>
      job.reviewAsked === undefined && job.stepId && !job.onlyMissingCertificate
        ? afterClassStep(ctx, job.stepId, session)
        : false
    )
  );
  return legacy.some(Boolean);
}
/**
 * A certificate email is queued or sent for this attendee. Post-class emails
 * then leave out their review ask; they still go out with their own content.
 */
async function certificateEmailQueued(
  ctx: MutationCtx,
  seat: Doc<"registrationSeats"> | null
) {
  if (!seat) {
    return false;
  }
  const certificates = await ctx.db
    .query("studentCertificates")
    .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
    .take(BATCH);
  const jobs = await Promise.all(
    certificates.map((certificate) =>
      ctx.db
        .query("registrationJobs")
        .withIndex("by_key", (q) =>
          q.eq("key", `certificate:${certificate._id}`)
        )
        .unique()
    )
  );
  return jobs.some(
    (job) => job && job.state !== "canceled" && job.state !== "failed"
  );
}

const CERTIFICATE_JOB = /^certificate(-reminder)?:([^:]+)(?::(\d+))?$/u;

export const certificateMailValidator = v.object({
  kind: v.union(v.literal("issued"), v.literal("reminder")),
  firstName: v.string(),
  course: v.string(),
  agency: certificateAgency,
  certificateId: v.string(),
  issuedOn: v.string(),
  expiresOn: v.string(),
  instructor: v.optional(v.string()),
  review: v.boolean(),
  renewPath: v.string(),
  today: v.optional(v.string()),
  unsubscribeToken: v.optional(v.string()),
});

/**
 * The certificate behind a certificate or reminder job: undefined for other
 * jobs, null when the job should be canceled (certificate gone, renewed, or
 * the student unsubscribed from reminders).
 */
async function certificateMail(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null
) {
  const match = job.key.match(CERTIFICATE_JOB);
  if (!match) {
    return;
  }
  const id = ctx.db.normalizeId("studentCertificates", match[2] ?? "");
  const certificate = id ? await ctx.db.get(id) : null;
  const reminder = Boolean(match[1]);
  if (!certificate || (reminder && (await reminderBlocked(ctx, certificate)))) {
    return null;
  }
  const session = certificate.sessionId
    ? await ctx.db.get(certificate.sessionId)
    : null;
  const course = session ? await ctx.db.get(session.courseId) : null;
  return {
    kind: reminder ? ("reminder" as const) : ("issued" as const),
    firstName: certificate.firstName,
    course: certificateCourseTitle(certificate.course),
    agency: certificate.agency,
    certificateId: certificate.certificateId,
    issuedOn: certificate.issuedOn,
    expiresOn: certificate.expiresOn,
    instructor: certificate.instructor,
    review: !(reminder || (await reviewLetterSent(ctx, seat, job._id))),
    renewPath:
      course?.publication === "published"
        ? `/courses/${course.slug}`
        : "/classes",
    today: businessDate(Date.now()),
    unsubscribeToken: reminder
      ? await preferenceToken(ctx, certificate.email)
      : undefined,
  };
}
function scheduleContent(
  session: Doc<"registrationSessions"> | null,
  seat: Doc<"registrationSeats"> | null
) {
  return {
    schedule: session
      ? formatSchedule(
          session.meetings.map((m) => ({
            ...m,
            instructions:
              seat?.state === "active" && seat.settledAt
                ? m.instructions
                : undefined,
          })),
          session.timeZone
        )
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
async function certificateReminderEligible(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null,
  session: Doc<"registrationSessions"> | null
) {
  if (!job.onlyMissingCertificate) {
    return true;
  }
  if (!(seat && session) || seat.sessionId !== session._id) {
    return false;
  }
  const certificate = await certificateStatus(ctx, seat);
  return certificate?.uploaded === false;
}

/**
 * Certificate jobs carry their certificate. A post-class email asks for a
 * review only when no certificate email will ask instead; whichever claims
 * first records the ask, so the attendee is asked once.
 */
async function certificateRouting(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null,
  session: Doc<"registrationSessions"> | null
) {
  const certificate = await certificateMail(ctx, job, seat);
  const afterClass =
    (await sentAfterClass(ctx, job, session)) &&
    !(await certificateEmailQueued(ctx, seat));
  return {
    certificate: certificate ?? undefined,
    afterClass,
    replaced: certificate === null,
    reviewAsked: afterClass || Boolean(certificate?.review),
  };
}

/**
 * The send's campaign, fixed by the step's schedule rather than the send
 * time, and the purchaser's browser identity when the email goes to the
 * purchaser, so the send joins their PostHog timeline.
 */
async function emailAnalytics(
  ctx: MutationCtx,
  job: Doc<"registrationJobs">,
  seat: Doc<"registrationSeats"> | null,
  session: Doc<"registrationSessions"> | null,
  agency: Doc<"studentCertificates">["agency"] | undefined
) {
  const billed = (await jobOrder(ctx, job, seat)).order;
  const purchase = billed ?? (seat ? await ctx.db.get(seat.orderId) : null);
  const course = session ? await ctx.db.get(session.courseId) : null;
  const step =
    course && session && job.stepId
      ? effective(course.settings, session.overrides).emails.find(
          (s) => s.id === job.stepId
        )
      : undefined;
  return {
    campaign: registrationEmailCampaign(job.key, {
      agency,
      afterClass: step?.anchor === "last" && step.offsetMinutes >= 0,
    }),
    analytics:
      purchase?.purchaser.toLowerCase() === job.recipient.toLowerCase()
        ? purchase.analytics
        : undefined,
  };
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
      afterClass: v.boolean(),
      certificate: v.optional(certificateMailValidator),
      campaign: v.string(),
      analytics: v.optional(analyticsContext),
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
    const entitlementId = materialJobEntitlementId(ctx, job);
    const entitlement = entitlementId ? await ctx.db.get(entitlementId) : null;
    const explicit =
      job.key.startsWith("staff:") ||
      job.key.startsWith("schedule:") ||
      job.key.startsWith("instructor:");
    const invoiceOpen = await invoiceStillOpen(ctx, job);
    const paymentOpen = await paymentStillOpen(ctx, job);
    const offerOpen = await offerStillOpen(ctx, job);
    const certificateEligible = await certificateReminderEligible(
      ctx,
      job,
      seat,
      session
    );
    const { certificate, afterClass, replaced, reviewAsked } =
      await certificateRouting(ctx, job, seat, session);
    if (
      !(
        invoiceOpen &&
        offerOpen &&
        paymentOpen &&
        certificateEligible &&
        !replaced
      ) ||
      (seat && seat.state !== "active" && !explicit) ||
      (session &&
        ((session.state === "canceled" && !explicit) ||
          (job.stepId && job.scheduleRevision !== session.revision))) ||
      entitlement?.state === "canceled" ||
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
      reviewAsked,
    });
    const entitlements = seat?.settledAt
      ? await activeSeatMaterials(ctx, seat._id)
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
      afterClass,
      certificate,
      ...(await emailAnalytics(ctx, job, seat, session, certificate?.agency)),
    };
  },
});
export const result = internalMutation({
  args: {
    id: v.id("registrationJobs"),
    success: v.boolean(),
    error: v.optional(v.string()),
    providerId: v.optional(v.string()),
    deliveredTo: v.optional(v.string()),
    copy: v.optional(v.object({ subject: v.string(), text: v.string() })),
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
      sentAt: args.success ? Date.now() : job.sentAt,
      deliveredTo: args.deliveredTo ?? job.deliveredTo,
      sentCopy: args.success ? args.copy : job.sentCopy,
    });
    return null;
  },
});
