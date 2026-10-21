import { v } from "convex/values";
import { BATCH, formatMoney } from "../shared/registration/domain";
import { calendar } from "../shared/registration/schedule";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

function billingDetails(
  order: Doc<"registrationOrders"> | null,
  invoice: Doc<"registrationInvoices"> | null
) {
  const details: { label: string; value: string }[] = [];
  if (order) {
    const tax = invoice?.tax ?? order.tax ?? 0;
    details.push(
      { label: "Subtotal", value: formatMoney(order.total) },
      { label: "Sales tax", value: formatMoney(tax) },
      {
        label: invoice ? "Invoice total" : "Total paid",
        value: formatMoney(order.total + tax),
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
    confirmation: "Registration confirmed",
    invoice: "Invoice",
    "invoice-reminder": "Payment reminder",
  };
  const category = categories[kind ?? ""] ?? "Your training";
  let { body } = job;
  if (kind === "receipt") {
    body =
      "Thank you for choosing Taylored Instruction. Your payment has been recorded. Keep this email for your records.\nEach attendee receives their own registration confirmation. You can review your purchaser orders in the secure portal.";
  }
  if (kind === "confirmation") {
    body = `Hi ${seat?.name ?? "there"}, your registration is confirmed. We’re glad you’re training with us.\nOpen your secure portal for available materials and the latest class details.${session ? " Review the schedule below and save the attached calendar invitation." : " This is a self-paced course, so there’s no scheduled class meeting."}`;
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
    if (
      (seat && seat.state !== "active") ||
      (session &&
        ((session.state === "canceled" && !job.key.startsWith("schedule:")) ||
          (job.stepId && job.scheduleRevision !== session.revision))) ||
      (entitlement && job.kind !== "email" && entitlement.state !== "pending")
    ) {
      await ctx.db.patch(job._id, { state: "canceled" });
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
      schedule: session
        ? session.meetings
            .map(
              (m) =>
                `${new Date(m.start).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: session.timeZone })} – ${new Date(m.end).toLocaleTimeString("en-US", { timeStyle: "short", timeZone: session.timeZone })} (${session.timeZone})\n${m.location}${m.instructions ? `\n${m.instructions}` : ""}`
            )
            .join("\n")
        : "",
      calendar: session ? calendar(session, Date.now()) : undefined,
      link: job.link,
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
