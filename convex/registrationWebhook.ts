import Stripe from "stripe";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

export const stripeWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.REGISTRATION_STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  const signature = request.headers.get("stripe-signature");
  if (
    !(
      secret &&
      signature &&
      (key?.startsWith("sk_test_") || key?.startsWith("rk_test_"))
    )
  ) {
    return new Response("Webhook not configured", { status: 400 });
  }
  let event: Stripe.Event;
  try {
    event = await new Stripe(key, {
      apiVersion: "2026-09-30.endive",
    }).webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.livemode || event.account) {
    return new Response("Unexpected payment account or mode", { status: 400 });
  }
  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.expired",
      "checkout.session.async_payment_failed",
    ].includes(event.type)
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.registrationOrder;
    if (!orderId) {
      return new Response("Ignored", { status: 200 });
    }
    await ctx.runMutation(internal.registrationPayments.paymentEvent, {
      eventId: event.id,
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
    });
  }
  if (event.type === "refund.updated" || event.type === "refund.created") {
    const refund = event.data.object as Stripe.Refund;
    const operation = refund.metadata?.operation;
    if (operation && typeof refund.payment_intent === "string") {
      await ctx.runMutation(internal.registrationPayments.refundEvent, {
        id: operation as Id<"registrationRefunds">,
        stripeId: refund.id,
        amount: refund.amount,
        paymentIntent: refund.payment_intent,
        succeeded: refund.status === "succeeded",
      });
    }
  }
  return new Response("Accepted", { status: 200 });
});
