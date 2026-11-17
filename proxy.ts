import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import { getBlogPathStatus } from "@/lib/blogPathIndex";
import { AUTH_SESSION_SECONDS } from "@/shared/authSession";

const isLoginPage = createRouteMatcher(["/login"]);
const isDebugRoute = createRouteMatcher(["/debug-auth"]);
const isProtectedRoute = createRouteMatcher([
  "/my-account(.*)",
  "/instructor/sessions(.*)",
  "/ecards(.*)",
  "/admin(.*)",
  "/onboarding(.*)",
]);
const queryParamsToStrip = ["amp", "__a"] as const;
const permanentRedirectStatus = 308;
const redirectEligibleMethods = new Set(["GET", "HEAD"]);
const blogPostPathPattern = /^\/blog(\/.+?)\/?$/;
const blogNotFoundHeader = "x-blog-not-found";

const getLegacyInstructorRedirectUrl = (
  url: URL,
  requestUrl: string
): URL | null => {
  const isLegacyInstructorTaxonomyRequest =
    url.pathname === "/" &&
    url.searchParams.get("taxonomy") === "nav_menu" &&
    url.searchParams.get("term") === "instructors";

  if (!isLegacyInstructorTaxonomyRequest) {
    return null;
  }

  const redirectUrl = new URL("/aha-instructor-training", requestUrl);
  for (const [key, value] of Array.from(url.searchParams.entries())) {
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

const getBlogPostPath = (pathname: string) => {
  const match = blogPostPathPattern.exec(pathname);
  if (!match?.[1] || match[1] === "/sitemap.xml") {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

// The marketing layout streams, so a page's notFound() arrives after a 200
// status. Render the not-found page once more and send it with a real 404.
const renderBlogNotFound = async (url: URL, method: string) => {
  if (method === "HEAD") {
    return new NextResponse(null, { status: 404 });
  }
  const page = await fetch(url, {
    cache: "no-store",
    headers: { [blogNotFoundHeader]: "1" },
  });
  return new NextResponse(page.body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const url = new URL(request.url);

    if (url.searchParams.has("code")) {
      return;
    }

    if (redirectEligibleMethods.has(request.method)) {
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
        return NextResponse.redirect(
          cleanedQueryRedirectUrl,
          permanentRedirectStatus
        );
      }

      const blogPostPath = getBlogPostPath(url.pathname);
      if (
        blogPostPath &&
        !request.headers.has(blogNotFoundHeader) &&
        (await getBlogPathStatus(blogPostPath)) === "missing"
      ) {
        return await renderBlogNotFound(url, request.method);
      }
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
  },
  { cookieConfig: { maxAge: AUTH_SESSION_SECONDS } }
);

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
    "/blog/((?!sitemap\\.xml$).*)",
  ],
};
