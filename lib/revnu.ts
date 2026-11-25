import type { Metadata, MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

const revnuApiBase = "https://revnu.com/api/content/v1";
const listPageLimit = 200;
const rootRelativeHrefPattern = /href="(\/[^"/][^"#?]*)([^"]*)"/g;
const hovnAnchorPattern =
  /<a\s[^>]*href="https?:\/\/(?:[a-z0-9-]+\.)*hovn\.app[^"]*"[^>]*>/gi;
const hovnHrefPattern = /href="[^"]*"/i;
const externalLinkAttributePattern = /\s(?:target|rel)="[^"]*"/gi;

export const REVNU_CACHE_TAG = "revnu";

export type RevnuPostSummary = {
  slug: string;
  title: string;
  canonicalPath: string;
  canonicalUrl: string;
  metaDescription: string;
  heroImageUrl: string | null;
  publishedAt: number;
  updatedAt: number | null;
};

type RevnuListResponse = {
  posts: RevnuPostSummary[];
  cursor: string | null;
};

type RevnuImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type RevnuPostResponse = {
  redirected: boolean;
  post: RevnuPostSummary & {
    authorName: string;
    body: { html: string; markdown: string };
  };
  headMeta: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    openGraph: {
      title?: string;
      description?: string;
      url: string;
      siteName?: string;
      locale?: string;
      publishedTime?: string;
      modifiedTime?: string;
      authors?: string[];
      image?: RevnuImage;
    };
    twitter: {
      card: "summary" | "summary_large_image";
      title?: string;
      description?: string;
      image?: RevnuImage;
    };
  };
  jsonLd: Record<string, unknown>[];
};

export type RevnuPostResolution =
  | { kind: "post"; data: RevnuPostResponse; postPaths: string[] }
  | { kind: "redirect"; canonicalPath: string };

const getAuthHeaders = () => {
  const apiKey = process.env.REVNU_CONTENT_API_KEY;
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : null;
};

const fetchRevnu = (path: string, headers: Record<string, string>) =>
  fetch(`${revnuApiBase}${path}`, { headers });

const fetchRevnuPostPages = async (
  headers: Record<string, string>,
  cursor: string | null
): Promise<RevnuPostSummary[]> => {
  const query = new URLSearchParams({ limit: String(listPageLimit) });
  if (cursor) {
    query.set("cursor", cursor);
  }
  const response = await fetchRevnu(`/posts?${query}`, headers);
  if (!response.ok) {
    throw new Error(`Revnu post list request failed: ${response.status}`);
  }
  const { posts, cursor: nextCursor } =
    (await response.json()) as RevnuListResponse;
  return nextCursor
    ? [...posts, ...(await fetchRevnuPostPages(headers, nextCursor))]
    : posts;
};

export const fetchAllRevnuPosts = async (): Promise<RevnuPostSummary[]> => {
  const headers = getAuthHeaders();
  return headers ? await fetchRevnuPostPages(headers, null) : [];
};

export const fetchRevnuPost = async (
  slug: string
): Promise<RevnuPostResponse | null> => {
  const headers = getAuthHeaders();
  if (!headers) {
    return null;
  }

  const response = await fetchRevnu(
    `/posts/${encodeURIComponent(slug)}`,
    headers
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Revnu post request failed: ${response.status}`);
  }
  return (await response.json()) as RevnuPostResponse;
};

export async function getRevnuPosts() {
  "use cache";
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  return await fetchAllRevnuPosts();
}

async function getRevnuPost(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  return await fetchRevnuPost(slug);
}

// The unfiltered list is Revnu's source of truth: a post missing from it was
// removed, even if the single-post endpoint still answers for its slug.
export const resolveRevnuPost = async (
  canonicalPath: string
): Promise<RevnuPostResolution | null> => {
  const posts = await getRevnuPosts();
  const listedPaths = new Set(posts.map((post) => post.canonicalPath));
  const listed = posts.find((post) => post.canonicalPath === canonicalPath);
  const slug = listed?.slug ?? canonicalPath.split("/").at(-1);
  if (!slug) {
    return null;
  }

  const data = await getRevnuPost(slug);
  if (!(data && listedPaths.has(data.post.canonicalPath))) {
    return null;
  }
  if (data.post.canonicalPath !== canonicalPath) {
    return { kind: "redirect", canonicalPath: data.post.canonicalPath };
  }
  return { kind: "post", data, postPaths: [...listedPaths] };
};

export const getRevnuPostHref = (canonicalPath: string) =>
  `/blog${canonicalPath}`;

export const rewriteRevnuBodyLinks = (html: string, postPaths: string[]) => {
  const knownPaths = new Set(postPaths);
  return html
    .replace(rootRelativeHrefPattern, (match, path: string, suffix: string) =>
      knownPaths.has(path) ? `href="${getRevnuPostHref(path)}${suffix}"` : match
    )
    .replace(hovnAnchorPattern, (anchor) =>
      anchor
        .replace(hovnHrefPattern, 'href="/classes"')
        .replace(externalLinkAttributePattern, "")
    );
};

export const buildRevnuSitemap = (
  posts: RevnuPostSummary[]
): MetadataRoute.Sitemap =>
  posts.map((post) => ({
    url: post.canonicalUrl,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
  }));

const toImages = (image: RevnuImage | undefined) => (image ? [image] : []);

export const buildRevnuPostMetadata = ({
  headMeta,
}: RevnuPostResponse): Metadata => ({
  title: headMeta.title,
  description: headMeta.description,
  robots: headMeta.robots,
  alternates: { canonical: headMeta.canonical },
  openGraph: {
    type: "article",
    url: headMeta.openGraph.url,
    title: headMeta.openGraph.title,
    description: headMeta.openGraph.description,
    siteName: headMeta.openGraph.siteName,
    locale: headMeta.openGraph.locale,
    publishedTime: headMeta.openGraph.publishedTime,
    modifiedTime: headMeta.openGraph.modifiedTime,
    authors: headMeta.openGraph.authors,
    images: toImages(headMeta.openGraph.image),
  },
  twitter: {
    card: headMeta.twitter.card,
    title: headMeta.twitter.title,
    description: headMeta.twitter.description,
    images: toImages(headMeta.twitter.image),
  },
});
