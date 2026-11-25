// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import {
  captureRouterTransitionStart,
  init,
  replayIntegration,
} from "@sentry/nextjs";
import posthog from "posthog-js";
import { rememberEmailClick } from "@/lib/email-attribution";
import { getPostHogEnv } from "@/lib/posthog-env";
import { analyticsSafeEvent } from "@/shared/analytics-urls";
import { withoutStaleEmailCredit } from "@/shared/email-attribution";
import { privateAnalyticsEvent } from "@/shared/registration/analytics";
import { isPrivateRegistrationPath } from "@/shared/registration/privacy";

const { host: posthogHost, projectToken: posthogProjectToken } =
  getPostHogEnv();

if (posthogProjectToken && posthogHost) {
  posthog.init(posthogProjectToken, {
    api_host: "/ingest",
    ui_host: posthogHost.includes("eu.")
      ? "https://eu.posthog.com"
      : "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    before_send: (event) => {
      if (!event) {
        return event;
      }
      const credited = withoutStaleEmailCredit(event);
      return isPrivateRegistrationPath(window.location.pathname)
        ? privateAnalyticsEvent(credited)
        : analyticsSafeEvent(credited);
    },
    capture_pageleave: true,
    capture_exceptions: true,
    tracing_headers: [window.location.hostname],
    defaults: "2025-05-24",
    debug: process.env.NODE_ENV === "development",
  });
  rememberEmailClick(posthog, window.location.search);
}

export const onRouterTransitionStart = captureRouterTransitionStart;

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [
    replayIntegration({
      beforeAddRecordingEvent: (event) =>
        isPrivateRegistrationPath(window.location.pathname) ? null : event,
    }),
  ],
  beforeSend: (event) =>
    isPrivateRegistrationPath(window.location.pathname) ? null : event,
  beforeSendTransaction: (event) =>
    isPrivateRegistrationPath(window.location.pathname) ? null : event,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  traceLifecycle: "static",

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Preserve user context without enabling v11's new payload collection defaults.
  dataCollection: {
    userInfo: true,
    cookies: true,
    httpHeaders: { request: true, response: false },
    urlQueryParams: true,
    httpBodies: ["incomingRequest"],
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    graphQL: { document: true, variables: false },
    genAI: { inputs: false, outputs: false },
  },
});
