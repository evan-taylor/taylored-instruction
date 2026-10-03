"use node";
import { v } from "convex/values";
import { Resend } from "resend";
import Stripe from "stripe";
import {
  escapeHtml,
  renderEmail,
  renderSubject,
} from "../shared/registration/domain";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

const INVITATION_PATH =
  /Register at (\/s\/[A-Za-z0-9_-]+#invitation=[A-Za-z0-9-]+)/u;

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!(key?.startsWith("sk_test_") || key?.startsWith("rk_test_"))) {
    throw new Error("Configure STRIPE_SECRET_KEY with a test key");
  }
  return new Stripe(key, { apiVersion: "2026-09-30.endive" });
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
        // Test-only registration amounts exclude automatic tax. Confirm tax
        // treatment before a separately reviewed production enablement.
        automatic_tax: { enabled: false },
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
                product_data: { name: `${seat.attendee.name}: ${line.title}` },
                unit_amount: line.cents - line.discount,
              },
              quantity: 1,
            }))
        ),
        success_url: `${baseUrl()}/registration/success`,
        cancel_url: `${baseUrl()}/classes`,
      },
      { idempotencyKey: `registration:${order._id}` }
    );
    if (!session.url || session.livemode) {
      throw new Error("A test Checkout URL was not returned");
    }
    await ctx.runMutation(internal.registrationPayments.attachCheckout, {
      orderId: order._id,
      session: session.id,
      url: session.url,
    });
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
      throw new Error("Refund awaiting reconciliation");
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
          const recipient = process.env.REGISTRATION_TEST_RECIPIENT;
          const from = process.env.AUTH_EMAIL_FROM;
          if (!(recipient && from && process.env.RESEND_API_KEY)) {
            throw new Error(
              "Safe test recipient, sender, and Resend key required"
            );
          }
          // All registration mail is forced to the explicit safe test recipient until a separate release change.
          const variables = {
            attendeeName: job.name,
            courseTitle: job.title,
            meetingDates: job.schedule,
            materials: job.materials
              .map((m) => `${m.title}: ${m.url ?? "Open portal"}`)
              .join("\n"),
            portalLink: `${baseUrl()}/registrations`,
          };
          const content = renderEmail(job.body, variables);
          const invitationPath = job.body.match(INVITATION_PATH)?.[1];
          const invitationLink = invitationPath
            ? `<p><a href="${escapeHtml(baseUrl() + invitationPath)}">Accept or decline your reserved opening</a></p>`
            : "";
          const materialList = job.materials
            .map(
              (m) =>
                `<li>${m.url ? `<a href="${escapeHtml(m.url)}">${escapeHtml(m.title)}</a>` : escapeHtml(m.title)}</li>`
            )
            .join("");
          const response = await new Resend(
            process.env.RESEND_API_KEY
          ).emails.send(
            {
              from,
              to: recipient,
              subject: renderSubject(job.subject, variables),
              attachments: job.calendar
                ? [
                    {
                      filename: "class.ics",
                      content: Buffer.from(job.calendar).toString("base64"),
                      contentType: "text/calendar",
                    },
                  ]
                : undefined,
              html: `${content}${invitationLink}<p>${escapeHtml(job.title)}</p><p>${escapeHtml(job.schedule)}</p><ul>${materialList}</ul><p><a href="${escapeHtml(baseUrl())}/registrations">Secure registration access</a></p>`,
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
    const recipient = process.env.REGISTRATION_TEST_RECIPIENT;
    const from = process.env.AUTH_EMAIL_FROM;
    if (!(recipient && from && process.env.RESEND_API_KEY)) {
      throw new Error("Safe test email configuration required");
    }
    const response = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from,
      to: recipient,
      subject: "Your secure registration access",
      text: `Open ${baseUrl()}/registrations/access#${token} and confirm access. This link expires in 30 minutes.`,
    });
    if (response.error) {
      throw new Error("Access email could not be sent. Try again later.");
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
          if (result.status === "succeeded") {
            await ctx.runMutation(internal.registrationPayments.finishRefund, {
              id,
              stripeId: result.id,
            });
          }
        } catch (error) {
          await ctx.runMutation(internal.registrationPayments.refundFailure, {
            id,
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
