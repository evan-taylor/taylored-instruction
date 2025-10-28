import {
  convexAuthNextjsMiddleware,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

export const middleware = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const { pathname } = request.nextUrl;

    const protectedRoutes = ["/my-account", "/ecards"];
    const ignoredPaths = ["/api/webhook"];

    const isIgnoredPath = ignoredPaths.some((path) =>
      pathname.startsWith(path)
    );
    if (isIgnoredPath) {
      return NextResponse.next();
    }

    const isProtectedRoute = protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtectedRoute) {
      const isAuthenticated = await convexAuth.isAuthenticated();

      if (!isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/login");
      }
    }

    if (pathname === "/login" || pathname === "/signup") {
      const isAuthenticated = await convexAuth.isAuthenticated();

      if (isAuthenticated) {
        return nextjsMiddlewareRedirect(request, "/my-account");
      }
    }

    return NextResponse.next();
  }
);

// Matcher config remains the same
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
