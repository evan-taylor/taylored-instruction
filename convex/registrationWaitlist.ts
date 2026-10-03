import { v } from "convex/values";
import { BATCH, effective, email } from "../shared/registration/domain";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { enqueue, hash, rate } from "./registrationHelpers";

export const join = mutation({
  args: {
    sessionId: v.id("registrationSessions"),
    name: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = email(args.email);
    await rate(ctx, `waitlist:${normalized}`, 3);
    const session = await ctx.db.get(args.sessionId);
    const course = session ? await ctx.db.get(session.courseId) : null;
    if (
      !(session && course) ||
      session.visibility === "admin" ||
      session.publication !== "published" ||
      course.publication !== "published" ||
      session.state !== "open" ||
      !args.name.trim() ||
      Date.now() >=
        session.firstStart -
          effective(course.settings, session.overrides).cutoffMinutes * 60_000
    ) {
      throw new Error("Waitlist is closed");
    }
    const existing = await ctx.db
      .query("registrationWaitlist")
      .withIndex("by_sessionId_and_email", (q) =>
        q.eq("sessionId", session._id).eq("email", normalized)
      )
      .take(BATCH);
    const seats = await ctx.db
      .query("registrationSeats")
      .withIndex("by_sessionId_and_email", (q) =>
        q.eq("sessionId", session._id).eq("email", normalized)
      )
      .take(BATCH);
    if (
      existing.some((e) => e.state === "waiting" || e.state === "offered") ||
      seats.some((s) => s.state === "active" || s.state === "held")
    ) {
      return null;
    }
    await ctx.db.insert("registrationWaitlist", {
      sessionId: session._id,
      name: args.name.trim(),
      email: normalized,
      state: "waiting",
    });
    await ctx.scheduler.runAfter(0, internal.registrationWaitlist.advance, {
      sessionId: session._id,
    });
    return null;
  },
});
export const advance = internalMutation({
  args: { sessionId: v.id("registrationSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const course = session ? await ctx.db.get(session.courseId) : null;
    if (!(session && course)) {
      return null;
    }
    const cutoff =
      session.firstStart -
      effective(course.settings, session.overrides).cutoffMinutes * 60_000;
    const offers = await ctx.db
      .query("registrationWaitlist")
      .withIndex("by_sessionId_and_state", (q) =>
        q.eq("sessionId", session._id).eq("state", "offered")
      )
      .take(BATCH);
    let { reserved } = session;
    await offers.reduce(async (prior, offer) => {
      await prior;
      if (
        (offer.expires ?? 0) <= Date.now() ||
        cutoff <= Date.now() ||
        session.state !== "open"
      ) {
        await ctx.db.patch(offer._id, { state: "expired" });
        reserved -= 1;
      }
    }, Promise.resolve());
    if (session.state === "open" && cutoff > Date.now()) {
      const waiting = await ctx.db
        .query("registrationWaitlist")
        .withIndex("by_sessionId_and_state", (q) =>
          q.eq("sessionId", session._id).eq("state", "waiting")
        )
        .take(Math.max(1, Math.min(BATCH, session.capacity - reserved)));
      await waiting.reduce(async (prior, entry) => {
        await prior;
        if (reserved >= session.capacity) {
          return;
        }
        const token = crypto.randomUUID() + crypto.randomUUID();
        const expires = Math.min(
          cutoff,
          Date.now() + session.offerMinutes * 60_000
        );
        await ctx.db.patch(entry._id, {
          state: "offered",
          tokenHash: await hash(token),
          expires,
        });
        reserved += 1;
        await enqueue(ctx, {
          key: `offer:${entry._id}`,
          kind: "email",
          recipient: entry.email,
          subject: `A seat is available: ${session.title}`,
          body: `An opening is reserved until ${new Date(expires).toISOString()}. Register at /s/${session.code}#invitation=${token}`,
          due: Date.now(),
          sessionId: session._id,
        });
        await ctx.scheduler.runAt(
          expires,
          internal.registrationWaitlist.advance,
          args
        );
      }, Promise.resolve());
    }
    await ctx.db.patch(session._id, { reserved });
    return null;
  },
});
export const decline = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const digest = await hash(args.token);
    const entry = await ctx.db
      .query("registrationWaitlist")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", digest))
      .unique();
    if (entry?.state !== "offered") {
      return null;
    }
    const session = await ctx.db.get(entry.sessionId);
    await ctx.db.patch(entry._id, { state: "declined" });
    if (session) {
      await ctx.db.patch(session._id, { reserved: session.reserved - 1 });
      await ctx.scheduler.runAfter(0, internal.registrationWaitlist.advance, {
        sessionId: session._id,
      });
    }
    return null;
  },
});
