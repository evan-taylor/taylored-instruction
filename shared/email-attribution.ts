/**
 * UTM tagging for outbound email links, and the click attribution the browser
 * keeps afterwards. Campaigns are static snake_case names; the send id is an
 * opaque job id, never an address or token.
 */

export type EmailAttribution = { campaign: string; send?: string };

/** How long an email click keeps credit for later conversions. */
export const EMAIL_ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const CAMPAIGN = /^[a-z0-9_]{1,64}$/u;
const SEND = /^[A-Za-z0-9_-]{1,64}$/u;
const FIRST_PARTY_DOMAIN = "tayloredinstruction.com";
/** Links that carry credentials or opt-outs are never tagged. */
const UNTRACKED_PATH = /^\/(?:unsubscribe|api\/|email\/)/u;
/** Query keys that can carry credentials or payment references. */
export const SENSITIVE_PARAM =
  /token|secret|signature|session|key|code|invitation|password/iu;
const HREF = /href="([^"]*)"/gu;
const TEXT_URL = /https?:\/\/[^\s<>"]+/gu;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/u;
const AMPERSAND = /&amp;/gu;
const QUOTE = /&quot;/gu;
const APOSTROPHE = /&#x27;/gu;
const RAW_AMPERSAND = /&/gu;
const RAW_QUOTE = /"/gu;

function taggable(url: URL, origin: string) {
  const firstParty =
    url.origin === origin ||
    url.hostname === FIRST_PARTY_DOMAIN ||
    url.hostname.endsWith(`.${FIRST_PARTY_DOMAIN}`);
  if (!firstParty || UNTRACKED_PATH.test(url.pathname)) {
    return false;
  }
  if (url.hash.includes("=")) {
    return false;
  }
  return ![...url.searchParams.keys()].some((key) => SENSITIVE_PARAM.test(key));
}

/** Adds UTM parameters to a first-party link; anything else is returned as is. */
export function attributedUrl(
  value: string,
  attribution: EmailAttribution,
  origin: string
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (
    !(
      (url.protocol === "https:" || url.protocol === "http:") &&
      taggable(url, origin)
    ) ||
    url.searchParams.has("utm_source")
  ) {
    return value;
  }
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", attribution.campaign);
  if (attribution.send) {
    url.searchParams.set("utm_content", attribution.send);
  }
  return url.href;
}

function decodeAttribute(value: string) {
  return value
    .replace(QUOTE, '"')
    .replace(APOSTROPHE, "'")
    .replace(AMPERSAND, "&");
}

function encodeAttribute(value: string) {
  return value.replace(RAW_AMPERSAND, "&amp;").replace(RAW_QUOTE, "&quot;");
}

/** Tags every eligible link in a rendered email and its plain-text twin. */
export function attributeEmail<T extends { html: string; text?: string }>(
  email: T,
  attribution: EmailAttribution,
  origin: string
): T {
  const html = email.html.replace(HREF, (match, href: string) => {
    const decoded = decodeAttribute(href);
    const tagged = attributedUrl(decoded, attribution, origin);
    return tagged === decoded ? match : `href="${encodeAttribute(tagged)}"`;
  });
  const text = email.text?.replace(TEXT_URL, (match) => {
    const trailing = match.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? match.slice(0, -trailing.length) : match;
    return attributedUrl(url, attribution, origin) + trailing;
  });
  return text === undefined ? { ...email, html } : { ...email, html, text };
}

const JOB_CAMPAIGNS: Record<string, string> = {
  confirmation: "registration_confirmation",
  receipt: "payment_receipt",
  "payment-request": "payment_request",
  invoice: "invoice",
  "invoice-reminder": "invoice_reminder",
  offer: "waitlist_offer",
  "group-request": "group_request",
  material: "course_materials",
  assigned: "course_materials",
  shortage: "staff_notice",
  "admin-shortage": "staff_notice",
  cancel: "registration_canceled",
  "cancel-order": "registration_canceled",
  "instructor-cancel": "instructor_notice",
  instructor: "instructor_notice",
  schedule: "schedule_change",
  resend: "registration_resend",
  transfer: "registration_transfer",
  staff: "staff_message",
};

/**
 * The campaign for a queued registration email, from its job key. Post-class
 * certificate mail splits by agency and expiry reminders by stage, so each
 * variant converts separately in analytics.
 */
export function registrationEmailCampaign(
  key: string,
  context: { agency?: "aha" | "arc"; afterClass?: boolean } = {}
) {
  const [kind, , stage] = key.split(":");
  if (kind === "certificate") {
    return `post_class_${context.agency ?? "aha"}`;
  }
  if (kind === "certificate-reminder") {
    return `cert_reminder_${Number.parseInt(stage ?? "0", 10) || 0}d`;
  }
  if (kind === "step") {
    return context.afterClass ? "class_followup" : "class_reminder";
  }
  return JOB_CAMPAIGNS[kind ?? ""] ?? "registration_email";
}

/** The campaign and send id an email link carried, when the visit came from one. */
export function emailClick(search: string): EmailAttribution | null {
  const params = new URLSearchParams(search);
  const campaign = params.get("utm_campaign") ?? "";
  if (params.get("utm_source") !== "email" || !CAMPAIGN.test(campaign)) {
    return null;
  }
  const send = params.get("utm_content") ?? "";
  return SEND.test(send) ? { campaign, send } : { campaign };
}
