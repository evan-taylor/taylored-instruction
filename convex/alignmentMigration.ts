import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

type Invitation = Doc<"instructorInvitations">;

const open = (row: Invitation) => !(row.acceptedAt || row.revokedAt);

/**
 * Moves #118's separate alignment model onto instructor records:
 * - each active alignedInstructors grant marks the profile aligned (its
 *   courses are dropped: aligned instructors may teach any active course),
 *   then the grant row is deleted;
 * - revoked grants are deleted without granting anything;
 * - legacy aligned invitations (kind: "aligned" or with courses) become
 *   aligned: true, and kind: "aligned" ones also teaches: false. A pending one
 *   that shares its email with another pending invitation is folded into that
 *   invitation, so each email keeps a single pending invitation.
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
    mergedInvitations: v.array(v.string()),
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
    const rows = await ctx.db.query("instructorInvitations").collect();
    const legacy = rows.filter(
      (row) => row.kind === "aligned" || row.courseIds !== undefined
    );
    const targets = legacy.map((row) =>
      open(row)
        ? rows.find(
            (other) =>
              other._id !== row._id &&
              other.email === row.email &&
              open(other) &&
              !legacy.includes(other)
          )
        : undefined
    );
    if (!dryRun) {
      await Promise.all([
        ...active.map((grant, i) => align(ctx, grant, profiles[i] ?? null)),
        ...grants.map((grant) => ctx.db.delete(grant._id)),
        ...legacy.flatMap((row, i) => {
          const target = targets[i];
          return [
            ctx.db.patch(row._id, {
              teaches: row.kind === "aligned" ? false : row.teaches,
              aligned: true,
              kind: undefined,
              courseIds: undefined,
              ...(target ? { revokedAt: Date.now() } : {}),
            }),
            ...(target ? [ctx.db.patch(target._id, { aligned: true })] : []),
          ];
        }),
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
      invitations: legacy.map((row) => row.email),
      mergedInvitations: legacy
        .filter((_, i) => targets[i])
        .map((row) => row.email),
    };
  },
});

async function align(
  ctx: MutationCtx,
  grant: Doc<"alignedInstructors">,
  profile: Doc<"profiles"> | null
) {
  const alignment = {
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
