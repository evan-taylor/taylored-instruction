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
const permanentRedirectStatus = 308;

const getLegacyInstructorRedirectUrl = (
  url: URL,
  requestUrl: string
): URL | null => {
  const isLegacyInstructorTaxonomyRequest =
    url.searchParams.get("taxonomy") === "nav_menu" &&
    url.searchParams.get("term") === "instructors";

  if (!isLegacyInstructorTaxonomyRequest) {
    return null;
  }

  const redirectUrl = new URL("/aha-instructor-training", requestUrl);
  for (const [key, value] of url.searchParams) {
    if (key !== "taxonomy" && key !== "term") {
      redirectUrl.searchParams.append(key, value);
    }
  }
  return redirectUrl;
};

const getCleanedQueryRedirectUrl = (url: URL): URL | null => {
  const cleanedUrl = new URL(url.toString());
  let removedLegacyQueryParam = false;

  for (const key of queryParamsToStrip) {
    if (cleanedUrl.searchParams.has(key)) {
      cleanedUrl.searchParams.delete(key);
      removedLegacyQueryParam = true;
    }
  }

  return removedLegacyQueryParam ? cleanedUrl : null;
};

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const url = new URL(request.url);

  if (url.searchParams.has("code")) {
    return;
  }

  const legacyInstructorRedirectUrl = getLegacyInstructorRedirectUrl(
    url,
    request.url
  );
  if (legacyInstructorRedirectUrl) {
    return NextResponse.redirect(
      legacyInstructorRedirectUrl,
      permanentRedirectStatus
    );
  }

  const cleanedQueryRedirectUrl = getCleanedQueryRedirectUrl(url);
  if (cleanedQueryRedirectUrl) {
    return NextResponse.redirect(cleanedQueryRedirectUrl, permanentRedirectStatus);
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
