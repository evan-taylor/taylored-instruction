import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/private/"],
    },
    host: "https://tayloredinstruction.com",
    sitemap: "https://tayloredinstruction.com/sitemap.xml",
  };
}
