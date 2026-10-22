import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertRegistrationPaymentMode,
  registrationIsLive,
  registrationRecipient,
  registrationStripeKey,
} from "../../shared/registration/environment";

afterEach(() => vi.unstubAllEnvs());

describe("Registration deployment isolation", () => {
  it("defaults to test mode and refuses live credentials and events", () => {
    vi.stubEnv("REGISTRATION_MODE", undefined);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
    expect(registrationIsLive()).toBe(false);
    expect(registrationStripeKey).toThrow("test key");
    expect(() => assertRegistrationPaymentMode(true)).toThrow("Payment mode");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_fixture");
    expect(registrationStripeKey()).toBe("rk_test_fixture");
    expect(() => assertRegistrationPaymentMode(false)).not.toThrow();
  });
  it("requires live credentials and events when production is enabled", () => {
    vi.stubEnv("REGISTRATION_MODE", "live");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    expect(registrationStripeKey).toThrow("live key");
    expect(() => assertRegistrationPaymentMode(false)).toThrow("Payment mode");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
    expect(registrationStripeKey()).toBe("sk_live_fixture");
    expect(() => assertRegistrationPaymentMode(true)).not.toThrow();
  });
  it("redirects test email but delivers production email to its intended recipient", () => {
    vi.stubEnv("REGISTRATION_MODE", "test");
    vi.stubEnv("REGISTRATION_TEST_RECIPIENT", undefined);
    expect(() => registrationRecipient("student@example.test")).toThrow(
      "REGISTRATION_TEST_RECIPIENT"
    );
    vi.stubEnv("REGISTRATION_TEST_RECIPIENT", "tester@example.test");
    expect(registrationRecipient("student@example.test")).toBe(
      "tester@example.test"
    );
    vi.stubEnv("REGISTRATION_MODE", "live");
    expect(registrationRecipient("student@example.test")).toBe(
      "student@example.test"
    );
  });
  it("rejects invalid modes and live deployments with test fixtures", () => {
    vi.stubEnv("REGISTRATION_MODE", "production");
    expect(registrationIsLive).toThrow("test or live");
    vi.stubEnv("REGISTRATION_MODE", "live");
    vi.stubEnv("REGISTRATION_ALLOW_TEST_FIXTURES", "true");
    expect(registrationIsLive).toThrow("Test fixtures");
  });
});
