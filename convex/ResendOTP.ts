import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import { SUPPORT_EMAIL } from "../shared/email";
import { brandedEmail } from "../shared/registration/email";

const OTP_CODE_LENGTH = 6;
const DIGIT_ALPHABET = "0123456789";
const OTP_EXPIRY_MINUTES = 10;
const SECONDS_PER_MINUTE = 60;

function generateSixDigitCode(): string {
  const bytes = new Uint8Array(OTP_CODE_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => DIGIT_ALPHABET[byte % DIGIT_ALPHABET.length])
    .join("");
}

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  maxAge: OTP_EXPIRY_MINUTES * SECONDS_PER_MINUTE,
  generateVerificationToken() {
    return generateSixDigitCode();
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const emailFrom = process.env.AUTH_EMAIL_FROM;

    if (!emailFrom) {
      throw new Error("AUTH_EMAIL_FROM environment variable is not set");
    }

    const { error } = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: "Your Taylored Instruction Login Code",
      replyTo: SUPPORT_EMAIL,
      ...brandedEmail({
        eyebrow: "Account sign-in",
        title: "Your sign-in code",
        preview:
          "Use this code to finish signing in to Taylored Instruction. Expires in 10 minutes.",
        paragraphs: [
          "Enter this six-digit code on the sign-in page to securely access your account.",
        ],
        code: token,
        note: "This code expires in 10 minutes and can only be used once. Don’t share it with anyone. If you didn’t request this code, you can safely ignore this email.",
      }),
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
