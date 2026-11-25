import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * The Stripe Customer for the signed-in account, or null when nobody is
 * signed in. The email comes from the verified session, never the request.
 */
export async function signedInCustomer() {
  const token = await convexAuthNextjsToken();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!(token && url)) {
    return null;
  }
  const convex = new ConvexHttpClient(url);
  convex.setAuth(token);
  return await convex.action(api.registrationCustomers.signedInCustomer, {});
}
