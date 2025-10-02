// This file configures the initialization of PostHog on the client.
// The added config here will be used whenever a users loads a page in their browser.

import posthog from "posthog-js";

// Initialize PostHog
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  defaults: "2025-05-24",
});
