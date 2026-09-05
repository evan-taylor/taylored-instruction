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
interface RouteConfig {
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}

const routeConfigByPath: Record<string, RouteConfig> = {
  "/": { changeFrequency: "weekly", priority: 1.0 },
  "/about": { changeFrequency: "monthly", priority: 0.9 },
  "/aeds": { changeFrequency: "monthly", priority: 0.85 },
  "/aha-instructor-training": { changeFrequency: "monthly", priority: 0.85 },
  "/alignment": { changeFrequency: "monthly", priority: 0.8 },
  "/basic-life-support": { changeFrequency: "weekly", priority: 0.95 },
  "/blog": { changeFrequency: "weekly", priority: 0.9 },
  "/bls": { changeFrequency: "weekly", priority: 0.95 },
  "/contact": { changeFrequency: "monthly", priority: 0.9 },
  "/corporate-training": { changeFrequency: "weekly", priority: 0.9 },
  "/fa-cpr-aed-instructor": { changeFrequency: "monthly", priority: 0.8 },
  "/first-aid-cpr-aed": { changeFrequency: "weekly", priority: 0.95 },
  "/heartsaver": { changeFrequency: "weekly", priority: 0.95 },
  "/lifeguarding": { changeFrequency: "weekly", priority: 0.95 },
  "/lifeguarding-instructor": { changeFrequency: "monthly", priority: 0.8 },
  "/lifeguarding-instructor-trainer": {
    changeFrequency: "monthly",
    priority: 0.75,
  },
  "/privacy-policy": { changeFrequency: "yearly", priority: 0.3 },
  "/resources": { changeFrequency: "weekly", priority: 0.95 },
  "/terms": { changeFrequency: "yearly", priority: 0.3 },
};

const getRouteConfig = (routePath: string): RouteConfig => {
  if (routePath.startsWith("/resources/")) {
    return {
      changeFrequency: "weekly",
      priority: 0.85,
    };
  }

  if (routePath.startsWith("/blog/")) {
    return {
      changeFrequency: "weekly",
      priority: 0.8,
    };
  }

  return (
    routeConfigByPath[routePath] || {
      changeFrequency: "monthly",
      priority: 0.7,
    }
  );
};

interface ResourceRouteEntry {
  lastModified: Date;
  path: string;
}

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
        lastModified: new Date(resource.updatedAt),
        path,
      });
    }
  } catch {
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
        lastModified: new Date(post._updatedAt ?? post.publishedAt),
        path,
      });
    }
  } catch {
    // If Sanity is unavailable, still return a valid sitemap.
  }

  const entries = [
    ...staticRoutePaths.map((path) => buildEntry({ path })),
    ...Array.from(dynamicResourceRouteMap.values()).map((resourceRoute) =>
      buildEntry({
        lastModified: resourceRoute.lastModified,
        path: resourceRoute.path,
      })
    ),
    ...Array.from(dynamicBlogRouteMap.values()).map((blogRoute) =>
      buildEntry({
        lastModified: blogRoute.lastModified,
        path: blogRoute.path,
      })
    ),
  ];

  const uniqueByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) {
    uniqueByUrl.set(entry.url, entry);
  }

  return Array.from(uniqueByUrl.values());
}
