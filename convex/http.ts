import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const OTP_CODE_MAX = 1_000_000;
const OTP_CODE_LENGTH = 6;

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/otp/initiate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { email, callbackUrl, secret } = body;

    if (secret !== process.env.INTERNAL_OTP_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!(email && callbackUrl)) {
      return new Response(
        JSON.stringify({ error: "Email and callbackUrl required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const rateLimitCheck = await ctx.runQuery(api.emailOtp.checkRateLimit, {
      email: normalizedEmail,
    });

    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({ error: rateLimitCheck.error }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const code = Math.floor(Math.random() * OTP_CODE_MAX)
      .toString()
      .padStart(OTP_CODE_LENGTH, "0");

    const result = await ctx.runMutation(api.emailOtp.storeOtp, {
      email: normalizedEmail,
      code,
      callbackUrl,
    });

    return new Response(JSON.stringify({ code, success: result.success }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/otp/verify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { email, code } = body;

    if (!(email && code)) {
      return new Response(
        JSON.stringify({ error: "Email and code required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await ctx.runMutation(api.emailOtp.verifyOtp, {
      email: normalizedEmail,
      code,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const siteUrl = process.env.CONVEX_SITE_URL || process.env.SITE_URL;
    if (siteUrl && !result.callbackUrl?.startsWith(siteUrl)) {
      return new Response(JSON.stringify({ error: "Invalid callback URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, redirectUrl: result.callbackUrl }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
