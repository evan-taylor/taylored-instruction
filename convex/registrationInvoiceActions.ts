"use node";
import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { DEFAULT_TAX_CODES } from "../shared/registration/domain";
import {
  assertRegistrationPaymentMode,
  registrationStripeKey,
} from "../shared/registration/environment";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";

const HOUR_S = 3600;
const TAX_CODE_PAGE = 100;
const TAX_CODE_LIMIT = 600;

function stripe() {
  return new Stripe(registrationStripeKey(), {
    apiVersion: "2026-09-30.endive",
  });
}

/**
 * Invoice items need a Stripe Product to carry a tax code. One product per
 * tax code is created on demand with a deterministic id so retries reuse it.
 */
async function productForTaxCode(client: Stripe, taxCode?: string) {
  const id = taxCode ? `registration_${taxCode}` : "registration_default";
  try {
    return (await client.products.retrieve(id)).id;
  } catch {
    const created = await client.products.create(
      {
        id,
        name: taxCode
          ? `Registration line (${taxCode})`
          : "Registration line (account default tax code)",
        ...(taxCode ? { tax_code: taxCode } : {}),
        metadata: { registration: "line" },
      },
      { idempotencyKey: `registration-product:${id}` }
    );
    return created.id;
  }
}

function customerAddress(invoice: Doc<"registrationInvoices">) {
  return {
    line1: invoice.billToAddress,
    city: invoice.city,
    state: invoice.state,
    postal_code: invoice.postalCode,
    country: invoice.country ?? "US",
  };
}

/**
 * Creates, finalizes, and emails a hosted Stripe invoice for an unpaid group
 * order. Amounts come only from the stored order snapshot; Stripe Tax adds
 * sales tax from the billing address and each line's tax code. Every provider
 * call uses an idempotency key derived from the invoice so retries never
 * duplicate.
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
          address: customerAddress(invoice),
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
            Math.floor(invoice._creationTime / 1000) + HOUR_S
          ),
          auto_advance: false,
          automatic_tax: { enabled: true },
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
      const lines = order.seats.flatMap((seat, index) =>
        seat.lines
          .filter((line) => line.cents > line.discount)
          .map((line) => ({ seat, index, line }))
      );
      const codes = [...new Set(lines.map((l) => l.line.taxCode ?? ""))];
      const products = new Map(
        await Promise.all(
          codes.map(
            async (code) =>
              [
                code,
                await productForTaxCode(client, code || undefined),
              ] as const
          )
        )
      );
      await Promise.all(
        lines.map(({ seat, index, line }) =>
          client.invoiceItems.create(
            {
              customer: customer.id,
              invoice: created.id,
              description: `${seat.attendee.name}: ${line.title}`,
              quantity: 1,
              price_data: {
                currency: "usd",
                product: products.get(line.taxCode ?? "") ?? "",
                unit_amount: line.cents - line.discount,
                tax_behavior: "exclusive",
              },
            },
            {
              idempotencyKey: `registration-invoice-item:${invoice._id}:${index}:${line.id}`,
            }
          )
        )
      );
      const finalized = await client.invoices.finalizeInvoice(
        created.id,
        { auto_advance: false },
        { idempotencyKey: `registration-invoice-finalize:${invoice._id}` }
      );
      assertRegistrationPaymentMode(finalized.livemode);
      if (!finalized.hosted_invoice_url) {
        throw new ConvexError(
          "The invoice was created but no payment link came back. Retry sending it."
        );
      }
      const preTax = finalized.total_excluding_tax ?? finalized.subtotal;
      if (preTax !== order.total) {
        await client.invoices.voidInvoice(finalized.id);
        throw new ConvexError(
          "Provider invoice subtotal did not match the order"
        );
      }
      await ctx.runMutation(internal.registrationGroups.attachStripeInvoice, {
        id: invoice._id,
        stripeInvoiceId: finalized.id,
        stripeCustomerId: customer.id,
        hostedUrl: finalized.hosted_invoice_url,
        pdfUrl: finalized.invoice_pdf ?? undefined,
        tax: Math.max(0, finalized.total - preTax),
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

/** Stripe Tax codes for the admin pickers; falls back to common codes offline. */
export const taxCodes = action({
  args: {},
  returns: v.array(
    v.object({ id: v.string(), name: v.string(), description: v.string() })
  ),
  handler: async (ctx) => {
    await ctx.runQuery(internal.registrationGroups.requireStaff, {});
    const fallback = DEFAULT_TAX_CODES.map((c) => ({ ...c, description: "" }));
    try {
      const client = stripe();
      const codes: { id: string; name: string; description: string }[] = [];
      for await (const code of client.taxCodes.list({
        limit: TAX_CODE_PAGE,
      })) {
        codes.push({
          id: code.id,
          name: code.name,
          description: code.description,
        });
        if (codes.length >= TAX_CODE_LIMIT) {
          break;
        }
      }
      return codes.length ? codes : fallback;
    } catch {
      return fallback;
    }
  },
});
