import { httpRouter } from "convex/server";
import { auth } from "./auth";

import { resendWebhook } from "./registrationEmailWebhook";
import { stripeWebhook } from "./registrationWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);
http.route({
  path: "/registration/stripe",
  method: "POST",
  handler: stripeWebhook,
});

http.route({
  path: "/registration/resend",
  method: "POST",
  handler: resendWebhook,
});

export default http;
