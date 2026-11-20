import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og"],
      disallow: ["/api/", "/admin/", "/private/"],
    },
    host: "https://tayloredinstruction.com",
    sitemap: [
      "https://tayloredinstruction.com/sitemap.xml",
      "https://tayloredinstruction.com/blog/sitemap.xml",
    ],
  };
}
