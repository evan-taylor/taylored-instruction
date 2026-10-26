import { Resend, type WebhookEventPayload } from "resend";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.opened",
  "email.clicked",
  "email.failed",
  "email.suppressed",
]);

export const resendWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured", { status: 503 });
  }
  const eventId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!(eventId && timestamp && signature)) {
    return new Response("Missing signature", { status: 400 });
  }
  const payload = await request.text();
  let event: WebhookEventPayload;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id: eventId, timestamp, signature },
      webhookSecret: secret,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (EVENTS.has(event.type) && "email_id" in event.data) {
    const at = Date.parse(event.created_at);
    if (!Number.isFinite(at)) {
      return new Response("Invalid timestamp", { status: 400 });
    }
    // Store by provider ID even before the sender saves its result, avoiding a
    // webhook/send-result race. Database failures propagate so Resend retries.
    await ctx.runMutation(internal.registrationEngagement.recordEmailEvent, {
      eventId,
      providerId: event.data.email_id,
      type: event.type,
      at,
    });
  }
  return new Response("OK");
});
