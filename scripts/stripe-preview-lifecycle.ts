import { createHash } from "node:crypto";
import type Stripe from "stripe";

export const PREVIEW_REPOSITORY = "evan-taylor/taylored-instruction";
const PREVIEW_URL =
  /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.convex\.site\/registration\/stripe$/;
const GRACE_MS = 24 * 60 * 60 * 1000;

export function previewMetadata(branch: string) {
  if (!branch || branch.length > 500) {
    throw new Error("Preview builds require an exact VERCEL_GIT_COMMIT_REF");
  }
  return { repository: PREVIEW_REPOSITORY, branch, environment: "preview" };
}

export function isOwnedPreview(endpoint: Stripe.WebhookEndpoint) {
  return (
    !endpoint.livemode &&
    PREVIEW_URL.test(endpoint.url) &&
    endpoint.metadata.repository === PREVIEW_REPOSITORY &&
    endpoint.metadata.environment === "preview" &&
    Boolean(endpoint.metadata.branch)
  );
}

export function previewCreationKey(url: string, previousSecret: string) {
  return `registration-preview:${createHash("sha256")
    .update(JSON.stringify([url, previousSecret]))
    .digest("hex")}`;
}

type Pull = {
  closed_at: string | null;
  head: { ref: string; repo: { full_name: string } | null };
  state: "open" | "closed";
};

export async function branchIsRetired(
  branch: string,
  request: typeof fetch = fetch,
  token = process.env.GITHUB_TOKEN,
  now = Date.now()
) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const base = `https://api.github.com/repos/${PREVIEW_REPOSITORY}`;
  const pulls: Pull[] = [];
  async function readPage(page: number): Promise<void> {
    const query = new URLSearchParams({
      state: "all",
      head: `evan-taylor:${branch}`,
      per_page: "100",
      page: String(page),
    });
    const response = await request(`${base}/pulls?${query}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error("GitHub PR lookup failed; no preview cleanup is safe");
    }
    const batch: Pull[] = await response.json();
    if (
      !Array.isArray(batch) ||
      batch.some(
        (pull) =>
          !(
            pull?.head?.ref &&
            ["open", "closed"].includes(pull.state) &&
            (pull.closed_at === null || typeof pull.closed_at === "string") &&
            (pull.head.repo === null ||
              typeof pull.head.repo?.full_name === "string")
          )
      )
    ) {
      throw new Error("Invalid GitHub PR response");
    }
    pulls.push(...batch);
    if (batch.length === 100) {
      await readPage(page + 1);
    }
  }
  await readPage(1);
  const matching = pulls.filter(
    (pull) =>
      pull.head.ref === branch &&
      pull.head.repo?.full_name === PREVIEW_REPOSITORY
  );
  if (matching.some((pull) => pull.state === "open")) {
    return false;
  }
  if (matching.length > 0) {
    return matching.every(
      (pull) =>
        pull.state === "closed" &&
        pull.closed_at !== null &&
        now - Date.parse(pull.closed_at) >= GRACE_MS
    );
  }
  const response = await request(
    `${base}/branches/${encodeURIComponent(branch)}`,
    { headers, signal: AbortSignal.timeout(15_000) }
  );
  if (response.status === 404) {
    return true;
  }
  if (!response.ok) {
    throw new Error("GitHub branch lookup failed; no preview cleanup is safe");
  }
  return false;
}

export async function cleanupPreviews(
  stripe: Stripe,
  endpoints: Stripe.WebhookEndpoint[],
  protectedBranch?: string,
  retired = branchIsRetired
) {
  const candidates = endpoints.filter(
    (endpoint) =>
      isOwnedPreview(endpoint) && endpoint.metadata.branch !== protectedBranch
  );
  const branches = [
    ...new Set(candidates.map((entry) => entry.metadata.branch)),
  ];
  const decisions = await Promise.all(
    branches.map(async (branch) => [branch, await retired(branch)] as const)
  );
  const eligible = new Map(decisions);
  const removed = await Promise.all(
    candidates
      .filter((endpoint) => eligible.get(endpoint.metadata.branch))
      .map(async (endpoint) => {
        const current = await stripe.webhookEndpoints
          .retrieve(endpoint.id)
          .catch((error: unknown) => {
            if (isMissing(error)) {
              return null;
            }
            throw error;
          });
        if (!current) {
          return endpoint.id;
        }
        if (
          !isOwnedPreview(current) ||
          current.metadata.branch !== endpoint.metadata.branch ||
          !(await retired(current.metadata.branch))
        ) {
          return null;
        }
        await stripe.webhookEndpoints
          .del(current.id)
          .catch((error: unknown) => {
            if (!isMissing(error)) {
              throw error;
            }
          });
        return current.id;
      })
  );
  return endpoints.filter((endpoint) => !removed.includes(endpoint.id));
}

function isMissing(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

export function assertPreviewTarget(
  url: string,
  endpoint?: Stripe.WebhookEndpoint
) {
  if (!PREVIEW_URL.test(url) || endpoint?.livemode) {
    throw new Error("Preview webhook must be a test endpoint on a Convex site");
  }
}
