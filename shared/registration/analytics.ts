import type { CaptureResult } from "posthog-js";

/** Explicit, non-PII registration telemetry. Never add form values or access URLs. */
export const REGISTRATION_EVENTS = [
  "registration_form_started",
  "registration_validation_failed",
  "registration_offering_viewed",
  "registration_discovery_filtered",
  "registration_discovery_view_changed",
  "registration_discovery_more_requested",
  "registration_mode_changed",
  "registration_attendee_added",
  "registration_attendee_removed",
  "registration_material_selection_changed",
  "registration_material_waiver_changed",
  "registration_submitted",
  "registration_reservation_succeeded",
  "registration_reservation_failed",
  "registration_review_opened",
  "registration_restarted",
  "registration_reserved",
  "registration_settled",
  "registration_released",
  "registration_payment_exception",
  "registration_checkout_started",
  "registration_checkout_ready",
  "registration_checkout_failed",
  "registration_checkout_retried",
  "registration_checkout_left",
  "registration_checkout_canceled",
  "registration_hold_expired",
  "registration_payment_form_ready",
  "registration_payment_form_failed",
  "registration_payment_submitted",
  "registration_payment_failed",
  "registration_payment_returned",
  "registration_payment_details_completed",
  "registration_billing_completed",
  "registration_waitlist_submitted",
  "registration_waitlist_joined",
  "registration_waitlist_failed",
  "registration_invitation_decline_submitted",
  "registration_invitation_declined",
  "registration_invitation_decline_failed",
  "registration_group_request_submitted",
  "registration_group_request_succeeded",
  "registration_group_request_failed",
  "registration_requested_payment_started",
  "registration_requested_payment_ready",
  "registration_requested_payment_failed",
  "registration_portal_loaded",
  "registration_portal_failed",
  "registration_material_open_requested",
  "registration_material_opened",
  "registration_material_open_failed",
  "registration_success_viewed",
] as const;
export type RegistrationEvent = (typeof REGISTRATION_EVENTS)[number];
const EVENT_NAMES = new Set<string>(REGISTRATION_EVENTS);
const PROPERTY_NAMES = new Set([
  "course_id",
  "class_session_id",
  "order_id",
  "offering_state",
  "delivery_mode",
  "attendee_count",
  "registering_self",
  "has_coupon",
  "selected_count",
  "waived_count",
  "total_cents",
  "tax_cents",
  "currency",
  "payment_source",
  "status",
  "reason",
  "has_search",
  "has_date",
  "view",
  "result_count",
  "is_more",
  "material_kind",
  "error_stage",
  "attempt",
  "source",
  "schema_version",
  "environment",
]);
export function registrationProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        PROPERTY_NAMES.has(key) &&
        (typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)) ||
          (typeof value === "string" && value.length <= 200))
    )
  );
}
/** Rebuild the envelope on private routes: SDK super-properties can contain URLs and PII. */
export function privateAnalyticsProperties(
  event: string,
  properties: Record<string, unknown>
) {
  if (
    !(
      EVENT_NAMES.has(event) ||
      event === "$identify" ||
      event === "otp_verified"
    )
  ) {
    return null;
  }
  const safe = registrationProperties(properties);
  for (const key of [
    // The browser batch transport reads the project token from event properties.
    "token",
    "$lib",
    "$lib_version",
    "$lib_custom_api_host",
    "distinct_id",
    "$device_id",
    "$session_id",
    "$window_id",
    "$anon_distinct_id",
  ]) {
    const value = properties[key];
    if (typeof value === "string" && value.length <= 200) {
      safe[key] = value;
    }
  }
  return { ...safe, $process_person_profile: event === "$identify" };
}

/** Drop top-level person mutations as well as URL-bearing SDK properties. */
export function privateAnalyticsEvent(event: CaptureResult) {
  const properties = privateAnalyticsProperties(event.event, event.properties);
  return properties
    ? {
        uuid: event.uuid,
        event: event.event,
        timestamp: event.timestamp,
        properties,
      }
    : null;
}
