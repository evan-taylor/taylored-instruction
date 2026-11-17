import {
  getRevnuPostHref,
  type RevnuPostSummary,
  resolveRevnuPost,
} from "@/lib/revnu";
import { sanityFetch } from "@/sanity/lib/client";
import { POST_SLUGS_QUERY } from "@/sanity/lib/queries";
import type { BlogImage, BlogPostSlug, BlogPostSummary } from "@/sanity/types";

export type BlogListing = {
  key: string;
  href: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  sanityImage?: BlogImage;
  imageUrl?: string;
};

export const getSanityBlogPaths = async () => {
  const posts = await sanityFetch<BlogPostSlug[]>(POST_SLUGS_QUERY, {
    tags: ["post"],
  });
  return new Set(posts.map((post) => `/${post.slug}`));
};

// Sanity copies keep their paths until Revnu verifies them, so a Revnu post is
// only served where Sanity has nothing. A Sanity outage must surface as an
// error rather than letting a Revnu copy take over a Sanity path.
export const resolveRevnuFallback = async (canonicalPath: string) => {
  const sanityPaths = await getSanityBlogPaths();
  if (sanityPaths.has(canonicalPath)) {
    throw new Error(`Sanity blog post lookup failed for ${canonicalPath}`);
  }
  return resolveRevnuPost(canonicalPath);
};

export const mergeBlogListings = ({
  sanityPosts,
  sanityPaths,
  revnuPosts,
  limit,
}: {
  sanityPosts: BlogPostSummary[];
  sanityPaths: Set<string> | null;
  revnuPosts: RevnuPostSummary[];
  limit: number;
}): BlogListing[] => {
  const sanityListings = sanityPosts.map((post) => ({
    key: post._id,
    href: `/blog/${post.slug}`,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post._updatedAt,
    sanityImage: post.mainImage,
  }));
  const revnuListings = sanityPaths
    ? revnuPosts
        .filter((post) => !sanityPaths.has(post.canonicalPath))
        .map((post) => ({
          key: `revnu:${post.canonicalPath}`,
          href: getRevnuPostHref(post.canonicalPath),
          title: post.title,
          excerpt: post.metaDescription,
          publishedAt: new Date(post.publishedAt).toISOString(),
          updatedAt: new Date(post.updatedAt ?? post.publishedAt).toISOString(),
          imageUrl: post.heroImageUrl ?? undefined,
        }))
    : [];

  return [...sanityListings, ...revnuListings]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
};
