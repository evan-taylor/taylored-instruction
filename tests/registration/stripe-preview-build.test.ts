import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  exec: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock("node:child_process", () => ({ execFileSync: mocks.exec }));
vi.mock("stripe", () => ({
  default: class {
    webhookEndpoints = {
      create: mocks.create,
      update: mocks.update,
      list: mocks.list,
    };
  },
}));
vi.mock("../../scripts/stripe-preview-lifecycle", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../scripts/stripe-preview-lifecycle")
  >()),
  cleanupPreviews: mocks.cleanup,
}));

const url = "https://preview-123.convex.site/registration/stripe";
const CREATION_KEY_PREFIX = /^registration-preview:/;
const owned = {
  id: "we_existing",
  url,
  livemode: false,
  metadata: {
    repository: "evan-taylor/taylored-instruction",
    branch: "feature/test",
    environment: "preview",
  },
};

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://preview-123.convex.cloud");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_SITE_URL", "https://preview-123.convex.site");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_BRANCH_URL", "preview.example.com");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feature/test");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
  mocks.exec.mockImplementation((_command, args: string[]) => {
    if (args[2] !== "get") {
      return "";
    }
    if (args[3] === "STRIPE_SECRET_KEY") {
      return "sk_test_mock";
    }
    if (args[3] === "REGISTRATION_ALLOW_TEST_FIXTURES") {
      return "false";
    }
    return "configured";
  });
  mocks.create.mockResolvedValue({ id: "we_new", secret: "whsec_mock" });
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function listed(entries: (typeof owned)[]) {
  mocks.list.mockReturnValue({
    autoPagingToArray: vi.fn().mockResolvedValue(entries),
  });
}

it("reuses and tags its endpoint without GitHub even at capacity", async () => {
  listed(Array.from({ length: 16 }, () => owned));
  mocks.cleanup.mockRejectedValue(new Error("GitHub offline"));
  await import("../../scripts/vercel-build");
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith(
    "we_existing",
    expect.objectContaining({ metadata: owned.metadata })
  );
});

it("fails clearly at full capacity when cleanup cannot prove retirement", async () => {
  listed(
    Array.from({ length: 16 }, (_, index) => ({
      ...owned,
      id: `we_${index}`,
      url: `https://other-${index}.convex.site/registration/stripe`,
    }))
  );
  mocks.cleanup.mockRejectedValue(new Error("GitHub offline"));
  await expect(import("../../scripts/vercel-build")).rejects.toThrow(
    "capacity (16) is full"
  );
  expect(mocks.create).not.toHaveBeenCalled();
});

it("creates with ownership and a retry key when GitHub is unavailable but capacity exists", async () => {
  listed([]);
  mocks.cleanup.mockRejectedValue(new Error("GitHub offline"));
  await import("../../scripts/vercel-build");
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({ url, metadata: owned.metadata }),
    { idempotencyKey: expect.stringMatching(CREATION_KEY_PREFIX) }
  );
  expect(mocks.exec).toHaveBeenCalledWith(
    "bunx",
    expect.arrayContaining(["REGISTRATION_STRIPE_WEBHOOK_SECRET"]),
    expect.objectContaining({ input: "whsec_mock" })
  );
});
