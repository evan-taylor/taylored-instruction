import { v } from "convex/values";
import { BATCH } from "../shared/registration/domain";
import { calendar } from "../shared/registration/schedule";
import { internalMutation, internalQuery } from "./_generated/server";

export const due = internalQuery({
  args: {},
  returns: v.array(v.id("registrationJobs")),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("registrationJobs")
      .withIndex("by_state_and_due", (q) =>
        q.eq("state", "pending").lte("due", Date.now())
      )
      .take(BATCH);
    const abandoned = await ctx.db
      .query("registrationJobs")
      .withIndex("by_state_and_due", (q) =>
        q.eq("state", "sending").lte("due", Date.now() - 300_000)
      )
      .take(BATCH);
    return [...pending, ...abandoned].map((j) => j._id);
  },
});
export const claim = internalMutation({
  args: { id: v.id("registrationJobs") },
  returns: v.union(
    v.object({
      body: v.string(),
      subject: v.string(),
      name: v.string(),
      title: v.string(),
      schedule: v.string(),
      materials: v.array(
        v.object({ title: v.string(), url: v.union(v.string(), v.null()) })
      ),
      calendar: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (
      !job ||
      job.state === "sent" ||
      job.state === "canceled" ||
      job.state === "failed" ||
      (job.state === "sending" && job.due > Date.now() - 300_000)
    ) {
      return null;
    }
    const seat = job.seatId ? await ctx.db.get(job.seatId) : null;
    const session = job.sessionId ? await ctx.db.get(job.sessionId) : null;
    const entitlement = job.entitlementId
      ? await ctx.db.get(job.entitlementId)
      : null;
    if (
      (seat && seat.state !== "active") ||
      (session &&
        ((session.state === "canceled" && !job.key.startsWith("schedule:")) ||
          (job.stepId && job.scheduleRevision !== session.revision))) ||
      (entitlement && job.kind !== "email" && entitlement.state !== "pending")
    ) {
      await ctx.db.patch(job._id, { state: "canceled" });
      return null;
    }
    await ctx.db.patch(job._id, {
      state: "sending",
      attempts: job.attempts + 1,
      due: Date.now(),
    });
    const entitlements = seat?.settledAt
      ? await ctx.db
          .query("registrationEntitlements")
          .withIndex("by_seatId", (q) => q.eq("seatId", seat._id))
          .take(BATCH)
      : [];
    const materials = await Promise.all(
      entitlements
        .filter((e) => e.state === "ready")
        .map(async (e) => ({
          title: e.title,
          url: e.storageId
            ? await ctx.storage.getUrl(e.storageId)
            : (e.url ?? null),
        }))
    );
    return {
      materials,
      body: job.body,
      subject: job.subject,
      name: seat?.name ?? "",
      title: session?.title ?? "Taylored Instruction",
      schedule: session
        ? session.meetings
            .map(
              (m) =>
                `${new Date(m.start).toISOString()} — ${new Date(m.end).toISOString()} · ${m.location} (${session.timeZone})`
            )
            .join("\n")
        : "",
      calendar: session ? calendar(session, Date.now()) : undefined,
    };
  },
});
export const result = internalMutation({
  args: {
    id: v.id("registrationJobs"),
    success: v.boolean(),
    error: v.optional(v.string()),
    providerId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (job?.state !== "sending") {
      return null;
    }
    const failureState = job.attempts >= 5 ? "failed" : "pending";
    await ctx.db.patch(job._id, {
      state: args.success ? "sent" : failureState,
      due: Date.now() + 60_000 * 2 ** job.attempts,
      error: args.error,
      providerId: args.providerId,
    });
    return null;
  },
});
