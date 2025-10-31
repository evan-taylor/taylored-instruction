import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

const TRUNCATE_LENGTH = 20;

export async function GET(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken();

    const envInfo = {
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL || "NOT SET",
      hasAuthGoogleId: !!process.env.AUTH_GOOGLE_ID,
      hasAuthGoogleSecret: !!process.env.AUTH_GOOGLE_SECRET,
      hasAuthEmailFrom: !!process.env.AUTH_EMAIL_FROM,
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      convexSiteUrl: process.env.CONVEX_SITE_URL || "NOT SET",
      nodeEnv: process.env.NODE_ENV,
    };

    const requestInfo = {
      url: request.url,
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
      cookies: request.cookies.getAll().map((c) => ({
        name: c.name,
        value: `${c.value.substring(0, TRUNCATE_LENGTH)}...`,
      })),
    };

    return NextResponse.json({
      authenticated: !!token,
      token: token
        ? `Present (truncated): ${token.substring(0, TRUNCATE_LENGTH)}...`
        : null,
      environment: envInfo,
      request: requestInfo,
      timestamp: new Date().toISOString(),
      message: token
        ? "✅ Server sees you as authenticated"
        : "❌ Server does NOT see you as authenticated",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check auth",
        message: error instanceof Error ? error.message : String(error),
        authenticated: false,
      },
      { status: 500 }
    );
  }
}
