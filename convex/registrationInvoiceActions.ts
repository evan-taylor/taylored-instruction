"use node";
import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

const HOUR_S = 3600;

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!(key?.startsWith("sk_test_") || key?.startsWith("rk_test_"))) {
    throw new Error("Configure STRIPE_SECRET_KEY with a test key");
  }
  return new Stripe(key, { apiVersion: "2026-09-30.endive" });
}

/**
 * Creates, finalizes, and emails a hosted Stripe invoice for an unpaid group
 * order. Amounts come only from the stored order snapshot. Every provider call
 * uses an idempotency key derived from the invoice so retries never duplicate.
 */
export const issue = action({
  args: { id: v.id("registrationInvoices") },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const { invoice, order } = await ctx.runQuery(
      internal.registrationGroups.invoiceForIssue,
      args
    );
    if (invoice.hostedUrl && invoice.stripeInvoiceId) {
      return invoice.hostedUrl;
    }
    const client = stripe();
    try {
      const customer = await client.customers.create(
        {
          name: invoice.billToName,
          email: invoice.billToEmail,
          ...(invoice.billToAddress
            ? { address: { line1: invoice.billToAddress } }
            : {}),
          metadata: { registrationInvoice: invoice._id },
        },
        { idempotencyKey: `registration-invoice-customer:${invoice._id}` }
      );
      const created = await client.invoices.create(
        {
          customer: customer.id,
          collection_method: "send_invoice",
          due_date: Math.max(
            Math.ceil(invoice.dueAt / 1000),
            Math.floor(Date.now() / 1000) + HOUR_S
          ),
          auto_advance: false,
          automatic_tax: { enabled: false },
          pending_invoice_items_behavior: "exclude",
          currency: "usd",
          description: `${order.title} · ${order.seats.length} attendee${order.seats.length === 1 ? "" : "s"}`,
          footer: invoice.notes || undefined,
          custom_fields: [
            { name: "Invoice", value: invoice.number },
            ...(invoice.poNumber
              ? [{ name: "PO number", value: invoice.poNumber }]
              : []),
          ],
          metadata: {
            registrationInvoice: invoice._id,
            registrationOrder: order._id,
            registrationNumber: invoice.number,
          },
        },
        { idempotencyKey: `registration-invoice:${invoice._id}` }
      );
      await Promise.all(
        order.seats.flatMap((seat, index) =>
          seat.lines
            .filter((line) => line.cents > line.discount)
            .map((line) =>
              client.invoiceItems.create(
                {
                  customer: customer.id,
                  invoice: created.id,
                  amount: line.cents - line.discount,
                  currency: "usd",
                  description: `${seat.attendee.name}: ${line.title}`,
                },
                {
                  idempotencyKey: `registration-invoice-item:${invoice._id}:${index}:${line.id}`,
                }
              )
            )
        )
      );
      const finalized = await client.invoices.finalizeInvoice(
        created.id,
        { auto_advance: false },
        { idempotencyKey: `registration-invoice-finalize:${invoice._id}` }
      );
      if (finalized.livemode || !finalized.hosted_invoice_url) {
        throw new Error("A test invoice URL was not returned");
      }
      if (finalized.amount_due !== order.total) {
        await client.invoices.voidInvoice(finalized.id);
        throw new Error("Provider invoice total did not match the order");
      }
      await ctx.runMutation(internal.registrationGroups.attachStripeInvoice, {
        id: invoice._id,
        stripeInvoiceId: finalized.id,
        stripeCustomerId: customer.id,
        hostedUrl: finalized.hosted_invoice_url,
        pdfUrl: finalized.invoice_pdf ?? undefined,
      });
      return finalized.hosted_invoice_url;
    } catch (error) {
      await ctx.runMutation(internal.registrationGroups.invoiceFailure, {
        id: invoice._id,
        error: error instanceof Error ? error.message : "Invoice issue failed",
      });
      throw error;
    }
  },
});

/** Voids the hosted Stripe invoice after a local void or offline payment. */
export const closeRemote = internalAction({
  args: { id: v.id("registrationInvoices"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await ctx.runQuery(
      internal.registrationGroups.invoiceData,
      { id: args.id }
    );
    if (!invoice?.stripeInvoiceId) {
      return null;
    }
    try {
      const client = stripe();
      const current = await client.invoices.retrieve(invoice.stripeInvoiceId);
      if (current.status === "open") {
        await client.invoices.voidInvoice(current.id);
      } else if (current.status === "draft") {
        await client.invoices.del(current.id);
      }
    } catch (error) {
      if (args.attempt >= 5) {
        await ctx.runMutation(internal.registrationGroups.invoiceFailure, {
          id: args.id,
          error:
            error instanceof Error
              ? `Stripe invoice could not be closed: ${error.message}`
              : "Stripe invoice could not be closed",
        });
        return null;
      }
      await ctx.scheduler.runAfter(
        60_000 * (args.attempt + 1),
        internal.registrationInvoiceActions.closeRemote,
        { ...args, attempt: args.attempt + 1 }
      );
    }
    return null;
  },
});
