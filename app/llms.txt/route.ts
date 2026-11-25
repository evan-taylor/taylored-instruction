import { fetchQuery } from "convex/nextjs";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/convex/_generated/api";
import { buildLlmsTxt } from "@/lib/llmsTxt";
import { getRevnuPosts, REVNU_CACHE_TAG } from "@/lib/revnu";

const getCourses = async () => {
  try {
    const catalog = await fetchQuery(api.registration.publicCatalog, {});
    return catalog.courses;
  } catch {
    return [];
  }
};

const getLlmsTxt = async () => {
  "use cache";
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  const [revnuPosts, courses] = await Promise.all([
    getRevnuPosts(),
    getCourses(),
  ]);
  return buildLlmsTxt(revnuPosts, courses);
};

export async function GET() {
  return new Response(await getLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
