import type { CaptureResult } from "posthog-js";
import { SENSITIVE_PARAM } from "./email-attribution";

const URL_PROPERTIES = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
];

/**
 * Drops credential-bearing query parameters (unsubscribe tokens, Stripe
 * checkout session ids, OAuth codes) and key=value fragments such as
 * waitlist invitations from a URL before it reaches analytics.
 */
export function analyticsSafeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  const sensitive = [...url.searchParams.keys()].filter((key) =>
    SENSITIVE_PARAM.test(key)
  );
  if (!(sensitive.length || url.hash.includes("="))) {
    return value;
  }
  for (const key of sensitive) {
    url.searchParams.delete(key);
  }
  if (url.hash.includes("=")) {
    url.hash = "";
  }
  return url.href;
}

function cleanUrls(properties: Record<string, unknown> | undefined) {
  if (!properties) {
    return properties;
  }
  const cleaned = { ...properties };
  for (const key of URL_PROPERTIES) {
    const value = cleaned[key];
    if (typeof value === "string") {
      cleaned[key] = analyticsSafeUrl(value);
    }
  }
  return cleaned;
}

/** Applies `analyticsSafeUrl` to every URL property an event or its person updates carry. */
export function analyticsSafeEvent(event: CaptureResult): CaptureResult {
  return {
    ...event,
    properties: cleanUrls(event.properties) ?? event.properties,
    ...(event.$set ? { $set: cleanUrls(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: cleanUrls(event.$set_once) } : {}),
  };
}
