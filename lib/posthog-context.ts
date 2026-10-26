"use client";
import { registrationAnalyticsContext } from "@/lib/registration-analytics";
export function postHogHeaders(): Record<string, string> {
  const context = registrationAnalyticsContext();
  if (!context) {
    return {};
  }
  return {
    "X-POSTHOG-DISTINCT-ID": context.distinctId,
    ...(context.sessionId ? { "X-POSTHOG-SESSION-ID": context.sessionId } : {}),
  };
}
