import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

const providers: Array<
  ReturnType<typeof ResendOTP> | ReturnType<typeof Google>
> = [];

if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) {
  providers.push(ResendOTP);
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
