import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { ADMIN_EMAILS } from "../shared/adminEmails";
import {
  BATCH,
  email,
  formatMoney,
  invoiceNumber,
} from "../shared/registration/domain";
import { assertRegistrationPaymentMode } from "../shared/registration/environment";
import { postalAddress } from "../shared/registration/validators";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { audit, enqueue, rate, settle, staff } from "./registrationHelpers";
import schema from "./schema";

const groupStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("quoted"),
  v.literal("scheduled"),
  v.literal("closed")
);
const invoiceStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("paid"),
  v.literal("void")
);
const MAX_TEXT = 2000;
const MAX_HEADCOUNT = 500;
const MAX_DUE_DAYS = 180;
const DAY_MS = 86_400_000;

function text(value: string, label: string, required = false) {
  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new Error(`${label} is required`);
  }
  if (trimmed.length > MAX_TEXT) {
    throw new Error(`${label} is too long`);
  }
  return trimmed;
}

/* ------------------------------------------------------------------ */
/* Group training requests (public intake)                             */
/* ------------------------------------------------------------------ */

export const submitGroupRequest = mutation({
  args: {
    organization: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    courseInterest: v.string(),
    headcount: v.number(),
    preferredDates: v.string(),
    location: v.string(),
    notes: v.string(),
  },
  returns: v.id("registrationGroupRequests"),
  handler: async (ctx, args) => {
    const contact = email(args.email);
    await rate(ctx, `group-request:${contact}`, 5);
    if (
      !Number.isInteger(args.headcount) ||
      args.headcount < 1 ||
      args.headcount > MAX_HEADCOUNT
    ) {
      throw new Error("Enter the expected number of attendees");
    }
    const request = {
      organization: text(args.organization, "Organization", true),
      contactName: text(args.contactName, "Contact name", true),
      email: contact,
      phone: text(args.phone, "Phone"),
      courseInterest: text(args.courseInterest, "Course", true),
      headcount: args.headcount,
      preferredDates: text(args.preferredDates, "Preferred dates"),
      location: text(args.location, "Location"),
      notes: text(args.notes, "Notes"),
    };
    const id = await ctx.db.insert("registrationGroupRequests", {
      ...request,
      status: "new",
      internalNotes: "",
      updatedAt: Date.now(),
    });
    await enqueue(ctx, {
      key: `group-request:${id}`,
      kind: "email",
      recipient: process.env.REGISTRATION_ADMIN_EMAIL ?? ADMIN_EMAILS[0],
      subject: `Group training request: ${request.organization}`,
      body: [
        `${request.contactName} (${contact}) from ${request.organization} requested ${request.courseInterest} for about ${request.headcount} people.`,
        request.preferredDates
          ? `Preferred dates: ${request.preferredDates}`
          : "",
        request.location ? `Location: ${request.location}` : "",
        request.phone ? `Phone: ${request.phone}` : "",
        request.notes ? `Notes: ${request.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      due: Date.now(),
      link: { label: "Open group requests", url: "/admin/groups" },
    });
    await audit(ctx, "guest", "group-request", id, request.organization);
    return id;
  },
});
export const groupRequests = query({
  args: {
    status: v.optional(groupStatus),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "registrationGroupRequests")),
  handler: async (ctx, args) => {
    await staff(ctx);
    const { status } = args;
    if (status) {
      return await ctx.db
        .query("registrationGroupRequests")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("registrationGroupRequests")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
export const updateGroupRequest = mutation({
  args: {
    id: v.id("registrationGroupRequests"),
    status: groupStatus,
    internalNotes: v.string(),
    organizationId: v.optional(v.id("registrationOrganizations")),
    orderId: v.optional(v.id("registrationOrders")),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...value }) => {
    const actor = await staff(ctx);
    const request = await ctx.db.get(id);
    if (!request) {
      throw new Error("Request not found");
    }
    await ctx.db.patch(id, {
      ...value,
      internalNotes: text(value.internalNotes, "Internal notes"),
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      actor.userId,
      "group-request-updated",
      id,
      `${request.status} -> ${value.status}`
    );
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* Organizations                                                        */
/* ------------------------------------------------------------------ */

export const saveOrganization = mutation({
  args: {
    id: v.optional(v.id("registrationOrganizations")),
    name: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    phone: v.string(),
    address: v.string(),
    ...postalAddress,
    notes: v.string(),
    archived: v.boolean(),
  },
  returns: v.id("registrationOrganizations"),
  handler: async (ctx, { id, ...value }) => {
    const actor = await staff(ctx);
    const organization = {
      ...value,
      name: text(value.name, "Organization name", true),
      contactName: text(value.contactName, "Contact name"),
      contactEmail: value.contactEmail.trim() ? email(value.contactEmail) : "",
      phone: text(value.phone, "Phone"),
      address: text(value.address, "Address"),
      city: text(value.city ?? "", "City") || undefined,
      state: text(value.state ?? "", "State") || undefined,
      postalCode: text(value.postalCode ?? "", "Postal code") || undefined,
      country: text(value.country ?? "", "Country") || undefined,
      notes: text(value.notes, "Notes"),
    };
    const saved =
      id ?? (await ctx.db.insert("registrationOrganizations", organization));
    if (id) {
      await ctx.db.patch(id, organization);
    }
    await audit(
      ctx,
      actor.userId,
      "organization-saved",
      saved,
      organization.name
    );
    return saved;
  },
});
export const organizations = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(doc(schema, "registrationOrganizations")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationOrganizations")
      .paginate(args.paginationOpts);
  },
});
export const organizationOrders = query({
  args: {
    id: v.id("registrationOrganizations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(doc(schema, "registrationOrders")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationOrders")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/* ------------------------------------------------------------------ */
/* Invoices                                                             */
/* ------------------------------------------------------------------ */

async function nextInvoiceNumber(ctx: MutationCtx) {
  const counter = await ctx.db
    .query("registrationCounters")
    .withIndex("by_key", (q) => q.eq("key", "invoice"))
    .unique();
  const value = (counter?.value ?? 0) + 1;
  if (counter) {
    await ctx.db.patch(counter._id, { value });
  } else {
    await ctx.db.insert("registrationCounters", { key: "invoice", value });
  }
  return invoiceNumber(value);
}
async function openInvoice(
  ctx: MutationCtx,
  orderId: Doc<"registrationOrders">["_id"]
) {
  const rows = await ctx.db
    .query("registrationInvoices")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(BATCH);
  return rows.find((row) => row.status === "draft" || row.status === "open");
}
export const createInvoice = mutation({
  args: {
    orderId: v.id("registrationOrders"),
    billToName: v.string(),
    billToEmail: v.string(),
    billToAddress: v.string(),
    ...postalAddress,
    poNumber: v.string(),
    notes: v.string(),
    dueDays: v.number(),
    organizationId: v.optional(v.id("registrationOrganizations")),
  },
  returns: v.id("registrationInvoices"),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (order?.status !== "unpaid") {
      throw new Error("Only unpaid enrollments can be invoiced");
    }
    if (order.total <= 0) {
      throw new Error(
        "This order has nothing to invoice; waive payment instead"
      );
    }
    if (await openInvoice(ctx, order._id)) {
      throw new Error("An invoice is already open for this order");
    }
    if (
      !Number.isInteger(args.dueDays) ||
      args.dueDays < 0 ||
      args.dueDays > MAX_DUE_DAYS
    ) {
      throw new Error("Payment terms must be between 0 and 180 days");
    }
    if (
      !(
        args.billToAddress.trim() &&
        args.city?.trim() &&
        args.state?.trim() &&
        args.postalCode?.trim()
      )
    ) {
      throw new Error(
        "A full billing address (street, city, state, ZIP) is required so sales tax can be calculated"
      );
    }
    const id = await ctx.db.insert("registrationInvoices", {
      orderId: order._id,
      number: await nextInvoiceNumber(ctx),
      organizationId: args.organizationId ?? order.organizationId,
      billToName: text(args.billToName, "Bill-to name", true),
      billToEmail: email(args.billToEmail),
      billToAddress: text(args.billToAddress, "Billing address"),
      city: text(args.city ?? "", "City"),
      state: text(args.state ?? "", "State"),
      postalCode: text(args.postalCode ?? "", "Postal code"),
      country: text(args.country ?? "US", "Country") || "US",
      poNumber: text(args.poNumber, "PO number"),
      notes: text(args.notes, "Invoice notes"),
      dueAt: Date.now() + args.dueDays * DAY_MS,
      amount: order.total,
      status: "draft",
      actor: actor.userId,
    });
    if (args.organizationId && order.organizationId !== args.organizationId) {
      await ctx.db.patch(order._id, { organizationId: args.organizationId });
    }
    await audit(
      ctx,
      actor.userId,
      "invoice-created",
      id,
      `${formatMoney(order.total)} for order ${order._id}`
    );
    return id;
  },
});
export const invoices = query({
  args: {
    status: v.optional(invoiceStatus),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      invoice: doc(schema, "registrationInvoices"),
      order: v.union(doc(schema, "registrationOrders"), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    await staff(ctx);
    const { status } = args;
    const rows = status
      ? await ctx.db
          .query("registrationInvoices")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("registrationInvoices")
          .order("desc")
          .paginate(args.paginationOpts);
    const page = await Promise.all(
      rows.page.map(async (invoice) => ({
        invoice,
        order: await ctx.db.get(invoice.orderId),
      }))
    );
    return { ...rows, page };
  },
});
export const orderInvoices = query({
  args: { orderId: v.id("registrationOrders") },
  returns: v.array(doc(schema, "registrationInvoices")),
  handler: async (ctx, args) => {
    await staff(ctx);
    return await ctx.db
      .query("registrationInvoices")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(BATCH);
  },
});
/** Staff-authorized read used by the Stripe issuing action. */
export const invoiceForIssue = internalQuery({
  args: { id: v.id("registrationInvoices") },
  returns: v.object({
    invoice: doc(schema, "registrationInvoices"),
    order: doc(schema, "registrationOrders"),
  }),
  handler: async (ctx, args) => {
    await staff(ctx);
    const invoice = await ctx.db.get(args.id);
    const order = invoice ? await ctx.db.get(invoice.orderId) : null;
    if (!(invoice && order)) {
      throw new Error("Invoice not found");
    }
    if (invoice.status === "paid" || invoice.status === "void") {
      throw new Error(`This invoice is already ${invoice.status}`);
    }
    if (order.status !== "unpaid") {
      throw new Error("The order is no longer awaiting payment");
    }
    if (invoice.amount !== order.total) {
      throw new Error("Invoice amount no longer matches the order");
    }
    return { invoice, order };
  },
});
/** Lets Node actions enforce the same staff check as queries and mutations. */
export const requireStaff = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await staff(ctx);
    return null;
  },
});
export const invoiceData = internalQuery({
  args: { id: v.id("registrationInvoices") },
  returns: v.union(doc(schema, "registrationInvoices"), v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.id),
});
export const attachStripeInvoice = internalMutation({
  args: {
    id: v.id("registrationInvoices"),
    stripeInvoiceId: v.string(),
    stripeCustomerId: v.string(),
    hostedUrl: v.string(),
    pdfUrl: v.optional(v.string()),
    tax: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    if (
      invoice.stripeInvoiceId &&
      invoice.stripeInvoiceId !== args.stripeInvoiceId
    ) {
      throw new Error("Invoice already attached to a different Stripe invoice");
    }
    const order = await ctx.db.get(invoice.orderId);
    if (
      invoice.status === "paid" ||
      invoice.status === "void" ||
      order?.status !== "unpaid"
    ) {
      await ctx.db.patch(invoice._id, {
        stripeInvoiceId: args.stripeInvoiceId,
        stripeCustomerId: args.stripeCustomerId,
        status: invoice.status === "paid" ? "paid" : "void",
      });
      await ctx.scheduler.runAfter(
        0,
        internal.registrationInvoiceActions.closeRemote,
        { id: invoice._id, attempt: 0 }
      );
      return null;
    }
    await ctx.db.patch(invoice._id, {
      stripeInvoiceId: args.stripeInvoiceId,
      stripeCustomerId: args.stripeCustomerId,
      hostedUrl: args.hostedUrl,
      pdfUrl: args.pdfUrl,
      tax: args.tax,
      status: invoice.status === "draft" ? "open" : invoice.status,
      sentAt: invoice.sentAt ?? Date.now(),
      error: undefined,
    });
    await enqueue(ctx, {
      key: `invoice:${invoice._id}`,
      kind: "email",
      recipient: invoice.billToEmail,
      subject: `Invoice ${invoice.number} from Taylored Instruction`,
      body: [
        `Hello ${invoice.billToName},`,
        `Invoice ${invoice.number} for ${order?.title ?? "training"} totals ${formatMoney(invoice.amount + args.tax)}${args.tax ? ` (including ${formatMoney(args.tax)} sales tax)` : ""} and is due ${new Date(invoice.dueAt).toLocaleDateString("en-US", { dateStyle: "long" })}.`,
        invoice.poNumber ? `PO number: ${invoice.poNumber}` : "",
        invoice.notes,
        "Use the secure link below to view the invoice, download a PDF, or pay by card.",
      ]
        .filter(Boolean)
        .join("\n"),
      due: Date.now(),
      link: { label: "View and pay invoice", url: args.hostedUrl },
    });
    await audit(ctx, "system", "invoice-sent", invoice._id, invoice.number);
    return null;
  },
});
export const invoiceFailure = internalMutation({
  args: { id: v.id("registrationInvoices"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (invoice) {
      await ctx.db.patch(invoice._id, { error: args.error });
    }
    return null;
  },
});
export const invoicePaid = internalMutation({
  args: {
    eventId: v.string(),
    stripeInvoiceId: v.string(),
    amount: v.number(),
    tax: v.optional(v.number()),
    currency: v.string(),
    paymentIntent: v.optional(v.string()),
    live: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertRegistrationPaymentMode(args.live);
    const seen = await ctx.db
      .query("registrationEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (seen) {
      return null;
    }
    const invoice = await ctx.db
      .query("registrationInvoices")
      .withIndex("by_stripeInvoiceId", (q) =>
        q.eq("stripeInvoiceId", args.stripeInvoiceId)
      )
      .unique();
    const order = invoice ? await ctx.db.get(invoice.orderId) : null;
    if (!(invoice && order)) {
      throw new Error("Unknown invoice payment");
    }
    if (
      invoice.status === "paid" &&
      order.paymentIntent !== args.paymentIntent
    ) {
      if (!args.paymentIntent || order.paymentIntent) {
        throw new Error(
          "Unexpected additional invoice payment requires reconciliation"
        );
      }
      const tax = args.tax ?? invoice.tax ?? 0;
      if (
        args.currency !== order.currency ||
        args.amount !== order.total + tax
      ) {
        throw new Error("Invoice payment mismatch");
      }
      await ctx.db.patch(order._id, {
        status: "exception",
        paymentIntent: args.paymentIntent,
        tax,
        source: "invoice-extra-payment",
        error:
          "Card payment received after offline settlement; refund or reconcile the extra payment",
      });
      await audit(
        ctx,
        "system",
        "invoice-extra-payment",
        order._id,
        args.paymentIntent
      );
    }
    if (invoice.status !== "paid") {
      const tax = args.tax ?? invoice.tax ?? 0;
      if (
        args.currency !== order.currency ||
        tax < 0 ||
        args.amount !== order.total + tax
      ) {
        throw new Error(
          "Invoice payment does not match the authoritative order"
        );
      }
      await ctx.db.patch(invoice._id, {
        status: "paid",
        method: "stripe",
        paidAt: Date.now(),
        tax,
        error: undefined,
      });
      await ctx.db.patch(order._id, { tax });
      await settle(ctx, { ...order, tax }, "invoice", args.paymentIntent);
      await audit(ctx, "system", "invoice-paid", invoice._id, invoice.number);
    }
    await ctx.db.insert("registrationEvents", {
      eventId: args.eventId,
      orderId: order._id,
      type: "invoice.paid",
      at: Date.now(),
    });
    return null;
  },
});
export const invoiceClosedEvent = internalMutation({
  args: { eventId: v.string(), stripeInvoiceId: v.string(), type: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("registrationEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (seen) {
      return null;
    }
    const invoice = await ctx.db
      .query("registrationInvoices")
      .withIndex("by_stripeInvoiceId", (q) =>
        q.eq("stripeInvoiceId", args.stripeInvoiceId)
      )
      .unique();
    if (!invoice) {
      return null;
    }
    if (invoice.status === "open" || invoice.status === "draft") {
      await ctx.db.patch(invoice._id, { status: "void", voidedAt: Date.now() });
      await audit(ctx, "system", "invoice-voided", invoice._id, args.type);
    }
    await ctx.db.insert("registrationEvents", {
      eventId: args.eventId,
      orderId: invoice.orderId,
      type: args.type,
      at: Date.now(),
    });
    return null;
  },
});
export const recordInvoicePayment = mutation({
  args: { id: v.id("registrationInvoices"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error(
        "Describe how payment was received (check number, ACH, etc.)"
      );
    }
    const invoice = await ctx.db.get(args.id);
    const order = invoice ? await ctx.db.get(invoice.orderId) : null;
    if (!(invoice && order)) {
      throw new Error("Invoice not found");
    }
    if (invoice.status === "paid" || invoice.status === "void") {
      throw new Error(`This invoice is already ${invoice.status}`);
    }
    if (order.status !== "unpaid") {
      throw new Error("The order is no longer awaiting payment");
    }
    await ctx.db.patch(invoice._id, {
      status: "paid",
      method: "offline",
      paidAt: Date.now(),
    });
    await ctx.db.patch(order._id, { tax: invoice.tax ?? 0 });
    await settle(ctx, { ...order, tax: invoice.tax ?? 0 }, "offline");
    if (invoice.stripeInvoiceId) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrationInvoiceActions.closeRemote,
        { id: invoice._id, attempt: 0 }
      );
    }
    await audit(
      ctx,
      actor.userId,
      "invoice-paid-offline",
      invoice._id,
      `${invoice.number}: ${args.reason.trim()}`
    );
    return null;
  },
});
export const voidInvoice = mutation({
  args: { id: v.id("registrationInvoices"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    if (!args.reason.trim()) {
      throw new Error("Reason required");
    }
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    if (invoice.status === "paid") {
      throw new Error("Paid invoices cannot be voided; issue a refund instead");
    }
    if (invoice.status === "void") {
      return null;
    }
    await ctx.db.patch(invoice._id, { status: "void", voidedAt: Date.now() });
    if (invoice.stripeInvoiceId) {
      await ctx.scheduler.runAfter(
        0,
        internal.registrationInvoiceActions.closeRemote,
        { id: invoice._id, attempt: 0 }
      );
    }
    await audit(
      ctx,
      actor.userId,
      "invoice-voided",
      invoice._id,
      `${invoice.number}: ${args.reason.trim()}`
    );
    return null;
  },
});
export const remindInvoice = mutation({
  args: { id: v.id("registrationInvoices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await staff(ctx);
    const invoice = await ctx.db.get(args.id);
    if (invoice?.status !== "open" || !invoice.hostedUrl) {
      throw new Error("Only sent, unpaid invoices can be reminded");
    }
    const now = Date.now();
    const overdue = invoice.dueAt < now;
    await enqueue(ctx, {
      key: `invoice-reminder:${invoice._id}:${now}`,
      kind: "email",
      recipient: invoice.billToEmail,
      subject: `${overdue ? "Overdue invoice" : "Invoice reminder"}: ${invoice.number}`,
      body: `Hello ${invoice.billToName},\nInvoice ${invoice.number} for ${formatMoney(invoice.amount + (invoice.tax ?? 0))} ${overdue ? "was due" : "is due"} ${new Date(invoice.dueAt).toLocaleDateString("en-US", { dateStyle: "long" })}. Use the secure link below to view or pay it.`,
      due: now,
      link: { label: "View and pay invoice", url: invoice.hostedUrl },
    });
    await ctx.db.patch(invoice._id, { remindedAt: now });
    await audit(
      ctx,
      actor.userId,
      "invoice-reminded",
      invoice._id,
      invoice.number
    );
    return null;
  },
});
