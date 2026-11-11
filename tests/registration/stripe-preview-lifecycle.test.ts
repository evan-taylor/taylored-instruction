import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  assertPreviewTarget,
  branchIsRetired,
  cleanupPreviews,
  isOwnedPreview,
  PREVIEW_REPOSITORY,
  previewCreationKey,
  previewMetadata,
} from "../../scripts/stripe-preview-lifecycle";

function endpoint(overrides: Partial<Stripe.WebhookEndpoint> = {}) {
  return {
    id: "we_preview",
    url: "https://example-123.convex.site/registration/stripe",
    livemode: false,
    metadata: previewMetadata("feature/exact-branch"),
    ...overrides,
  } as Stripe.WebhookEndpoint;
}

function pull(state: "open" | "closed", closedAt: string | null = null) {
  return {
    state,
    closed_at: closedAt,
    head: {
      ref: "feature/exact-branch",
      repo: { full_name: PREVIEW_REPOSITORY },
    },
  };
}

function github(pulls: ReturnType<typeof pull>[], branchStatus = 200) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(pulls))
    .mockResolvedValueOnce(new Response(null, { status: branchStatus }));
}

describe("preview ownership", () => {
  it("requires exact ownership, test mode and exact Convex webhook URL", () => {
    expect(isOwnedPreview(endpoint())).toBe(true);
    for (const unsafe of [
      endpoint({ livemode: true }),
      endpoint({ metadata: {} }),
      endpoint({
        metadata: { ...previewMetadata("dev"), environment: "development" },
      }),
      endpoint({
        metadata: { ...previewMetadata("branch"), repository: "other/repo" },
      }),
      ...[
        "http://example.convex.site/registration/stripe",
        "https://example.convex.site.evil.com/registration/stripe",
        "https://example.convex.site/registration/stripe?x=1",
        "https://example.convex.site/other",
        "https://user@example.convex.site/registration/stripe",
      ].map((url) => endpoint({ url })),
    ]) {
      expect(isOwnedPreview(unsafe)).toBe(false);
    }
    expect(() =>
      assertPreviewTarget(endpoint().url, endpoint({ livemode: true }))
    ).toThrow();
    expect(() => previewMetadata("")).toThrow();
  });

  it("uses exact branch metadata and a new creation epoch after a successful endpoint", () => {
    expect(previewMetadata("feature/ABC").branch).toBe("feature/ABC");
    expect(previewCreationKey("url", "")).toBe(previewCreationKey("url", ""));
    expect(previewCreationKey("url", "old-secret")).not.toBe(
      previewCreationKey("url", "new-secret")
    );
    expect(previewCreationKey("url", "old-secret")).not.toContain("old-secret");
  });
});

describe("GitHub retirement verification", () => {
  it("protects any open PR even if another PR on the branch closed", async () => {
    const request = github([
      pull("closed", "2020-01-01T00:00:00Z"),
      pull("open"),
    ]);
    expect(await branchIsRetired("feature/exact-branch", request)).toBe(false);
  });

  it("waits 24 hours after closure and rejects missing or malformed closure times", async () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    await Promise.all(
      [null, "invalid", "2026-11-10T11:00:00Z"].map(async (date) => {
        expect(
          await branchIsRetired(
            "feature/exact-branch",
            github([pull("closed", date)]),
            "",
            now
          )
        ).toBe(false);
      })
    );
    expect(
      await branchIsRetired(
        "feature/exact-branch",
        github([pull("closed", "2026-11-09T12:00:00Z")]),
        "",
        now
      )
    ).toBe(true);
  });

  it("retains unknown active branches but retires verified deleted branches", async () => {
    expect(await branchIsRetired("feature/exact-branch", github([]))).toBe(
      false
    );
    const request = github([], 404);
    expect(await branchIsRetired("feature/exact-branch", request)).toBe(true);
    expect(String(request.mock.calls[1][0])).toContain(
      "feature%2Fexact-branch"
    );
  });

  it("fails closed on rate limits and branch lookup errors", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 403 }));
    await expect(branchIsRetired("branch", request)).rejects.toThrow();
    await expect(branchIsRetired("branch", github([], 500))).rejects.toThrow();
  });

  it("reads every PR page before allowing deletion", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          Array.from({ length: 100 }, () =>
            pull("closed", "2020-01-01T00:00:00Z")
          )
        )
      )
      .mockResolvedValueOnce(Response.json([pull("open")]));
    expect(await branchIsRetired("feature/exact-branch", request)).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("safe cleanup", () => {
  function client(current = endpoint()) {
    const retrieve = vi.fn().mockResolvedValue(current);
    const del = vi.fn().mockResolvedValue({ deleted: true });
    return {
      stripe: { webhookEndpoints: { retrieve, del } } as unknown as Stripe,
      retrieve,
      del,
    };
  }

  it("never deletes live, unowned or the branch currently building", async () => {
    const { stripe, del } = client();
    const entries = [
      endpoint(),
      endpoint({ id: "we_live", livemode: true }),
      endpoint({ id: "we_dev", metadata: {} }),
    ];
    expect(
      await cleanupPreviews(
        stripe,
        entries,
        "feature/exact-branch",
        vi.fn().mockResolvedValue(true)
      )
    ).toEqual(entries);
    expect(del).not.toHaveBeenCalled();
  });

  it("verifies all branches before deleting and fails closed on lookup failure", async () => {
    const { stripe, del } = client();
    await expect(
      cleanupPreviews(
        stripe,
        [endpoint()],
        undefined,
        vi.fn().mockRejectedValue(new Error("offline"))
      )
    ).rejects.toThrow();
    expect(del).not.toHaveBeenCalled();
  });

  it("rechecks ownership and open PR status immediately before deletion", async () => {
    const { stripe, del } = client();
    const retired = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    expect(
      await cleanupPreviews(stripe, [endpoint()], undefined, retired)
    ).toHaveLength(1);
    expect(del).not.toHaveBeenCalled();
    const live = client(endpoint({ livemode: true }));
    await cleanupPreviews(
      live.stripe,
      [endpoint()],
      undefined,
      vi.fn().mockResolvedValue(true)
    );
    expect(live.del).not.toHaveBeenCalled();
  });

  it("deletes retired owned endpoints and tolerates concurrent deletion", async () => {
    const { stripe, del } = client();
    const retired = vi.fn().mockResolvedValue(true);
    expect(
      await cleanupPreviews(stripe, [endpoint()], undefined, retired)
    ).toEqual([]);
    del.mockRejectedValue(
      Object.assign(new Error("missing"), { code: "resource_missing" })
    );
    expect(
      await cleanupPreviews(stripe, [endpoint()], undefined, retired)
    ).toEqual([]);
  });
});
