import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { sanityFetch } from "@/sanity/lib/client";
import { POSTS_QUERY } from "@/sanity/lib/queries";
import type { BlogPostSummary } from "@/sanity/types";

const XML_ESCAPE_REGEX = /[<>&'"]/g;
const xmlReplacements: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
};

const escapeXml = (value: string) =>
  value.replace(XML_ESCAPE_REGEX, (character) => xmlReplacements[character]);

export async function GET() {
  const posts = await sanityFetch<BlogPostSummary[]>(POSTS_QUERY, {
    tags: ["post"],
  }).catch(() => []);

  const items = posts
    .map((post) => {
      const postUrl = absoluteUrl(`/blog/${post.slug}`);

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${postUrl}</link>
          <guid>${postUrl}</guid>
          <description>${escapeXml(post.excerpt)}</description>
          <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
        </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>${SITE_NAME} Blog</title>
        <link>${SITE_URL}/blog</link>
        <description>CPR, BLS, first aid, AED, lifeguarding, and workplace safety articles from Taylored Instruction.</description>
        <language>en-US</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        ${items}
      </channel>
    </rss>`;

  return new Response(rss, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
