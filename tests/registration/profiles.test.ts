import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

async function signedIn(staged = false) {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      email: "person@example.test",
      emailVerificationTime: Date.now(),
    });
    if (staged) {
      await ctx.db.insert("staging_profiles", {
        email: "person@example.test",
        supabaseUserId: "legacy",
        isInstructor: true,
      });
    }
    return id;
  });
  return {
    t,
    userId,
    client: t.withIdentity({ subject: `${userId}|session` }),
  };
}

it("signing in creates no profile, so students never reach the instructor queue", async () => {
  const { t, client } = await signedIn();
  await client.mutation(api.profiles.updateLastLogin);
  expect(await t.run((ctx) => ctx.db.query("profiles").collect())).toHaveLength(
    0
  );
  expect(await client.query(api.profiles.getProfile)).toBeNull();
});

it("requesting instructor access creates one pending profile and notifies admins once", async () => {
  const { t, client } = await signedIn();
  await client.mutation(api.profiles.requestInstructorAccess);
  await client.mutation(api.profiles.requestInstructorAccess);
  const profiles = await t.run((ctx) => ctx.db.query("profiles").collect());
  expect(profiles).toHaveLength(1);
  expect(profiles[0]?.isInstructor).toBe(false);
  const scheduled = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(scheduled).toHaveLength(1);
  expect(scheduled[0]?.name).toBe("notifications:sendNewUserAdminNotification");
  await client.mutation(api.profiles.updateLastLogin);
  expect(await client.query(api.profiles.getProfile)).toMatchObject({
    is_instructor: false,
  });
});

it("a staged migration still attaches on first sign-in without a notification", async () => {
  const { t, client } = await signedIn(true);
  await client.mutation(api.profiles.updateLastLogin);
  const profiles = await t.run((ctx) => ctx.db.query("profiles").collect());
  expect(profiles).toHaveLength(1);
  expect(profiles[0]?.isInstructor).toBe(true);
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())
  ).toHaveLength(0);
});
