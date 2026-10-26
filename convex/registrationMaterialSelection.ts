import { ConvexError } from "convex/values";
import { BATCH, cents, type Settings } from "../shared/registration/domain";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** Staff may override course policies; prices always come from the server. */
export async function selectedMaterials(
  ctx: QueryCtx,
  config: Settings,
  ids: Id<"registrationMaterials">[],
  sessionId?: Id<"registrationSessions">
): Promise<Settings["materials"]> {
  if (ids.length > BATCH || new Set(ids).size !== ids.length) {
    throw new ConvexError("Choose at most 50 distinct materials");
  }
  return await Promise.all(
    ids.map(async (id) => {
      const material = await ctx.db.get(id);
      if (!material || material.archived) {
        throw new ConvexError("Choose an available material");
      }
      if (material.perSession && !sessionId) {
        throw new ConvexError(
          "Session-specific keycodes require a scheduled session"
        );
      }
      const attached = config.materials.find((item) => item.materialId === id);
      return {
        id: attached?.id ?? `material:${id}`,
        materialId: id,
        title: material.title,
        cents: cents(attached?.cents ?? material.defaultPrice ?? 0),
        policy: "included" as const,
      };
    })
  );
}
