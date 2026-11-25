import type { PostHog } from "posthog-js";
import {
  EMAIL_ATTRIBUTION_WINDOW_MS,
  emailClick,
} from "@/shared/email-attribution";

const KEYS = ["email_campaign", "email_send", "email_clicked_at"];

/**
 * Remembers the email a visit came from as super properties, so every later
 * event in the window (and the checkout context sent to Convex) carries it.
 * Last click wins; credit lapses after the attribution window.
 */
export function rememberEmailClick(
  posthog: PostHog,
  search: string,
  now = Date.now()
) {
  const click = emailClick(search);
  if (click) {
    posthog.unregister("email_send");
    posthog.register({
      email_campaign: click.campaign,
      ...(click.send ? { email_send: click.send } : {}),
      email_clicked_at: now,
    });
    return;
  }
  const clickedAt = posthog.get_property("email_clicked_at");
  if (
    typeof clickedAt === "number" &&
    now - clickedAt > EMAIL_ATTRIBUTION_WINDOW_MS
  ) {
    for (const key of KEYS) {
      posthog.unregister(key);
    }
  }
}
