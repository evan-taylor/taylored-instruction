import Stripe from "stripe";
import {
  registrationIsLive,
  registrationStripeKey,
} from "../shared/registration/environment";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { httpAction } from "./_generated/server";

const CHECKOUT_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
];
const INVOICE_CLOSED_EVENTS = [
  "invoice.voided",
  "invoice.marked_uncollectible",
];

async function invoicePaymentIntent(client: Stripe, invoiceId: string) {
  // Let lookup failures fail the webhook so Stripe retries before recording the event.
  const payments = await client.invoicePayments.list({
    invoice: invoiceId,
    status: "paid",
  });
  for (const payment of payments.data) {
    const intent = payment.payment.payment_intent;
    if (typeof intent === "string") {
      return intent;
    }
    if (intent?.id) {
      return intent.id;
    }
  }
}

async function handleCheckout(ctx: ActionCtx, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.registrationOrder;
  if (!orderId) {
    return;
  }
  await ctx.runMutation(internal.registrationPayments.paymentEvent, {
    eventId: event.id,
    paidAt: event.created * 1000,
    orderId: orderId as Id<"registrationOrders">,
    session: session.id,
    amount: session.amount_total ?? -1,
    currency: session.currency ?? "",
    paid: session.payment_status === "paid",
    live: session.livemode,
    type: event.type,
    paymentIntent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : undefined,
    tax: session.total_details?.amount_tax ?? 0,
  });
}
function invoiceTax(invoice: Stripe.Invoice) {
  const preTax = invoice.total_excluding_tax ?? invoice.subtotal;
  return Math.max(0, invoice.total - preTax);
}

async function handleInvoice(
  ctx: ActionCtx,
  client: Stripe,
  event: Stripe.Event
) {
  const invoice = event.data.object as Stripe.Invoice;
  if (!invoice.metadata?.registrationInvoice) {
    return;
  }
  if (event.type === "invoice.paid") {
    await ctx.runMutation(internal.registrationGroups.invoicePaid, {
      eventId: event.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      tax: invoiceTax(invoice),
      currency: invoice.currency,
      live: invoice.livemode,
      paymentIntent: await invoicePaymentIntent(client, invoice.id),
    });
    return;
  }
  await ctx.runMutation(internal.registrationGroups.invoiceClosedEvent, {
    eventId: event.id,
    stripeInvoiceId: invoice.id,
    type: event.type,
  });
}

async function handleRefund(ctx: ActionCtx, event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund;
  const operation = refund.metadata?.operation;
  if (operation && typeof refund.payment_intent === "string") {
    await ctx.runMutation(internal.registrationPayments.refundEvent, {
      id: operation as Id<"registrationRefunds">,
      stripeId: refund.id,
      amount: refund.amount,
      paymentIntent: refund.payment_intent,
      succeeded: refund.status === "succeeded",
      failed: refund.status === "failed" || refund.status === "canceled",
    });
  }
}

export const stripeWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.REGISTRATION_STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!(secret && signature)) {
    return new Response("Webhook not configured", { status: 400 });
  }
  let key: string;
  try {
    key = registrationStripeKey();
  } catch {
    return new Response("Webhook not configured", { status: 400 });
  }
  const client = new Stripe(key, { apiVersion: "2026-09-30.endive" });
  let event: Stripe.Event;
  try {
    event = await client.webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.livemode !== registrationIsLive() || event.account) {
    return new Response("Unexpected payment account or mode", { status: 400 });
  }
  if (CHECKOUT_EVENTS.includes(event.type)) {
    await handleCheckout(ctx, event);
  } else if (
    event.type === "invoice.paid" ||
    INVOICE_CLOSED_EVENTS.includes(event.type)
  ) {
    await handleInvoice(ctx, client, event);
  } else if (
    event.type === "refund.updated" ||
    event.type === "refund.created"
  ) {
    await handleRefund(ctx, event);
  }
  return new Response("Accepted", { status: 200 });
});
