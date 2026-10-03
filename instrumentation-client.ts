// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import {
  captureRouterTransitionStart,
  init,
  replayIntegration,
} from "@sentry/nextjs";
import posthog from "posthog-js";
import { getMissingPostHogEnvVariable, getPostHogEnv } from "@/lib/posthog-env";
import { isPrivateRegistrationPath } from "@/shared/registration/privacy";

const { host: posthogHost, projectToken: posthogProjectToken } =
  getPostHogEnv();

if (posthogProjectToken && posthogHost) {
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    person_profiles: "identified_only",
    capture_pageview: false,
    before_send: (event) =>
      isPrivateRegistrationPath(window.location.pathname) ? null : event,
    capture_pageleave: true,
    capture_exceptions: true,
    defaults: "2025-05-24",
    debug: process.env.NODE_ENV === "development",
  });
} else if (process.env.NODE_ENV !== "production") {
  const missingVariable = getMissingPostHogEnvVariable();

  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
  );
}

export const onRouterTransitionStart = captureRouterTransitionStart;

init({
  dsn: "https://f31f65850f94006f5f71c6a16458e0aa@o4510288242933760.ingest.us.sentry.io/4510288256958464",

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
