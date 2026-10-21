import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { ResendOTP } from "./ResendOTP";

export const availableProviders = query({
  args: {},
  returns: v.object({ google: v.boolean() }),
  handler: () => ({
    google: Boolean(
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ),
  }),
});

/** Test-only password provider for isolated fixture deployments; never set the flag elsewhere. */
const testPassword =
  process.env.REGISTRATION_ALLOW_TEST_FIXTURES === "true"
    ? [
        Password({
          profile(params) {
            return {
              email: String(params.email ?? "")
                .trim()
                .toLowerCase(),
              emailVerificationTime: Date.now(),
            };
          },
        }),
      ]
    : [];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ...testPassword,
    ...(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM
      ? [ResendOTP]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
});
