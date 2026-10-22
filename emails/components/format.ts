/** How a form submitter answered the text-message consent checkboxes. */
export function smsConsent(smsOptIn?: boolean, smsOptOut?: boolean) {
  if (smsOptIn) {
    return "Opted in";
  }
  return smsOptOut ? "Opted out" : "Not opted in";
}
