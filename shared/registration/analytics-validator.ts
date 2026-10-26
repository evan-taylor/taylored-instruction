import { v } from "convex/values";
export const analyticsContext = v.object({
  distinctId: v.string(),
  sessionId: v.optional(v.string()),
});
