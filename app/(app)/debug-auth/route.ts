import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

const TRUNCATE_LENGTH = 20;

export async function GET(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken();

    const envInfo = {
      convexSiteUrl: process.env.CONVEX_SITE_URL || "NOT SET",
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL || "NOT SET",
      hasAuthEmailFrom: !!process.env.AUTH_EMAIL_FROM,
      hasAuthGoogleId: !!process.env.AUTH_GOOGLE_ID,
      hasAuthGoogleSecret: !!process.env.AUTH_GOOGLE_SECRET,
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    };

    const requestInfo = {
      cookies: request.cookies.getAll().map((c) => ({
        name: c.name,
        value: `${c.value.substring(0, TRUNCATE_LENGTH)}...`,
      })),
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      url: request.url,
      userAgent: request.headers.get("user-agent"),
    };

    return NextResponse.json({
      authenticated: !!token,
      environment: envInfo,
      message: token
        ? "✅ Server sees you as authenticated"
        : "❌ Server does NOT see you as authenticated",
      request: requestInfo,
      timestamp: new Date().toISOString(),
      token: token
        ? `Present (truncated): ${token.substring(0, TRUNCATE_LENGTH)}...`
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "Failed to check auth",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
