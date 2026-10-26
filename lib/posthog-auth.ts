import posthog from "posthog-js";

let pendingOtp = false;
export function markOtpVerification(pending: boolean) {
  pendingOtp = pending;
}
export function captureVerifiedOtp(userId: string) {
  if (!pendingOtp) {
    return;
  }
  pendingOtp = false;
  posthog.identify(userId);
  posthog.capture("otp_verified");
}
