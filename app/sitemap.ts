import fs from "node:fs";
import path from "node:path";
import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { getFallbackSeoPages } from "@/lib/seoFallbackContent";

// TODO: Replace with your actual domain
const baseUrl = "https://tayloredinstruction.com";

// Directories/segments to exclude from the sitemap
const excludedSegments = [
  "api", // Exclude API routes
  "(app)", // Exclude authenticated application routes
  "(auth)", // Example: Exclude routes in an auth group
  "opengraph-image", // Exclude opengraph image generation files
  "twitter-image", // Exclude twitter image generation files
  "icon", // Exclude icon generation files
  "apple-icon", // Exclude apple-icon generation files
  "sitemap", // Exclude the sitemap itself
  "robots", // Exclude robots.txt generation
];

const pageFilePrefixes = [
  "page.tsx",
  "page.jsx",
  "page.ts",
  "page.js",
] as const;

const shouldSkipRelativePath = (relativePath: string): boolean =>
  excludedSegments.some((segment) => relativePath.includes(segment));

const isRouteGroupSegment = (segment: string): boolean =>
  segment.startsWith("(") && segment.endsWith(")");

const isDynamicSegment = (segment: string): boolean =>
  segment.startsWith("[") && segment.endsWith("]");

const isPageFile = (fileName: string): boolean =>
  pageFilePrefixes.some((prefix) => fileName.startsWith(prefix));

const normalizeRoutePath = (relativePath: string): string => {
  const directory = path.dirname(relativePath).replace(/\\\\/g, "/");

  const cleanedSegments = directory
    .split("/")
    .filter(
      (segment) =>
        segment !== "." && segment !== "" && !isRouteGroupSegment(segment)
    );

  if (cleanedSegments.length === 0) {
    return "/";
  }

  if (cleanedSegments.some(isDynamicSegment)) {
    return "";
  }

  return `/${cleanedSegments.join("/")}`;
};

const gatherPageRoutes = (dir: string, baseDir: string): string[] => {
  const routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (shouldSkipRelativePath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (entry.name.startsWith("_")) {
        continue;
      }

      routes.push(...gatherPageRoutes(fullPath, baseDir));
      continue;
    }

    if (entry.isFile() && isPageFile(entry.name)) {
      const normalized = normalizeRoutePath(relativePath);
      if (normalized) {
        routes.push(normalized);
      }
    }
  }

  return routes;
};

// Function to recursively find page files
const getPagePaths = (dir: string, baseDir: string = dir): string[] =>
  gatherPageRoutes(dir, baseDir);

// Route-specific configuration for priority and change frequency
type RouteConfig = {
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
};

const routeConfig: Record<string, RouteConfig> = {
  "/": { priority: 1.0, changeFrequency: "weekly" },
  "/about": { priority: 0.9, changeFrequency: "monthly" },
  "/contact": { priority: 0.9, changeFrequency: "monthly" },
  "/resources": { priority: 0.95, changeFrequency: "weekly" },
  "/bls": { priority: 0.95, changeFrequency: "weekly" },
  "/basic-life-support": { priority: 0.95, changeFrequency: "weekly" },
  "/first-aid-cpr-aed": { priority: 0.95, changeFrequency: "weekly" },
  "/heartsaver": { priority: 0.95, changeFrequency: "weekly" },
  "/lifeguarding": { priority: 0.95, changeFrequency: "weekly" },
  "/corporate-training": { priority: 0.9, changeFrequency: "weekly" },
  "/aeds": { priority: 0.85, changeFrequency: "monthly" },
  "/aha-instructor-training": { priority: 0.85, changeFrequency: "monthly" },
  "/fa-cpr-aed-instructor": { priority: 0.8, changeFrequency: "monthly" },
  "/lifeguarding-instructor": { priority: 0.8, changeFrequency: "monthly" },
  "/lifeguarding-instructor-trainer": {
    priority: 0.75,
    changeFrequency: "monthly",
  },
  "/alignment": { priority: 0.8, changeFrequency: "monthly" },
  "/privacy-policy": { priority: 0.3, changeFrequency: "yearly" },
  "/terms": { priority: 0.3, changeFrequency: "yearly" },
};

const getRouteConfig = (route: string): RouteConfig => {
  if (route.startsWith("/resources/")) {
    return {
      priority: 0.85,
      changeFrequency: "weekly",
    };
  }

  return (
    routeConfig[route] || {
      priority: 0.7,
      changeFrequency: "monthly",
    }
  );
};

type ResourceRouteEntry = {
  route: string;
  lastModified: Date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appDirPath = path.join(process.cwd(), "app");
  const pageRoutes = getPagePaths(appDirPath);
  const dynamicResourceRouteMap = new Map<string, ResourceRouteEntry>();
  const fallbackResources = getFallbackSeoPages();

  for (const page of fallbackResources) {
    const route = `/resources/${page.slug}`;
    dynamicResourceRouteMap.set(route, {
      route,
      lastModified: new Date(page.updatedAt),
    });
  }

  try {
    const resources = await fetchQuery(
      api.seoContent.getPublishedPageSlugs,
      {}
    );

    for (const resource of resources) {
      const route = `/resources/${resource.slug}`;
      dynamicResourceRouteMap.set(route, {
        route,
        lastModified: new Date(resource.updatedAt),
      });
    }
  } catch (_error) {
    // Keep fallback-only entries when Convex is unavailable.
  }

  const dynamicResourceRoutes = Array.from(dynamicResourceRouteMap.values());
  const resourceLastModifiedByRoute = new Map(
    dynamicResourceRoutes.map((entry) => [entry.route, entry.lastModified])
  );
  const allRoutes = [...pageRoutes, ...dynamicResourceRoutes];

  const sitemapEntries: MetadataRoute.Sitemap = allRoutes.map(
    (routeOrEntry) => {
      const route =
        typeof routeOrEntry === "string" ? routeOrEntry : routeOrEntry.route;
      const config = getRouteConfig(route);
      const lastModified = resourceLastModifiedByRoute.get(route) ?? new Date();

      return {
        url: `${baseUrl}${route === "/" ? "" : route}`,
        lastModified,
        changeFrequency: config.changeFrequency,
        priority: config.priority,
      };
    }
  );

  // Ensure the root path is included if not already
  if (!sitemapEntries.some((entry) => entry.url === baseUrl)) {
    sitemapEntries.unshift({
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    });
  }

  // Deduplicate entries just in case
  const uniqueUrls = Array.from(new Set(sitemapEntries.map((e) => e.url)));
  const uniqueEntries = uniqueUrls
    .map((url) => sitemapEntries.find((e) => e.url === url))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  return uniqueEntries;
}
