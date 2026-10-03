// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";

init({
  dsn: "https://f31f65850f94006f5f71c6a16458e0aa@o4510288242933760.ingest.us.sentry.io/4510288256958464",

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
