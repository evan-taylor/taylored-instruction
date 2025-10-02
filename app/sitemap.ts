import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";

// TODO: Replace with your actual domain
const baseUrl = "https://tayloredinstruction.com";

// Directories/segments to exclude from the sitemap
const excludedSegments = [
  "api", // Exclude API routes
  "(auth)", // Example: Exclude routes in an auth group
  "opengraph-image", // Exclude opengraph image generation files
  "twitter-image", // Exclude twitter image generation files
  "icon", // Exclude icon generation files
  "apple-icon", // Exclude apple-icon generation files
  "sitemap", // Exclude the sitemap itself
  "robots", // Exclude robots.txt generation
];

// Function to recursively find page files
function getPagePaths(dir: string, baseDir: string = dir): string[] {
  let paths: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    // Skip excluded segments
    if (excludedSegments.some((segment) => relativePath.includes(segment))) {
      continue;
    }

    if (entry.isDirectory()) {
      // Exclude directories that are route groups like (dashboard) or (marketing)
      // or internal Next.js folders like __DEFAULT__
      if (!(entry.name.startsWith("(") || entry.name.startsWith("_"))) {
        paths = paths.concat(getPagePaths(fullPath, baseDir));
      } else if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
        // Include pages within route groups, but don't include the group itself in the path
        paths = paths.concat(getPagePaths(fullPath, baseDir));
      }
    } else if (
      entry.isFile() &&
      (entry.name.startsWith("page.tsx") ||
        entry.name.startsWith("page.jsx") ||
        entry.name.startsWith("page.ts") ||
        entry.name.startsWith("page.js"))
    ) {
      // Construct the URL path from the file path
      let routePath = path.dirname(relativePath).replace(/\\\\/g, "/"); // Normalize windows paths

      // Remove (group) segments from the path
      routePath = routePath
        .split("/")
        .filter(
          (segment) => !(segment.startsWith("(") && segment.endsWith(")"))
        )
        .join("/");

      if (routePath === "." || routePath === "") {
        routePath = "/";
      } else if (!routePath.startsWith("/")) {
        routePath = `/${routePath}`;
      }

      // Avoid duplicate root path if already added
      if (routePath === "/" && paths.includes("/")) {
        continue;
      }
      paths.push(routePath);
    }
  }
  return paths;
}

// Route-specific configuration for priority and change frequency
const routeConfig: Record<
  string,
  {
    priority: number;
    changeFrequency:
      | "always"
      | "hourly"
      | "daily"
      | "weekly"
      | "monthly"
      | "yearly"
      | "never";
  }
> = {
  "/": { priority: 1.0, changeFrequency: "weekly" },
  "/about": { priority: 0.9, changeFrequency: "monthly" },
  "/contact": { priority: 0.9, changeFrequency: "monthly" },
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
  "/instructor-resources": { priority: 0.7, changeFrequency: "monthly" },
  "/ecards": { priority: 0.75, changeFrequency: "monthly" },
  "/privacy-policy": { priority: 0.3, changeFrequency: "yearly" },
  "/terms": { priority: 0.3, changeFrequency: "yearly" },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const appDirPath = path.join(process.cwd(), "app");
  const pageRoutes = getPagePaths(appDirPath);

  const sitemapEntries: MetadataRoute.Sitemap = pageRoutes.map((route) => {
    const config = routeConfig[route] || {
      priority: 0.7,
      changeFrequency: "monthly" as const,
    };

    return {
      url: `${baseUrl}${route === "/" ? "" : route}`,
      lastModified: new Date(),
      changeFrequency: config.changeFrequency,
      priority: config.priority,
    };
  });

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
  const uniqueEntries = Array.from(
    new Set(sitemapEntries.map((e) => e.url))
  ).map((url) => {
    return sitemapEntries.find((e) => e.url === url)!;
  });

  return uniqueEntries;
}
