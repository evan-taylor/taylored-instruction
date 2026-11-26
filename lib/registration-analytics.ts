"use client";
import posthog from "posthog-js";
import { withPostHog } from "@/lib/posthog-browser";
import { emailCreditActive } from "@/shared/email-attribution";
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
    const credited = emailCreditActive(
      posthog.get_property("email_clicked_at")
    );
    const emailCampaign = credited && posthog.get_property("email_campaign");
    const emailSend = credited && posthog.get_property("email_send");
    return {
      distinctId,
      sessionId: posthog.get_session_id(),
      ...(typeof emailCampaign === "string" ? { emailCampaign } : {}),
      ...(typeof emailSend === "string" ? { emailSend } : {}),
    };
  } catch {
    /* Unavailable analytics must not prevent checkout. */
  }
}

export function trackRegistration(
  event: RegistrationEvent,
  properties: Record<string, unknown> = {}
) {
  withPostHog((client) => {
    try {
      client.capture(event, {
        ...registrationProperties(properties),
        schema_version: 1,
        source: "browser",
      });
    } catch {
      /* Analytics must never interrupt enrollment or payment. */
    }
  });
}
