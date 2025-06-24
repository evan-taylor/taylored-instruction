import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // updateSession handles session refresh and returns both the response and user
  const { response: supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Add paths that should be explicitly protected if not covered by the default deny
  const protectedRoutes = ["/my-account", "/ecards"];

  const ignoredPaths = ["/api/webhook"]; // Paths to completely ignore by this auth logic

  const isIgnoredPath = ignoredPaths.some((path) => pathname.startsWith(path));
  if (isIgnoredPath) {
    return supabaseResponse;
  }

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // If the user is not authenticated
  if (!user) {
    // And the route is protected, redirect to login
    if (isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // If the user is authenticated
    // And they are trying to access login or signup, redirect to my-account
    if (pathname === "/login" || pathname === "/signup") {
      return NextResponse.redirect(new URL("/my-account", request.url));
    }
  }

  // If no redirects occurred, return the response from updateSession
  return supabaseResponse;
}

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
