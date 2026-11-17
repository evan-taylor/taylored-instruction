import { cacheLife, cacheTag } from "next/cache";
import { buildLlmsTxt } from "@/lib/llmsTxt";
import { getRevnuPosts, REVNU_CACHE_TAG } from "@/lib/revnu";

const getLlmsTxt = async () => {
  "use cache";
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  return buildLlmsTxt(await getRevnuPosts().catch(() => []));
};

export async function GET() {
  return new Response(await getLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
