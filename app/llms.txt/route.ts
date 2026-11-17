import { cacheLife, cacheTag } from "next/cache";
import { buildLlmsTxt } from "@/lib/llmsTxt";
import { getRevnuPosts, REVNU_CACHE_TAG } from "@/lib/revnu";
import { sanityFetch } from "@/sanity/lib/client";
import { POSTS_SITEMAP_QUERY } from "@/sanity/lib/queries";
import type { BlogPostSitemapEntry } from "@/sanity/types";

const getLlmsTxt = async () => {
  "use cache";
  cacheLife("minutes");
  cacheTag("post");
  cacheTag(REVNU_CACHE_TAG);

  const [sanityPosts, revnuPosts] = await Promise.all([
    sanityFetch<BlogPostSitemapEntry[]>(POSTS_SITEMAP_QUERY, {
      tags: ["post"],
    }).catch(() => []),
    getRevnuPosts().catch(() => []),
  ]);
  return buildLlmsTxt({ sanityPosts, revnuPosts });
};

export async function GET() {
  return new Response(await getLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
