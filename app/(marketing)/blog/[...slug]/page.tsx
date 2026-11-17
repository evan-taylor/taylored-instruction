"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import {
  getRevnuPostMetadata,
  renderRevnuPost,
} from "@/components/blog/revnuPostRoute";
import { getRevnuPosts, REVNU_CACHE_TAG } from "@/lib/revnu";
import { buildPageMetadata } from "@/lib/seo";

type BlogPostPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

const emptyBlogStaticParamsSlug = "__empty-blog-static-param__";

const toCanonicalPath = (slug: string[]) => `/${slug.join("/")}`;

export async function generateStaticParams() {
  const posts = await getRevnuPosts().catch(() => []);

  if (posts.length === 0) {
    return [{ slug: [emptyBlogStaticParamsSlug] }];
  }

  return posts.map((post) => ({
    slug: post.canonicalPath.slice(1).split("/"),
  }));
}

export async function generateMetadata(
  props: BlogPostPageProps
): Promise<Metadata> {
  const { slug } = await props.params;
  const canonicalPath = toCanonicalPath(slug);
  const metadata = slug.includes(emptyBlogStaticParamsSlug)
    ? null
    : await getRevnuPostMetadata(canonicalPath);

  return (
    metadata ??
    buildPageMetadata({
      title: "Blog Post Not Found",
      description:
        "The requested blog post could not be found on Taylored Instruction.",
      noIndex: true,
      path: `/blog${canonicalPath}`,
    })
  );
}

export default async function BlogPostPage(props: BlogPostPageProps) {
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  const { slug } = await props.params;
  if (slug.includes(emptyBlogStaticParamsSlug)) {
    notFound();
  }

  return await renderRevnuPost(toCanonicalPath(slug));
}
