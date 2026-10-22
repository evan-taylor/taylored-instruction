import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { ADMIN_EMAILS } from "../../shared/adminEmails";

const modules = import.meta.glob("../../convex/**/*.ts");
const INVITEE = "jordan@example.test";
let current: ReturnType<typeof convexTest> | null = null;

/** Runs every queued invitation send while the env stubs are still in place. */
async function drain(t: ReturnType<typeof convexTest>) {
  vi.useFakeTimers();
  try {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
}

// Invitations schedule a real send; give it a safe mailbox and a mocked provider.
beforeEach(() => {
  vi.stubEnv("REGISTRATION_MODE", "test");
  vi.stubEnv("REGISTRATION_TEST_RECIPIENT", "safe@example.test");
  vi.stubEnv("AUTH_EMAIL_FROM", "Training <sender@example.test>");
  vi.stubEnv("SITE_URL", "https://preview.example.test");
  vi.stubEnv("RESEND_API_KEY", "re_local_mock_only");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ id: "local-email" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
});
afterEach(async () => {
  if (current) {
    await drain(current);
    current = null;
  }
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function world() {
  const t = convexTest(schema, modules);
  current = t;
  const ids = await t.run(async (ctx) => ({
    admin: await ctx.db.insert("users", {
      email: ADMIN_EMAILS[0],
      emailVerificationTime: Date.now(),
    }),
    invitee: await ctx.db.insert("users", {
      email: "Jordan@example.test",
      emailVerificationTime: Date.now(),
    }),
    unverified: await ctx.db.insert("users", { email: INVITEE }),
    other: await ctx.db.insert("users", {
      email: "someone@example.test",
      emailVerificationTime: Date.now(),
    }),
  }));
  const as = (id: string) => t.withIdentity({ subject: `${id}|session` });
  return {
    t,
    admin: as(ids.admin),
    invitee: as(ids.invitee),
    unverified: as(ids.unverified),
    other: as(ids.other),
    profiles: () => t.run((ctx) => ctx.db.query("profiles").collect()),
    scheduled: () =>
      t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect()),
  };
}

it("signing in creates no profile, so students never appear as instructors", async () => {
  const w = await world();
  await w.invitee.mutation(api.profiles.updateLastLogin);
  expect(await w.profiles()).toHaveLength(0);
  // The account still resolves (admins rely on this email), just with no profile.
  expect(await w.invitee.query(api.profiles.getProfile)).toMatchObject({
    id: null,
    email: "Jordan@example.test",
    is_instructor: false,
  });
  expect(await w.invitee.query(api.instructorInvitations.mine)).toBeNull();
  await expect(
    w.invitee.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("No pending invitation");
});

it("only admins can invite, and inviting twice re-sends one pending invitation", async () => {
  const w = await world();
  await expect(
    w.other.mutation(api.instructorInvitations.invite, { email: INVITEE })
  ).rejects.toThrow("Admin access required");
  const first = await w.admin.mutation(api.instructorInvitations.invite, {
    email: " Jordan@Example.test ",
  });
  const second = await w.admin.mutation(api.instructorInvitations.invite, {
    email: INVITEE,
  });
  expect(second).toBe(first);
  const list = await w.admin.query(api.instructorInvitations.list);
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ email: INVITEE, invitedBy: ADMIN_EMAILS[0] });
  const scheduled = await w.scheduled();
  expect(scheduled).toHaveLength(2);
  expect(scheduled[0]?.name).toBe("instructorInvitations:sendInvitationEmail");
  await drain(w.t);
  const sends = vi
    .mocked(fetch)
    .mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
  expect(sends).toHaveLength(2);
  // Test mode routes the invitation to the safe mailbox, never the invitee.
  expect(sends[0].to).toEqual(["safe@example.test"]);
  expect(sends[0].subject).toContain("invited to teach");
  expect(sends[0].text).toContain("https://preview.example.test/my-account");
  expect(sends[0].html).toContain(INVITEE);
  await expect(
    w.admin.mutation(api.instructorInvitations.invite, { email: "nope" })
  ).rejects.toThrow("valid email");
});

it("accepting requires the invited, verified email and grants instructor access once", async () => {
  const w = await world();
  await w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE });
  expect(await w.other.query(api.instructorInvitations.mine)).toBeNull();
  await expect(
    w.other.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("No pending invitation");
  expect(await w.unverified.query(api.instructorInvitations.mine)).toBeNull();
  await expect(
    w.unverified.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("verified email");
  expect(await w.invitee.query(api.instructorInvitations.mine)).not.toBeNull();
  await w.invitee.mutation(api.instructorInvitations.accept);
  const profiles = await w.profiles();
  expect(profiles).toHaveLength(1);
  expect(profiles[0]?.isInstructor).toBe(true);
  expect(await w.invitee.query(api.profiles.getProfile)).toMatchObject({
    is_instructor: true,
  });
  expect(await w.invitee.query(api.instructorInvitations.mine)).toBeNull();
  await expect(
    w.invitee.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("No pending invitation");
  const list = await w.admin.query(api.instructorInvitations.list);
  expect(list[0]?.acceptedAt).toBeTypeOf("number");
  await expect(
    w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE })
  ).rejects.toThrow("already an approved instructor");
});

