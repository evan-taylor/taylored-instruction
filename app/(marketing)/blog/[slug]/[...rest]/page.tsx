"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import {
  getRevnuPostMetadata,
  renderRevnuPost,
} from "@/components/blog/revnuPostRoute";
import { REVNU_CACHE_TAG } from "@/lib/revnu";

type NestedBlogPostPageProps = {
  params: Promise<{
    slug: string;
    rest: string[];
  }>;
};

const placeholderSegment = "__revnu-nested-static-param__";

const toCanonicalPath = ({ slug, rest }: { slug: string; rest: string[] }) =>
  `/${[slug, ...rest].join("/")}`;

export async function generateStaticParams() {
  return [{ rest: [placeholderSegment] }];
}

export async function generateMetadata(
  props: NestedBlogPostPageProps
): Promise<Metadata> {
  const params = await props.params;
  if (params.rest.includes(placeholderSegment)) {
    return {};
  }
  return (await getRevnuPostMetadata(toCanonicalPath(params))) ?? {};
}

export default async function NestedBlogPostPage(
  props: NestedBlogPostPageProps
) {
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  const params = await props.params;
  if (params.rest.includes(placeholderSegment)) {
    notFound();
  }

  return await renderRevnuPost(toCanonicalPath(params));
}
