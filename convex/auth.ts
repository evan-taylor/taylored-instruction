import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

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
