import Stripe from "stripe";
import { cleanupPreviews } from "./stripe-preview-lifecycle";

const key = process.env.STRIPE_PREVIEW_SECRET_KEY;
if (!(key?.startsWith("sk_test_") || key?.startsWith("rk_test_"))) {
  throw new Error("STRIPE_PREVIEW_SECRET_KEY must be a Stripe test key");
}
const stripe = new Stripe(key);
const endpoints = await stripe.webhookEndpoints
  .list({ limit: 100 })
  .autoPagingToArray({ limit: 1000 });
const remaining = await cleanupPreviews(stripe, endpoints);
process.stdout.write(
  `Removed ${endpoints.length - remaining.length} retired preview webhook(s).\n`
);
