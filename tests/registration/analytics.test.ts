import posthog from "posthog-js";
import { afterEach, expect, it, vi } from "vitest";
import {
  captureVerifiedOtp,
  markOtpVerification,
} from "../../lib/posthog-auth";
import {
  registrationAnalyticsContext,
  trackRegistration,
} from "../../lib/registration-analytics";
import {
  privateAnalyticsEvent,
  privateAnalyticsProperties,
  registrationProperties,
} from "../../shared/registration/analytics";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    has_opted_out_capturing: vi.fn(),
    get_distinct_id: vi.fn(() => "browser-id"),
    get_session_id: vi.fn(() => "session-id"),
  },
}));
afterEach(() => {
  vi.clearAllMocks();
  markOtpVerification(false);
});
it("strips URLs, replay, form data, tokens, errors and SDK super properties on private routes", () => {
  const props = {
    distinct_id: "browser-id",
    $session_id: "session-id",
    order_id: "order-id",
    total_cents: 1200,
    requestKey: "secret",
    $current_url: "https://example.test/registration/payment?key=secret",
    $referrer: "secret",
    $set: { email: "student@example.test" },
    answers: ["private"],
    error: "private",
  };
  expect(privateAnalyticsProperties("registration_submitted", props)).toEqual({
    distinct_id: "browser-id",
    $session_id: "session-id",
    order_id: "order-id",
    total_cents: 1200,
    $process_person_profile: false,
  });
  for (const event of [
    "$snapshot",
    "$autocapture",
    "$pageview",
    "$exception",
    "registration_unreviewed_event",
  ]) {
    expect(privateAnalyticsProperties(event, props)).toBeNull();
  }
});
it("preserves identity linking while excluding person traits on private routes", () => {
  expect(
    privateAnalyticsProperties("$identify", {
      distinct_id: "user",
      $anon_distinct_id: "anonymous",
      $set: { email: "private" },
    })
  ).toEqual({
    distinct_id: "user",
    $anon_distinct_id: "anonymous",
    $process_person_profile: true,
  });
});
it("rejects arbitrary property payloads and non-finite amounts", () => {
  expect(
    registrationProperties({
      total_cents: Number.NaN,
      attendee_count: Number.POSITIVE_INFINITY,
      order_id: "x".repeat(201),
      status: { email: "private" },
      has_coupon: true,
    })
  ).toEqual({ has_coupon: true });
});
it("identifies before recording a verified OTP and records it only once", () => {
  markOtpVerification(true);
  captureVerifiedOtp("verified-user");
  captureVerifiedOtp("verified-user");
  expect(posthog.identify).toHaveBeenCalledWith("verified-user");
  expect(posthog.capture).toHaveBeenCalledTimes(1);
  expect(vi.mocked(posthog.identify).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(posthog.capture).mock.invocationCallOrder[0]
  );
});
it("propagates browser identity and respects opt-out", () => {
  expect(registrationAnalyticsContext()).toEqual({
    distinctId: "browser-id",
    sessionId: "session-id",
  });
  vi.mocked(posthog.has_opted_out_capturing).mockReturnValueOnce(true);
  expect(registrationAnalyticsContext()).toBeUndefined();
});
it("never lets a capture failure interrupt registration", () => {
  vi.mocked(posthog.capture).mockImplementationOnce(() => {
    throw new Error("offline");
  });
  expect(() => trackRegistration("registration_submitted")).not.toThrow();
});

it("removes top-level person mutation fields from the SDK envelope", () => {
  const event = privateAnalyticsEvent({
    uuid: "event-id",
    event: "$identify",
    properties: { distinct_id: "user", $anon_distinct_id: "anonymous" },
    $set: { email: "private" },
    $set_once: { $initial_current_url: "https://example.test?key=secret" },
    $unset: ["email"],
  });
  expect(event?.uuid).toBe("event-id");
  expect(event).not.toHaveProperty("$set");
  expect(event).not.toHaveProperty("$set_once");
  expect(event).not.toHaveProperty("$unset");
});
