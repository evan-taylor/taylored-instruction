import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/my-account/",
          "/auth/",
          "/login/",
          "/_next/",
          "/private/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/my-account/",
          "/auth/",
          "/login/",
        ],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/my-account/",
          "/auth/",
          "/login/",
        ],
      },
    ],
    sitemap: "https://tayloredinstruction.com/sitemap.xml",
  };
}
