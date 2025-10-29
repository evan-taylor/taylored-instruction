import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";
import { Resend } from "resend";

const providers: Array<ReturnType<typeof Email> | ReturnType<typeof Google>> =
  [];

if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.AUTH_EMAIL_FROM;

  providers.push(
    Email({
      id: "email",
      sendVerificationRequest: async ({ identifier, url }) => {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: identifier,
          subject: "Sign in to Taylored Instruction",
          html: `<p>Click <a href="${url}">this link</a> to sign in.</p>`,
          text: `Sign in: ${url}`,
        });
      },
    })
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers,
});
