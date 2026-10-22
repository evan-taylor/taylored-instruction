/** Enable only after published native offerings and release checks are ready. */
export function nativeRegistrationEnabled() {
  return process.env.NEXT_PUBLIC_NATIVE_REGISTRATION === "true";
}

export function registrationBookingUrl(legacyUrl: string) {
  return nativeRegistrationEnabled() ? "/classes" : legacyUrl;
}
