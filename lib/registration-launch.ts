/** Enable only after published native offerings and release checks are ready. */
export function registrationBookingUrl(legacyUrl: string) {
  return process.env.NEXT_PUBLIC_NATIVE_REGISTRATION === "true"
    ? "/classes"
    : legacyUrl;
}
