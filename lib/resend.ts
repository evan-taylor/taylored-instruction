import { Resend } from "resend";

// Lazy initialization to avoid errors during build time
let _resend: Resend | null = null;

export function getResendClient(): Resend {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY environment variable. Check your .env file."
    );
  }

  _resend = new Resend(apiKey);
  return _resend;
}
