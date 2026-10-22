/** Registration defaults to test mode until explicitly configured for production. */
export function registrationIsLive() {
  const mode = process.env.REGISTRATION_MODE ?? "test";
  if (mode !== "test" && mode !== "live") {
    throw new Error("REGISTRATION_MODE must be test or live");
  }
  if (
    mode === "live" &&
    process.env.REGISTRATION_ALLOW_TEST_FIXTURES === "true"
  ) {
    throw new Error(
      "Test fixtures cannot be enabled in live registration mode"
    );
  }
  return mode === "live";
}

export function registrationStripeKey() {
  const mode = registrationIsLive() ? "live" : "test";
  const key = process.env.STRIPE_SECRET_KEY;
  if (!(key?.startsWith(`sk_${mode}_`) || key?.startsWith(`rk_${mode}_`))) {
    throw new Error(`Configure STRIPE_SECRET_KEY with a ${mode} key`);
  }
  return key;
}

export function assertRegistrationPaymentMode(live: boolean) {
  if (live !== registrationIsLive()) {
    throw new Error("Payment mode does not match REGISTRATION_MODE");
  }
}

export function registrationRecipient(intendedRecipient: string) {
  if (registrationIsLive()) {
    return intendedRecipient;
  }
  const recipient = process.env.REGISTRATION_TEST_RECIPIENT;
  if (!recipient) {
    throw new Error("Configure REGISTRATION_TEST_RECIPIENT in test mode");
  }
  return recipient;
}
