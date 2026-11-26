// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import {
  addIntegration,
  captureException,
  captureRouterTransitionStart,
  init,
} from "@sentry/nextjs";
import { startPostHog } from "@/lib/posthog-browser";
import { whenPageIsIdle } from "@/lib/when-page-is-idle";
import { isPrivateRegistrationPath } from "@/shared/registration/privacy";

startPostHog();

export const onRouterTransitionStart = captureRouterTransitionStart;

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

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

const loadSentryReplay = async () => {
  const { replayIntegration } = await import("@sentry/replay");
  addIntegration(
    replayIntegration({
      beforeAddRecordingEvent: (event) =>
        isPrivateRegistrationPath(window.location.pathname) ? null : event,
    })
  );
};

whenPageIsIdle(() => {
  loadSentryReplay().catch(captureException);
});
