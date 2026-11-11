// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";
import { isPrivateRegistrationUrl } from "./shared/registration/privacy";

init({
  traceLifecycle: "static",
  beforeSend: (event) =>
    isPrivateRegistrationUrl(event.request?.url) ? null : event,
  beforeSendTransaction: (event) =>
    isPrivateRegistrationUrl(event.request?.url) ? null : event,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

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
