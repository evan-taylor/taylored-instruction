import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { getRevnuPosts } from "@/lib/revnu";

const baseUrl = "https://tayloredinstruction.com";
const staticRoutePaths = [
  "/",
  "/about",
  "/contact",
  "/blog",
  "/bls",
  "/basic-life-support",
  "/first-aid-cpr-aed",
  "/heartsaver",
  "/lifeguarding",
  "/corporate-training",
  "/aeds",
  "/aha-instructor-training",
  "/fa-cpr-aed-instructor",
  "/lifeguarding-instructor",
  "/water-safety-instructor",
  "/lifeguarding-instructor-trainer",
  "/alignment",
  "/privacy-policy",
  "/terms",
] as const;

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

const routeConfigByPath: Record<string, RouteConfig> = {
  "/": { priority: 1.0, changeFrequency: "weekly" },
  "/about": { priority: 0.9, changeFrequency: "monthly" },
  "/contact": { priority: 0.9, changeFrequency: "monthly" },
  "/blog": { priority: 0.9, changeFrequency: "weekly" },
  "/bls": { priority: 0.95, changeFrequency: "weekly" },
  "/basic-life-support": { priority: 0.95, changeFrequency: "weekly" },
  "/first-aid-cpr-aed": { priority: 0.95, changeFrequency: "weekly" },
  "/heartsaver": { priority: 0.95, changeFrequency: "weekly" },
  "/lifeguarding": { priority: 0.95, changeFrequency: "weekly" },
  "/corporate-training": { priority: 0.9, changeFrequency: "weekly" },
  "/aeds": { priority: 0.85, changeFrequency: "monthly" },
  "/aha-instructor-training": { priority: 0.85, changeFrequency: "monthly" },
  "/fa-cpr-aed-instructor": { priority: 0.8, changeFrequency: "monthly" },
  "/water-safety-instructor": { priority: 0.8, changeFrequency: "monthly" },
  "/lifeguarding-instructor": { priority: 0.8, changeFrequency: "monthly" },
  "/lifeguarding-instructor-trainer": {
    priority: 0.75,
    changeFrequency: "monthly",
  },
  "/alignment": { priority: 0.8, changeFrequency: "monthly" },
  "/privacy-policy": { priority: 0.3, changeFrequency: "yearly" },
  "/terms": { priority: 0.3, changeFrequency: "yearly" },
};

const getRouteConfig = (routePath: string): RouteConfig => {
  if (routePath === "/classes") {
    return { priority: 0.95, changeFrequency: "daily" };
  }
  if (routePath.startsWith("/s/")) {
    return { priority: 0.8, changeFrequency: "daily" };
  }
  if (routePath.startsWith("/courses/")) {
    return { priority: 0.85, changeFrequency: "weekly" };
  }
  if (routePath.startsWith("/blog/")) {
    return {
      priority: 0.8,
      changeFrequency: "weekly",
    };
  }

  return (
    routeConfigByPath[routePath] || {
      priority: 0.7,
      changeFrequency: "monthly",
    }
  );
};

const pageLastModified: Record<string, string> = JSON.parse(
  process.env.PAGE_LAST_MODIFIED ?? "{}"
);

const latestDate = (dates: Date[]) =>
  dates.length > 0
    ? new Date(Math.max(...dates.map((date) => date.getTime())))
    : undefined;

const buildEntry = ({
  path,
  lastModified,
}: {
  path: string;
  lastModified?: Date;
}): MetadataRoute.Sitemap[number] => {
  const config = getRouteConfig(path);

  return {
    url: `${baseUrl}${path === "/" ? "" : path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: config.changeFrequency,
    priority: config.priority,
  };
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const registrationRoutes: string[] = ["/classes", "/group-training"];
  try {
    const catalog = await fetchQuery(api.registration.publicCatalog, {});
    for (const course of catalog.courses) {
      registrationRoutes.push(`/courses/${course.slug}`);
    }
    for (const session of catalog.sessions) {
      registrationRoutes.push(`/s/${session.code}`);
    }
  } catch {
    // Still return the static routes when Convex is unavailable.
  }

  const revnuPosts = await getRevnuPosts();
  const listingLastModified: Record<string, Date | undefined> = {
    "/blog": latestDate(
      revnuPosts.map((post) => new Date(post.updatedAt ?? post.publishedAt))
    ),
  };
  const staticLastModified = (path: string) => {
    if (path in listingLastModified) {
      return listingLastModified[path];
    }
    const committedAt = pageLastModified[path];
    return committedAt ? new Date(committedAt) : undefined;
  };

  const entries = [
    ...staticRoutePaths.map((path) =>
      buildEntry({ path, lastModified: staticLastModified(path) })
    ),
    ...registrationRoutes.map((path) => buildEntry({ path })),
  ];

  const uniqueByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) {
    uniqueByUrl.set(entry.url, entry);
  }

  return Array.from(uniqueByUrl.values());
}
