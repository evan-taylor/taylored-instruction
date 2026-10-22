import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    host: "https://tayloredinstruction.com",
    rules: {
      allow: "/",
      disallow: ["/api/", "/admin/", "/private/"],
      userAgent: "*",
    },
    sitemap: "https://tayloredinstruction.com/sitemap.xml",
  };
}
