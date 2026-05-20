import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { sanityFetch } from "@/sanity/lib/client";
import { POSTS_SITEMAP_QUERY } from "@/sanity/lib/queries";
import type { BlogPostSitemapEntry } from "@/sanity/types";

const baseUrl = "https://tayloredinstruction.com";
const staticRoutePaths = [
  "/",
  "/about",
  "/contact",
  "/blog",
  "/resources",
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

const getRouteConfig = (routePath: string): RouteConfig => {
  if (routePath.startsWith("/resources/")) {
    return {
      priority: 0.85,
      changeFrequency: "weekly",
    };
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

type ResourceRouteEntry = {
  path: string;
  lastModified: Date;
};

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
  const dynamicResourceRouteMap = new Map<string, ResourceRouteEntry>();
  const dynamicBlogRouteMap = new Map<string, ResourceRouteEntry>();

  try {
    const resources = await fetchQuery(
      api.seoContent.getPublishedPageSlugs,
      {}
    );

    for (const resource of resources) {
      const path = `/resources/${resource.slug}`;
      dynamicResourceRouteMap.set(path, {
        path,
        lastModified: new Date(resource.updatedAt),
      });
    }
  } catch (_error) {
    // If Convex is unavailable, still return a valid sitemap for static routes.
  }

  try {
    const posts = await sanityFetch<BlogPostSitemapEntry[]>(
      POSTS_SITEMAP_QUERY,
      {
        tags: ["post"],
      }
    );

    for (const post of posts) {
      const path = `/blog/${post.slug}`;
      dynamicBlogRouteMap.set(path, {
        path,
        lastModified: new Date(post._updatedAt ?? post.publishedAt),
      });
    }
  } catch (_error) {
    // If Sanity is unavailable, still return a valid sitemap.
  }

  const entries = [
    ...staticRoutePaths.map((path) => buildEntry({ path })),
    ...Array.from(dynamicResourceRouteMap.values()).map((resourceRoute) =>
      buildEntry({
        path: resourceRoute.path,
        lastModified: resourceRoute.lastModified,
      })
    ),
    ...Array.from(dynamicBlogRouteMap.values()).map((blogRoute) =>
      buildEntry({
        path: blogRoute.path,
        lastModified: blogRoute.lastModified,
      })
    ),
  ];

  const uniqueByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) {
    uniqueByUrl.set(entry.url, entry);
  }

  return Array.from(uniqueByUrl.values());
}
