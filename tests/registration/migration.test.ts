import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");
const material = {
  hovnId: "mask",
  title: "Pocket mask",
  sku: "mask",
  description: "Reusable mask",
  summary: "Mask",
  instructions: "Collect at class",
  defaultPrice: 1300,
  kind: "physical" as const,
  sourceData: "original mask",
};
const course = {
  hovnId: "course",
  title: "Lifeguarding",
  slug: "lifeguarding",
  description: "Training",
  archived: false,
  tuition: 30_000,
  sourceData: "original course",
  outcomes: [],
  materials: [{ hovnId: "mask", policy: "included" as const, cents: 0 }],
};

describe("Hovn catalog import", () => {
  it("preserves included pricing, keeps courses closed, and retries without overwriting edits or sending mail", async () => {
    const t = convexTest(schema, modules);
    const args = { materials: [material], courses: [course] };
    const first = await t.mutation(
      internal.registrationMigration.importHovnCatalog,
      args
    );
    const { id } = first.courses[0];
    const saved = await t.run((ctx) => ctx.db.get(id));
    expect(saved?.publication).toBe("draft");
    expect(saved?.enrollmentOpen).toBe(false);
    expect(saved?.settings.materials[0].cents).toBe(0);
    await t.run((ctx) => ctx.db.patch(id, { title: "Reviewed title" }));
    const retry = await t.mutation(
      internal.registrationMigration.importHovnCatalog,
      args
    );
    expect(retry.courses[0]).toEqual({ ...first.courses[0], created: false });
    expect((await t.run((ctx) => ctx.db.get(id)))?.title).toBe(
      "Reviewed title"
    );
    expect(
      await t.run((ctx) => ctx.db.query("registrationJobs").collect())
    ).toHaveLength(0);
  });
  it("rejects unresolved material references atomically and preserves archived status", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.registrationMigration.importHovnCatalog, {
        materials: [material],
        courses: [
          {
            ...course,
            materials: [{ hovnId: "missing", policy: "included", cents: 0 }],
          },
        ],
      })
    ).rejects.toThrow("Missing source material");
    expect(
      await t.run((ctx) => ctx.db.query("registrationMaterials").collect())
    ).toHaveLength(0);
    const result = await t.mutation(
      internal.registrationMigration.importHovnCatalog,
      { materials: [material], courses: [{ ...course, archived: true }] }
    );
    expect(
      (await t.run((ctx) => ctx.db.get(result.courses[0].id)))?.publication
    ).toBe("archived");
    await expect(
      t.mutation(internal.registrationMigration.importHovnCatalog, {
        materials: [material],
        courses: [course, { ...course, hovnId: "another" }],
      })
    ).rejects.toThrow("slugs must be unique");
  });
});
