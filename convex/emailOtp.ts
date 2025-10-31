import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const OTP_CODE_MAX = 1_000_000;
const OTP_CODE_LENGTH = 6;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MINUTES_FOR_EXPIRY = 10;
const OTP_EXPIRY_MS = MINUTES_FOR_EXPIRY * SECONDS_PER_MINUTE * MS_PER_SECOND;
const SALT_BYTES = 16;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MINUTE_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;
const RATE_LIMIT_HOUR_MS =
  MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const MAX_REQUESTS_PER_HOUR = 5;
const HEX_RADIX = 16;
const HEX_PAD_WIDTH = 2;

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(HEX_RADIX).padStart(HEX_PAD_WIDTH, "0"))
    .join("");
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(code + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(HEX_RADIX).padStart(HEX_PAD_WIDTH, "0"))
    .join("");
}

export function generateSixDigitCode(): string {
  const code = Math.floor(Math.random() * OTP_CODE_MAX);
  return code.toString().padStart(OTP_CODE_LENGTH, "0");
}

export const storeOtp = internalMutation({
  args: {
    email: v.string(),
    code: v.string(),
    callbackUrl: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + OTP_EXPIRY_MS;
    const salt = randomHex(SALT_BYTES);
    const codeHash = await hashCode(args.code, salt);

    const existingOtps = await ctx.db
      .query("email_otps")
      .withIndex("by_email_and_consumed", (q) =>
        q.eq("email", args.email).eq("consumed", false)
      )
      .collect();

    for (const otp of existingOtps) {
      await ctx.db.patch(otp._id, { consumed: true });
    }

    const otpId = await ctx.db.insert("email_otps", {
      email: args.email,
      codeHash,
      salt,
      callbackUrl: args.callbackUrl,
      expiresAt,
      createdAt: now,
      consumed: false,
      attempts: 0,
      lastSentAt: now,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    return { success: true, otpId };
  },
});

export const verifyOtp = internalMutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedEmail = args.email.trim().toLowerCase();

    const otps = await ctx.db
      .query("email_otps")
      .withIndex("by_email_and_consumed", (q) =>
        q.eq("email", normalizedEmail).eq("consumed", false)
      )
      .collect();

    const validOtps = otps
      .filter((otpRecord) => otpRecord.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (validOtps.length === 0) {
      return {
        success: false,
        error: "Invalid or expired code",
      };
    }

    const otp = validOtps[0];

    if (otp.attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(otp._id, { consumed: true });
      return {
        success: false,
        error: "Too many attempts. Please request a new code.",
      };
    }

    const codeHash = await hashCode(args.code, otp.salt);
    const isValid = codeHash === otp.codeHash;

    if (!isValid) {
      await ctx.db.patch(otp._id, {
        attempts: otp.attempts + 1,
      });
      return {
        success: false,
        error: "Invalid or expired code",
      };
    }

    await ctx.db.patch(otp._id, { consumed: true });

    return {
      success: true,
      callbackUrl: otp.callbackUrl,
    };
  },
});

export const checkRateLimit = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneMinuteAgo = now - RATE_LIMIT_MINUTE_MS;
    const oneHourAgo = now - RATE_LIMIT_HOUR_MS;
    const normalizedEmail = args.email.trim().toLowerCase();

    const recentOtps = await ctx.db
      .query("email_otps")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    const otpsInLastMinute = recentOtps.filter(
      (otp) => otp.lastSentAt > oneMinuteAgo
    );
    const otpsInLastHour = recentOtps.filter(
      (otp) => otp.lastSentAt > oneHourAgo
    );

    if (otpsInLastMinute.length > 0) {
      return {
        allowed: false,
        error: "Please wait at least 60 seconds before requesting another code",
      };
    }

    if (otpsInLastHour.length >= MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        error: "Too many requests. Please try again later.",
      };
    }

    return { allowed: true };
  },
});
