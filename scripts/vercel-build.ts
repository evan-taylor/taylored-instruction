import { execFileSync } from "node:child_process";
import Stripe from "stripe";

// `convex deploy --cmd` supplies the URLs for this exact deployment.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const target = process.env.VERCEL_ENV;
if (
  !(
    convexUrl &&
    convexSiteUrl &&
    ["preview", "production"].includes(target ?? "")
  )
) {
  throw new Error("Run build:vercel through convex deploy on Vercel");
}
const [deployment] = new URL(convexUrl).hostname.split(".");
if (!deployment) {
  throw new Error("Missing Convex deployment name");
}
const mode = target === "production" ? "live" : "test";
const siteUrl =
  target === "preview"
    ? `https://${process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL;
if (!siteUrl || new URL(siteUrl).hostname === "undefined") {
  throw new Error("Configure the website origin");
}

// Production builds run with a project deploy key, which the Convex CLI rejects
// alongside `--deployment <name>`; `--prod` selects the production deployment
// it is scoped to. Preview builds still need the explicit preview deployment.
const deploymentFlags =
  target === "production" ? ["--prod"] : ["--deployment", deployment];

function convexEnv(command: "get" | "set", name: string, value?: string) {
  try {
    return execFileSync(
      "bunx",
      ["convex", "env", command, name, ...deploymentFlags],
      {
        input: value,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();
  } catch (error) {
    // Surface the CLI's message (it does not echo values) so failures are
    // diagnosable, but never the value being written.
    const stderr =
      error instanceof Error && "stderr" in error
        ? String((error as { stderr?: unknown }).stderr ?? "")
        : "";
    const hint = stderr
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !(value && line.includes(value)))
      .slice(-3)
      .join(" ");
    // biome-ignore lint/style/useErrorCause: the cause may carry the secret value.
    throw new Error(
      `Unable to ${command} Convex environment variable ${name}${hint ? `: ${hint}` : ""}`
    );
  }
}

convexEnv("set", "SITE_URL", new URL(siteUrl).origin);
convexEnv("set", "REGISTRATION_MODE", mode);
const key = convexEnv("get", "STRIPE_SECRET_KEY");
if (!(key.startsWith(`sk_${mode}_`) || key.startsWith(`rk_${mode}_`))) {
  throw new Error(`Convex STRIPE_SECRET_KEY must use ${mode} mode`);
}
// The on-page payment form loads Stripe.js with this key; when set it must match
// the mode. When missing, the payment step explains that card payment is off.
const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (publishable && !publishable.startsWith(`pk_${mode}_`)) {
  throw new Error(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a ${mode} key`);
}
for (const name of [
  "RESEND_API_KEY",
  "AUTH_EMAIL_FROM",
  "JWT_PRIVATE_KEY",
  "JWKS",
]) {
  if (!convexEnv("get", name)) {
    throw new Error(
      `Configure ${name} on the Convex deployment or project defaults`
    );
  }
}
if (mode === "test" && !convexEnv("get", "REGISTRATION_TEST_RECIPIENT")) {
  throw new Error(
    "Configure REGISTRATION_TEST_RECIPIENT in Convex preview defaults"
  );
}
if (convexEnv("get", "REGISTRATION_ALLOW_TEST_FIXTURES") === "true") {
  throw new Error("Test fixtures must be disabled on hosted deployments");
}

const stripe = new Stripe(key);
const url = `${convexSiteUrl}/registration/stripe`;
const enabledEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "refund.created",
  "refund.updated",
  "invoice.paid",
  "invoice.voided",
  "invoice.marked_uncollectible",
];
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const endpoint = endpoints.data.find((entry) => entry.url === url);
if (endpoint) {
  if (!convexEnv("get", "REGISTRATION_STRIPE_WEBHOOK_SECRET")) {
    throw new Error(
      "Existing Stripe endpoint needs its signing secret configured in Convex"
    );
  }
  await stripe.webhookEndpoints.update(endpoint.id, {
    enabled_events: enabledEvents,
  });
} else {
  // v2 retires the key that cached the exhausted preview quota. Keep this
  // namespace fixed: overlapping builds for one deployment must share a key,
  // regardless of other previews adding or removing their endpoints.
  const created = await stripe.webhookEndpoints.create(
    {
      url,
      enabled_events: enabledEvents,
      api_version: "2026-09-30.endive",
      description: `Taylored Instruction registration (${deployment})`,
    },
    { idempotencyKey: `registration-webhook:v2:${deployment}` }
  );
  if (!created.secret) {
    throw new Error("Stripe did not return a webhook signing secret");
  }
  convexEnv("set", "REGISTRATION_STRIPE_WEBHOOK_SECRET", created.secret);
}
execFileSync("bun", ["run", "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_BASE_URL: new URL(siteUrl).origin },
});
