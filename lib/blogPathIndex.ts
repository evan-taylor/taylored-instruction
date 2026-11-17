import { getSanityBlogPaths } from "@/lib/blogRouting";
import { fetchAllRevnuPosts, fetchRevnuPost } from "@/lib/revnu";

export type BlogPathStatus = "servable" | "missing" | "unknown";

const refreshIntervalMs = 60_000;
const maxRememberedLookups = 500;

let knownPaths: { paths: Set<string>; loadedAt: number } | null = null;
let pendingLoad: Promise<Set<string>> | null = null;
const lookups = new Map<string, { servable: boolean; checkedAt: number }>();

const loadKnownPaths = async () => {
  const [sanityPaths, revnuPosts] = await Promise.all([
    getSanityBlogPaths(),
    fetchAllRevnuPosts(),
  ]);
  return new Set([
    ...sanityPaths,
    ...revnuPosts.map((post) => post.canonicalPath),
  ]);
};

const getKnownPaths = async (now: number) => {
  if (knownPaths && now - knownPaths.loadedAt < refreshIntervalMs) {
    return knownPaths.paths;
  }
  pendingLoad ??= loadKnownPaths()
    .then((paths) => {
      knownPaths = { paths, loadedAt: now };
      return paths;
    })
    .finally(() => {
      pendingLoad = null;
    });
  return await pendingLoad.catch(() => knownPaths?.paths ?? null);
};

// An old Revnu slug is missing from the list but still resolves to a redirect,
// so it has to be looked up before it can be called missing.
const isRedirectedRevnuSlug = async (
  canonicalPath: string,
  paths: Set<string>,
  now: number
) => {
  const remembered = lookups.get(canonicalPath);
  if (remembered && now - remembered.checkedAt < refreshIntervalMs) {
    return remembered.servable;
  }
  const slug = canonicalPath.split("/").at(-1);
  const post = slug ? await fetchRevnuPost(slug) : null;
  const servable = Boolean(post && paths.has(post.post.canonicalPath));
  if (lookups.size >= maxRememberedLookups) {
    lookups.clear();
  }
  lookups.set(canonicalPath, { servable, checkedAt: now });
  return servable;
};

export const getBlogPathStatus = async (
  canonicalPath: string,
  now = Date.now()
): Promise<BlogPathStatus> => {
  const paths = await getKnownPaths(now);
  if (!paths) {
    return "unknown";
  }
  if (paths.has(canonicalPath)) {
    return "servable";
  }
  try {
    return (await isRedirectedRevnuSlug(canonicalPath, paths, now))
      ? "servable"
      : "missing";
  } catch {
    return "unknown";
  }
};

export const resetBlogPathIndex = () => {
  knownPaths = null;
  pendingLoad = null;
  lookups.clear();
};
