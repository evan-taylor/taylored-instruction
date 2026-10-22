import { ConvexError, v } from "convex/values";
import {
  cents,
  safeUrl,
  taxCode,
  validateSettings,
} from "../shared/registration/domain";
import { outcome } from "../shared/registration/validators";
import { internalMutation } from "./_generated/server";
import { audit } from "./registrationHelpers";

const materialInput = v.object({
  hovnId: v.string(),
  title: v.string(),
  sku: v.string(),
  description: v.string(),
  summary: v.string(),
  instructions: v.string(),
  defaultPrice: v.number(),
  kind: v.union(v.literal("link"), v.literal("keycode"), v.literal("physical")),
  url: v.optional(v.string()),
  taxCode: v.optional(v.string()),
  sourceData: v.string(),
});
const courseInput = v.object({
  hovnId: v.string(),
  title: v.string(),
  slug: v.string(),
  description: v.string(),
  archived: v.boolean(),
  tuition: v.number(),
  taxCode: v.optional(v.string()),
  sourceData: v.string(),
  outcomes: v.array(outcome),
  materials: v.array(
    v.object({
      hovnId: v.string(),
      policy: v.union(
        v.literal("included"),
        v.literal("optional"),
        v.literal("waivable")
      ),
      cents: v.number(),
    })
  ),
});

/** Operator-only, bounded catalog import. Never publishes, overwrites, allocates codes, or sends mail. */
export const importHovnCatalog = internalMutation({
  args: { materials: v.array(materialInput), courses: v.array(courseInput) },
  returns: v.object({
    materials: v.array(
      v.object({
        hovnId: v.string(),
        id: v.id("registrationMaterials"),
        created: v.boolean(),
      })
    ),
    courses: v.array(
      v.object({
        hovnId: v.string(),
        id: v.id("registrationCourses"),
        created: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    if (args.materials.length > 100 || args.courses.length > 100) {
      throw new ConvexError(
        "Import at most 100 materials and 100 courses per batch"
      );
    }
    for (const rows of [args.materials, args.courses]) {
      if (
        new Set(rows.map((row) => row.hovnId)).size !== rows.length ||
        rows.some((row) => !(row.hovnId.trim() && row.title.trim()))
      ) {
        throw new ConvexError(
          "Source IDs and titles must be present and unique"
        );
      }
    }
    if (
      new Set(args.courses.map((course) => course.slug)).size !==
      args.courses.length
    ) {
      throw new ConvexError("Course slugs must be unique within the batch");
    }
    const materials = await Promise.all(
      args.materials.map(async (item) => {
        cents(item.defaultPrice);
        taxCode(item.taxCode);
        const url = item.kind === "link" ? safeUrl(item.url ?? "") : undefined;
        const existing = await ctx.db
          .query("registrationMaterials")
          .withIndex("by_hovnId", (q) => q.eq("hovnId", item.hovnId))
          .unique();
        if (existing) {
          if (existing.sourceData !== item.sourceData) {
            throw new ConvexError(
              "Source material changed; reconcile before retrying"
            );
          }
          return { hovnId: item.hovnId, id: existing._id, created: false };
        }
        const id = await ctx.db.insert("registrationMaterials", {
          ...item,
          url,
          archived: false,
          version: 1,
        });
        return { hovnId: item.hovnId, id, created: true };
      })
    );
    const courses = await Promise.all(
      args.courses.map(async (item) => {
        const attachments = await Promise.all(
          item.materials.map(async (attachment) => {
            const material = await ctx.db
              .query("registrationMaterials")
              .withIndex("by_hovnId", (q) => q.eq("hovnId", attachment.hovnId))
              .unique();
            if (!material) {
              throw new ConvexError(
                `Missing source material ${attachment.hovnId}`
              );
            }
            return {
              id: attachment.hovnId,
              materialId: material._id,
              title: material.title,
              policy: attachment.policy,
              cents: attachment.cents,
            };
          })
        );
        const settings = {
          tuition: item.tuition,
          taxCode: item.taxCode,
          materials: attachments,
          outcomes: item.outcomes,
          questions: [],
          emails: [],
          cutoffMinutes: 0,
        };
        validateSettings(settings);
        const existing = await ctx.db
          .query("registrationCourses")
          .withIndex("by_hovnId", (q) => q.eq("hovnId", item.hovnId))
          .unique();
        if (existing) {
          if (existing.sourceData !== item.sourceData) {
            throw new ConvexError(
              "Source course changed; reconcile before retrying"
            );
          }
          return { hovnId: item.hovnId, id: existing._id, created: false };
        }
        const slugOwner = await ctx.db
          .query("registrationCourses")
          .withIndex("by_slug", (q) => q.eq("slug", item.slug))
          .unique();
        if (slugOwner || !item.slug.trim()) {
          throw new ConvexError("Course slug is empty or already in use");
        }
        const id = await ctx.db.insert("registrationCourses", {
          hovnId: item.hovnId,
          sourceData: item.sourceData,
          title: item.title,
          slug: item.slug,
          description: item.description,
          delivery: "scheduled",
          publication: item.archived ? "archived" : "draft",
          enrollmentOpen: false,
          revision: 1,
          settings,
        });
        return { hovnId: item.hovnId, id, created: true };
      })
    );
    const createdMaterials = materials.filter((item) => item.created).length;
    const createdCourses = courses.filter((item) => item.created).length;
    if (createdMaterials || createdCourses) {
      await audit(
        ctx,
        "hovn-migration",
        "catalog-imported",
        "hovn",
        `${createdCourses} courses and ${createdMaterials} materials imported with enrollment closed`
      );
    }
    return { materials, courses };
  },
});
