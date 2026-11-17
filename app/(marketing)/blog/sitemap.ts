import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { buildRevnuSitemap, getRevnuPosts, REVNU_CACHE_TAG } from "@/lib/revnu";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  const posts = await getRevnuPosts().catch(() => []);
  return buildRevnuSitemap(posts);
}
