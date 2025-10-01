import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/my-account/",
          "/*?*", // Disallow URLs with query parameters to avoid duplicate content
        ],
        crawlDelay: 1,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/my-account/",
        ],
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
        disallow: ["/admin/", "/my-account/"],
      },
    ],
    sitemap: [
      "https://tayloredinstruction.com/sitemap.xml",
    ],
    host: "https://tayloredinstruction.com",
  };
}
