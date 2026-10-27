import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

it("accepts production instructor names and preserves auth lookups", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const user = {
      email: "instructor@example.test",
      emailVerificationTime: 1_792_728_339_683,
      firstName: "Jordan",
      lastName: "Taylor",
      name: "Jordan Taylor",
      phone: "+15555550100",
    };
    const id = await ctx.db.insert("users", user);
    expect(
      await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", user.email))
        .unique()
    ).toMatchObject({ _id: id, ...user });
    expect(
      await ctx.db
        .query("users")
        .withIndex("phone", (q) => q.eq("phone", user.phone))
        .unique()
    ).toMatchObject({ _id: id });
    const unnamed = await ctx.db.insert("users", {
      email: "student@example.test",
    });
    expect(await ctx.db.get(unnamed)).toMatchObject({
      email: "student@example.test",
    });
  });
});
