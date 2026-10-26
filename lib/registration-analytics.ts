"use client";
import posthog from "posthog-js";
import {
  type RegistrationEvent,
  registrationProperties,
} from "@/shared/registration/analytics";

export function registrationAnalyticsContext() {
  try {
    if (posthog.has_opted_out_capturing()) {
      return;
    }
    const distinctId = posthog.get_distinct_id();
    if (!distinctId) {
      return;
    }
    return { distinctId, sessionId: posthog.get_session_id() };
  } catch {
    /* Unavailable analytics must not prevent checkout. */
  }
}

export function trackRegistration(
  event: RegistrationEvent,
  properties: Record<string, unknown> = {}
) {
  try {
    posthog.capture(event, {
      ...registrationProperties(properties),
      schema_version: 1,
      source: "browser",
    });
  } catch {
    /* Analytics must never interrupt enrollment or payment. */
  }
}
