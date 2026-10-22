"use node";
import { ConvexError, v } from "convex/values";
import { Resend } from "resend";
import Stripe from "stripe";
import { brandedEmail, registrationEmail } from "../shared/registration/email";
import {
  assertRegistrationPaymentMode,
  registrationRecipient,
  registrationStripeKey,
} from "../shared/registration/environment";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

function stripe() {
  return new Stripe(registrationStripeKey(), {
    apiVersion: "2026-09-30.endive",
  });
}
function baseUrl() {
  const url = process.env.SITE_URL;
  if (!url) {
    throw new Error("Configure SITE_URL");
  }
  return new URL(url).origin;
}
export const checkout = action({
  args: { orderId: v.id("registrationOrders"), requestKey: v.string() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const order = await ctx.runQuery(
      internal.registrationPayments.checkoutOrder,
      args
    );
    if (order.checkoutUrl) {
      return order.checkoutUrl;
    }
    const client = stripe();
    const session = await client.checkout.sessions.create(
      {
        mode: "payment",
        // Stripe Tax computes sales tax from the billing address collected at
        // checkout and each line's tax code; local totals stay pre-tax.
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        allowed_payment_method_types: ["card"],
        customer_email: order.purchaser,
        client_reference_id: order._id,
        metadata: { registrationOrder: order._id },
        // Stripe requires at least 30 minutes from session creation. This stable
        // timestamp also preserves identical parameters across idempotent retries.
        expires_at: Math.ceil(order.expires / 1000) + 1800,
        line_items: order.seats.flatMap((seat) =>
          seat.lines
            .filter((l) => l.cents > l.discount)
            .map((line) => ({
              price_data: {
                currency: "usd",
                product_data: {
                  name: `${seat.attendee.name}: ${line.title}`,
                  ...(line.taxCode ? { tax_code: line.taxCode } : {}),
                },
                unit_amount: line.cents - line.discount,
                tax_behavior: "exclusive",
              },
              quantity: 1,
            }))
        ),
        success_url: `${baseUrl()}/registration/success`,
        cancel_url: `${baseUrl()}/classes`,
      },
      { idempotencyKey: `registration:${order._id}` }
    );
    assertRegistrationPaymentMode(session.livemode);
    if (!session.url) {
      throw new ConvexError(
        "Checkout could not be opened. Please try again in a moment."
      );
    }
    const attached = await ctx.runMutation(
      internal.registrationPayments.attachCheckout,
      {
        orderId: order._id,
        session: session.id,
        url: session.url,
      }
    );
    if (!attached) {
      throw new ConvexError(
        "Reservation ended before checkout was ready. No payment link was issued."
      );
    }
    return session.url;
  },
});
export const refund = action({
  args: { id: v.id("registrationRefunds") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Public caller cannot invent intents: only an authorized admin mutation can persist one.
    const { refund: intent, order } = await ctx.runQuery(
      internal.registrationPayments.refundData,
      args
    );
    if (intent.state !== "pending" || !order.paymentIntent) {
      return null;
    }
    const result = await stripe().refunds.create(
      {
        payment_intent: order.paymentIntent,
        amount: intent.cents,
        metadata: { operation: intent._id },
      },
      { idempotencyKey: `registration-refund:${intent._id}` }
    );
    if (result.status !== "succeeded") {
      throw new ConvexError("Refund awaiting reconciliation");
    }
    await ctx.runMutation(internal.registrationPayments.finishRefund, {
      id: intent._id,
      stripeId: result.id,
    });
    return null;
  },
});

