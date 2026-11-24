import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

/**
 * Moves #118's separate alignment model onto instructor records:
 * - each active alignedInstructors grant becomes profiles.alignment (merged
 *   with any alignment already there), then the grant row is deleted;
 * - revoked grants are deleted without granting anything;
 * - legacy kind: "aligned" invitations become teaches: false.
 * Idempotent: a second run finds nothing to change. Pass dryRun to report
 * what would change without writing.
 *
 *   bunx convex run alignmentMigration:run '{"dryRun":true}'
 */
export const run = internalMutation({
  args: { dryRun: v.boolean() },
  returns: v.object({
    dryRun: v.boolean(),
    aligned: v.array(v.string()),
    skippedRevoked: v.array(v.string()),
    createdProfiles: v.array(v.string()),
    invitations: v.array(v.string()),
  }),
  handler: async (ctx, { dryRun }) => {
    const grants = await ctx.db.query("alignedInstructors").collect();
    const active = grants.filter((grant) => grant.revokedAt === undefined);
    const profiles = await Promise.all(
      active.map((grant) =>
        ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", grant.userId))
          .first()
      )
    );
    const invitations = (
      await ctx.db.query("instructorInvitations").collect()
    ).filter((row) => row.kind === "aligned");
    if (!dryRun) {
      await Promise.all([
        ...active.map((grant, i) => align(ctx, grant, profiles[i] ?? null)),
        ...grants.map((grant) => ctx.db.delete(grant._id)),
        ...invitations.map((row) =>
          ctx.db.patch(row._id, { teaches: false, kind: undefined })
        ),
      ]);
    }
    return {
      dryRun,
      aligned: active.map((grant) => grant.email),
      skippedRevoked: grants
        .filter((grant) => grant.revokedAt !== undefined)
        .map((grant) => grant.email),
      createdProfiles: active
        .filter((_, i) => !profiles[i])
        .map((grant) => grant.email),
      invitations: invitations.map((row) => row.email),
    };
  },
});

async function align(
  ctx: MutationCtx,
  grant: Doc<"alignedInstructors">,
  profile: Doc<"profiles"> | null
) {
  const alignment = {
    courseIds: [
      ...new Set([
        ...(profile?.alignment?.courseIds ?? []),
        ...grant.courseIds,
      ]),
    ],
    since: profile?.alignment?.since ?? grant.grantedAt,
    by: profile?.alignment?.by ?? grant.grantedBy,
  };
  if (profile) {
    await ctx.db.patch(profile._id, { alignment });
    return;
  }
  await ctx.db.insert("profiles", {
    userId: grant.userId,
    isInstructor: false,
    alignment,
    updatedAt: new Date(grant.grantedAt).toISOString(),
  });
}
