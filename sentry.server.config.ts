// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";

const tracesSampleRate = process.env.NODE_ENV === "production" ? undefined : 1;

init({
  dsn: "https://f31f65850f94006f5f71c6a16458e0aa@o4510288242933760.ingest.us.sentry.io/4510288256958464",

  // Static prerendering can run before request/fetch data exists, so avoid
  // server-side tracing in production to prevent NEXT_STATIC_GEN_BAILOUT.
  ...(tracesSampleRate === undefined ? {} : { tracesSampleRate }),

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
