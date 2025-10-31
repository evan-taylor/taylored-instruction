import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

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
          <p style="color: #666; font-size: 12px;">Taylored Instruction - Professional CPR, BLS & Lifeguarding Training</p>
        </div>
      `,
      text: `Your Taylored Instruction login code is: ${token}\n\nThis code will expire in ${OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
