import { type Infer, v } from "convex/values";
export const analyticsContext = v.object({
  distinctId: v.string(),
  sessionId: v.optional(v.string()),
  /** Last email campaign the browser clicked through, within its window. */
  emailCampaign: v.optional(v.string()),
  emailSend: v.optional(v.string()),
});
type AnalyticsContext = Infer<typeof analyticsContext>;

/** Browser-supplied context, kept only when every field is a plausible size. */
export function boundedAnalytics(analytics: AnalyticsContext | undefined) {
  if (
    !analytics?.distinctId.length ||
    analytics.distinctId.length > 200 ||
    (analytics.sessionId?.length ?? 0) > 200 ||
    (analytics.emailCampaign?.length ?? 0) > 64 ||
    (analytics.emailSend?.length ?? 0) > 64
  ) {
    return;
  }
  return analytics;
}
