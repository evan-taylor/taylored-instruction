import type { Metadata, MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getBlogRedirectTarget } from "@/lib/blogRedirects";

const revnuApiBase = "https://revnu.com/api/content/v1";
const listPageLimit = 200;
const maxConcurrentRequests = 4;
const maxAttempts = 5;
const baseRetryDelayMs = 1000;
const maxBackoffDelayMs = 8000;
const maxTotalRetryWaitMs = 30_000;
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

let activeRequests = 0;
const queuedRequests: (() => void)[] = [];

const withRequestSlot = async <T>(request: () => Promise<T>) => {
  if (activeRequests < maxConcurrentRequests) {
    activeRequests += 1;
  } else {
    await new Promise<void>((resolve) => queuedRequests.push(resolve));
  }
  try {
    return await request();
  } finally {
    const next = queuedRequests.shift();
    if (next) {
      next();
    } else {
      activeRequests -= 1;
    }
  }
};

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

const getRetryAfterMs = (header: string | null) => {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const retryAt = Date.parse(header);
  return Number.isNaN(retryAt) ? null : Math.max(0, retryAt - Date.now());
};

type RevnuResult = {
  ok: boolean;
  status: number;
  retryAfter: string | null;
  data: unknown;
};

const requestRevnu = (path: string, headers: Record<string, string>) =>
  withRequestSlot(async (): Promise<RevnuResult> => {
    const response = await fetch(`${revnuApiBase}${path}`, { headers });
    const { ok, status } = response;
    if (!ok) {
      await response.body?.cancel();
      return {
        ok,
        status,
        retryAfter: response.headers.get("Retry-After"),
        data: null,
      };
    }
    return { ok, status, retryAfter: null, data: await response.json() };
  });

const getRetryDelayMs = (retryAfter: string | null, attempt: number) =>
  getRetryAfterMs(retryAfter) ??
  Math.min(
    baseRetryDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random() / 2),
    maxBackoffDelayMs
  );

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// Retries 429 and 5xx responses with backoff, honoring Retry-After. Once the
// attempts or the wait budget run out it returns the failed result, so
// callers still fail loudly instead of rendering an empty blog.
const fetchRevnu = async (
  path: string,
  headers: Record<string, string>,
  attempt = 1,
  waitedMs = 0
): Promise<RevnuResult> => {
  const result = await requestRevnu(path, headers);
  if (!isRetryableStatus(result.status) || attempt >= maxAttempts) {
    return result;
  }
  const delayMs = getRetryDelayMs(result.retryAfter, attempt);
  if (waitedMs + delayMs > maxTotalRetryWaitMs) {
    return result;
  }
  await sleep(delayMs);
  return fetchRevnu(path, headers, attempt + 1, waitedMs + delayMs);
};

const fetchRevnuPostPages = async (
  headers: Record<string, string>,
  cursor: string | null
): Promise<RevnuPostSummary[]> => {
  const query = new URLSearchParams({ limit: String(listPageLimit) });
  if (cursor) {
    query.set("cursor", cursor);
  }
  const result = await fetchRevnu(`/posts?${query}`, headers);
  if (!result.ok) {
    throw new Error(`Revnu post list request failed: ${result.status}`);
  }
  const { posts, cursor: nextCursor } = result.data as RevnuListResponse;
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

  const result = await fetchRevnu(
    `/posts/${encodeURIComponent(slug)}`,
    headers
  );
  if (result.status === 404) {
    return null;
  }
  if (!result.ok) {
    throw new Error(`Revnu post request failed: ${result.status}`);
  }
  return result.data as RevnuPostResponse;
};

export async function getRevnuPosts() {
  "use cache";
  cacheLife("minutes");
  cacheTag(REVNU_CACHE_TAG);

  const posts = await fetchAllRevnuPosts();
  return posts.filter((post) => !getBlogRedirectTarget(post.canonicalPath));
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
    .replace(rootRelativeHrefPattern, (match, path: string, suffix: string) => {
      const target = getBlogRedirectTarget(path) ?? path;
      return knownPaths.has(target)
        ? `href="${getRevnuPostHref(target)}${suffix}"`
        : match;
    })
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