export const deliver = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.registrationMail.due, {});
    await Promise.all(
      ids.map(async (id) => {
        const job = await ctx.runMutation(internal.registrationMail.claim, {
          id,
        });
        if (!job) {
          return;
        }
        try {
          const recipient = registrationRecipient(job.recipient);
          const from = process.env.AUTH_EMAIL_FROM;
          if (!(recipient && from && process.env.RESEND_API_KEY)) {
            throw new Error("Recipient, sender, and Resend key required");
          }
          const rendered = registrationEmail(job, baseUrl());
          const response = await new Resend(
            process.env.RESEND_API_KEY
          ).emails.send(
            {
              from,
              to: recipient,
              subject: rendered.subject,
              replyTo: "info@tayloredinstruction.com",
              text: rendered.text,
              attachments: job.calendar
                ? [
                    {
                      filename: "class.ics",
                      content: Buffer.from(job.calendar).toString("base64"),
                      contentType: "text/calendar",
                    },
                  ]
                : undefined,
              html: rendered.html,
            },
            { idempotencyKey: `registration-mail:${id}` }
          );
          if (response.error) {
            throw new Error(response.error.message);
          }
          await ctx.runMutation(internal.registrationMail.result, {
            id,
            success: true,
            providerId: response.data?.id,
          });
        } catch (error) {
          await ctx.runMutation(internal.registrationMail.result, {
            id,
            success: false,
            error: error instanceof Error ? error.message : "Email failed",
          });
        }
      })
    );
    return null;
  },
});
export const requestPortal = action({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const tokenHash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    await ctx.runMutation(internal.registrationPortal.issue, {
      email: args.email,
      tokenHash,
    });
    const recipient = registrationRecipient(args.email.trim().toLowerCase());
    const from = process.env.AUTH_EMAIL_FROM;
    if (!(recipient && from && process.env.RESEND_API_KEY)) {
      throw new Error("Email configuration required");
    }
    const response = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from,
      to: recipient,
      subject: "Your secure registration access",
      replyTo: "info@tayloredinstruction.com",
      ...brandedEmail({
        eyebrow: "Secure registration access",
        title: "Access your registrations",
        preview:
          "Access your registrations, class details, materials, and payment records. Link expires in 30 minutes.",
        paragraphs: [
          "View your class schedule and joining instructions, open available course materials, or check your orders and payments.",
          "Select the button below, then confirm access on the page. No password needed.",
        ],
        action: {
          label: "Access my registrations",
          url: `${baseUrl()}/registrations/access#${token}`,
        },
        note: "This one-time link expires in 30 minutes. After you confirm, this device has access for 24 hours. Keep this link private. If you didn’t request it, you can ignore this email.",
      }),
    });
    if (response.error) {
      throw new ConvexError("Access email could not be sent. Try again later.");
    }
    return null;
  },
});
export const reconcileRefunds = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ids = await ctx.runQuery(
      internal.registrationPayments.pendingRefunds,
      {}
    );
    await Promise.all(
      ids.map(async (id) => {
        try {
          const { refund: intent, order } = await ctx.runQuery(
            internal.registrationPayments.refundData,
            { id }
          );
          if (!order.paymentIntent || intent.state !== "pending") {
            return;
          }
          const result = await stripe().refunds.create(
            {
              payment_intent: order.paymentIntent,
              amount: intent.cents,
              metadata: { operation: intent._id },
            },
            { idempotencyKey: `registration-refund:${intent._id}` }
          );
          if (result.status === "failed" || result.status === "canceled") {
            await ctx.runMutation(internal.registrationPayments.refundEvent, {
              id,
              stripeId: result.id,
              amount: intent.cents,
              paymentIntent: order.paymentIntent,
              succeeded: false,
              failed: true,
            });
          }
          if (result.status === "succeeded") {
            await ctx.runMutation(internal.registrationPayments.finishRefund, {
              id,
              stripeId: result.id,
            });
          }
        } catch (error) {
          await ctx.runMutation(internal.registrationPayments.refundFailure, {
            id,
            terminal: error instanceof Stripe.errors.StripeInvalidRequestError,
            error:
              error instanceof Error
                ? error.message
                : "Refund reconciliation failed",
          });
        }
      })
    );
    return null;
  },
});

export const expireCheckout = internalAction({
  args: { session: v.string(), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const client = stripe();
      const session = await client.checkout.sessions.retrieve(args.session);
      if (session.status === "open") {
        await client.checkout.sessions.expire(args.session);
      }
    } catch (error) {
      if (args.attempt >= 5) {
        throw error;
      }
      await ctx.scheduler.runAfter(
        60_000 * (args.attempt + 1),
        internal.registrationExternal.expireCheckout,
        { ...args, attempt: args.attempt + 1 }
      );
    }
    return null;
  },
});
