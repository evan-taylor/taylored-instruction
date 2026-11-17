import { getSanityBlogPaths } from "@/lib/blogRouting";
import { fetchAllRevnuPosts, fetchRevnuPost } from "@/lib/revnu";

export type BlogPathStatus = "servable" | "missing" | "unknown";

const refreshIntervalMs = 60_000;
const maxRememberedLookups = 500;

let knownPaths: { paths: Set<string>; loadedAt: number } | null = null;
let lastAttemptAt = Number.NEGATIVE_INFINITY;
let pendingLoad: Promise<boolean> | null = null;
const redirectTargets = new Map<
  string,
  { target: string | null; checkedAt: number }
>();

const loadKnownPaths = async (now: number) => {
  const [sanityPaths, revnuPosts] = await Promise.all([
    getSanityBlogPaths(),
    fetchAllRevnuPosts(),
  ]);
  knownPaths = {
    paths: new Set([
      ...sanityPaths,
      ...revnuPosts.map((post) => post.canonicalPath),
    ]),
    loadedAt: now,
  };
};

// Returns the paths and whether they are current. After a failed refresh the
// previous paths still prove a post exists, but not that one is missing.
const getKnownPaths = async (now: number) => {
  const isFresh = () =>
    knownPaths !== null && now - knownPaths.loadedAt < refreshIntervalMs;
  if (!isFresh() && now - lastAttemptAt >= refreshIntervalMs) {
    lastAttemptAt = now;
    pendingLoad ??= loadKnownPaths(now)
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        pendingLoad = null;
      });
  }
  if (pendingLoad) {
    await pendingLoad;
  }
  return knownPaths ? { paths: knownPaths.paths, fresh: isFresh() } : null;
};

// An old Revnu slug is missing from the list but still resolves to its new
// path, so it has to be looked up before it can be called missing.
const getRedirectTarget = async (canonicalPath: string, now: number) => {
  const remembered = redirectTargets.get(canonicalPath);
  if (remembered && now - remembered.checkedAt < refreshIntervalMs) {
    return remembered.target;
  }
  const slug = canonicalPath.split("/").at(-1);
  const post = slug ? await fetchRevnuPost(slug) : null;
  const target = post?.post.canonicalPath ?? null;
  if (redirectTargets.size >= maxRememberedLookups) {
    redirectTargets.clear();
  }
  redirectTargets.set(canonicalPath, { target, checkedAt: now });
  return target;
};

export const getBlogPathStatus = async (
  canonicalPath: string,
  now = Date.now()
): Promise<BlogPathStatus> => {
  const known = await getKnownPaths(now);
  if (!known) {
    return "unknown";
  }
  if (known.paths.has(canonicalPath)) {
    return "servable";
  }
  if (!known.fresh) {
    return "unknown";
  }
  try {
    const target = await getRedirectTarget(canonicalPath, now);
    return target && known.paths.has(target) ? "servable" : "missing";
  } catch {
    return "unknown";
  }
};

export const resetBlogPathIndex = () => {
  knownPaths = null;
  lastAttemptAt = Number.NEGATIVE_INFINITY;
  pendingLoad = null;
  redirectTargets.clear();
};
