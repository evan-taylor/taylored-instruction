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
        const verificationUrl = new URL(url);
        verificationUrl.searchParams.set("email", identifier);
        verificationUrl.searchParams.set("redirectTo", "/my-account");
        const callbackUrl = verificationUrl.toString();

        const convexUrl = process.env.CONVEX_URL;
        if (!convexUrl) {
          throw new Error("CONVEX_URL environment variable is not set");
        }

        const otpInitiateUrl = `${convexUrl}/otp/initiate`;
        const response = await fetch(otpInitiateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: identifier.trim().toLowerCase(),
            callbackUrl,
            secret: process.env.INTERNAL_OTP_SECRET,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate OTP");
        }

        const { code } = await response.json();

        await resend.emails.send({
          from: emailFrom,
          to: identifier,
          subject: "Your Taylored Instruction Login Code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Your Login Code</h2>
              <p>Your verification code is:</p>
              <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${code}
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">Taylored Instruction - Professional CPR, BLS & Lifeguarding Training</p>
            </div>
          `,
          text: `Your Taylored Instruction login code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
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

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
