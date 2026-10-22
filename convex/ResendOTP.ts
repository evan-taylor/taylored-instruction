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
  apiKey: process.env.RESEND_API_KEY,
  generateVerificationToken() {
    return generateSixDigitCode();
  },
  id: "resend-otp",
  maxAge: OTP_EXPIRY_MINUTES * SECONDS_PER_MINUTE,
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const emailFrom = process.env.AUTH_EMAIL_FROM;

    if (!emailFrom) {
      throw new Error("AUTH_EMAIL_FROM environment variable is not set");
    }

    const { error } = await resend.emails.send({
      from: emailFrom,
<<<<<<< HEAD
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Login Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${token}
          </div>
          <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Taylored Instruction LLC</p>
        </div>
      `,
      subject: "Your Taylored Instruction Login Code",
      text: `Your Taylored Instruction login code is: ${token}\n\nThis code will expire in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
      to: [email],
=======
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
>>>>>>> origin/master
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