it("a revoked invitation cannot be accepted", async () => {
  const w = await world();
  const id = await w.admin.mutation(api.instructorInvitations.invite, {
    email: INVITEE,
  });
  await w.admin.mutation(api.instructorInvitations.revoke, { id });
  expect(await w.invitee.query(api.instructorInvitations.mine)).toBeNull();
  await expect(
    w.invitee.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("No pending invitation");
  expect(await w.profiles()).toHaveLength(0);
});

it("a staged migration still attaches on first sign-in", async () => {
  const w = await world();
  await w.t.run(async (ctx) => {
    await ctx.db.insert("staging_profiles", {
      email: INVITEE,
      supabaseUserId: "legacy",
      isInstructor: true,
    });
  });
  await w.invitee.mutation(api.profiles.updateLastLogin);
  const profiles = await w.profiles();
  expect(profiles).toHaveLength(1);
  expect(profiles[0]?.isInstructor).toBe(true);
});

it("records whether the invitation email was delivered", async () => {
  const w = await world();
  await w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE });
  await drain(w.t);
  let [row] = await w.admin.query(api.instructorInvitations.list);
  expect(row?.sentAt).toBeTypeOf("number");
  expect(row?.sendError).toBeUndefined();
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        message: "Domain not verified",
        name: "validation_error",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )
  );
  await w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE });
  [row] = await w.admin.query(api.instructorInvitations.list);
  expect(row?.sentAt).toBeUndefined();
  await drain(w.t);
  [row] = await w.admin.query(api.instructorInvitations.list);
  expect(row?.sendError).toContain("Domain not verified");
  expect(row?.sentAt).toBeUndefined();
});

it("removing access cancels pending invitations, and a disabled account cannot accept", async () => {
  const w = await world();
  // An instructor who later loses approval: the old invitation dies with it.
  await w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE });
  await w.invitee.mutation(api.instructorInvitations.accept);
  const inviteeId = (await w.profiles())[0]?.userId;
  if (!inviteeId) {
    throw new Error("expected a profile");
  }
  await w.admin.mutation(api.instructorInvitations.invite, {
    email: "someone@example.test",
  });
  await w.admin.mutation(api.profiles.approveInstructor, {
    userId: inviteeId,
    approve: false,
  });
  await w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE });
  expect(await w.invitee.query(api.instructorInvitations.mine)).not.toBeNull();
  await w.admin.mutation(api.profiles.deactivateUser, { userId: inviteeId });
  expect(await w.invitee.query(api.instructorInvitations.mine)).toBeNull();
  await expect(
    w.invitee.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("No pending invitation");
  // Even a brand-new invitation cannot revive a disabled account.
  await w.admin.mutation(api.instructorInvitations.invite, { email: INVITEE });
  await expect(
    w.invitee.mutation(api.instructorInvitations.accept)
  ).rejects.toThrow("disabled");
  expect((await w.profiles())[0]?.deactivatedAt).toBeTypeOf("string");
  // The unrelated invitation survived all of that.
  expect(await w.other.query(api.instructorInvitations.mine)).not.toBeNull();
});
