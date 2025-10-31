import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: (() => {
        const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.SITE_URL;
        if (!siteUrl) {
          throw new Error("CONVEX_SITE_URL or SITE_URL must be set");
        }
        return siteUrl;
      })(),
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
