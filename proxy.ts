import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isLoginPage = createRouteMatcher(["/login"]);
const isDebugRoute = createRouteMatcher(["/debug-auth"]);
const isProtectedRoute = createRouteMatcher([
  "/my-account(.*)",
  "/ecards(.*)",
  "/admin(.*)",
  "/onboarding(.*)",
]);
const queryParamsToStrip = ["amp", "__a"] as const;

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const url = new URL(request.url);

  if (url.searchParams.has("code")) {
    return;
  }

  const isLegacyInstructorTaxonomyRequest =
    url.searchParams.get("taxonomy") === "nav_menu" &&
    url.searchParams.get("term") === "instructors";
  if (isLegacyInstructorTaxonomyRequest) {
    const redirectUrl = new URL("/aha-instructor-training", request.url);
    for (const [key, value] of url.searchParams) {
      if (key !== "taxonomy" && key !== "term") {
        redirectUrl.searchParams.append(key, value);
      }
    }
    return NextResponse.redirect(redirectUrl, 308);
  }

  const cleanedUrl = new URL(url.toString());
  let removedLegacyQueryParam = false;
  for (const key of queryParamsToStrip) {
    if (cleanedUrl.searchParams.has(key)) {
      cleanedUrl.searchParams.delete(key);
      removedLegacyQueryParam = true;
    }
  }
  if (removedLegacyQueryParam) {
    return NextResponse.redirect(cleanedUrl, 308);
  }

  if (isDebugRoute(request)) {
    return;
  }

  if (isLoginPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/my-account");
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
