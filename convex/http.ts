import { httpRouter } from "convex/server";
import { auth } from "./auth";

import { stripeWebhook } from "./registrationWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);
http.route({
  path: "/registration/stripe",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
