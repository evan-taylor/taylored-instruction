import { escapeHtml, renderSubject } from "./domain";

type EmailDetail = { label: string; value: string };
type EmailContent = {
  eyebrow: string;
  title: string;
  preview: string;
  paragraphs: string[];
  details?: EmailDetail[];
  action?: { label: string; url: string };
  note?: string;
  code?: string;
};

const PARAGRAPHS = /\n+/u;

/** Only web links are allowed in email actions; never interpolate raw HTML. */
export function emailUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Email links must use HTTP or HTTPS");
  }
  return escapeHtml(url.href);
}

export function emailParagraphs(body: string) {
  return body
    .split(PARAGRAPHS)
    .map((line) => line.trim())
    .filter(Boolean);
}

// Use the public PNG already served by the production site. The renderer stays
// synchronous so the same template works in Convex Auth's non-Node runtime.
const BRAND = {
  logo: "https://tayloredinstruction.com/horizontal-logo-black.png",
  ink: "#192224",
  muted: "#555d60",
  red: "#b8231b",
  rule: "#deded9",
  paper: "#f3f2ee",
};

/** Fluid tables and inline pixel styles preserve the layout in email clients. */
export function brandedEmail(content: EmailContent) {
  const details = content.details ?? [];
  const total = details.find(({ label }) =>
    ["Total paid", "Invoice total"].includes(label)
  );
  const rows = details
    .filter((detail) => detail !== total)
    .map(
      ({ label, value }) =>
        `<tr><th scope="row" align="left" style="padding:13px 12px 13px 0;border-bottom:1px solid ${BRAND.rule};font-size:14px;line-height:21px;font-weight:400;color:${BRAND.muted};vertical-align:top;width:32%">${escapeHtml(label)}</th><td style="padding:13px 0;border-bottom:1px solid ${BRAND.rule};font-size:15px;line-height:23px;color:${BRAND.ink};white-space:pre-line;overflow-wrap:break-word;word-break:break-word">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${BRAND.muted}">${escapeHtml(paragraph)}</p>`
    )
    .join("");
  const action = content.action
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0"><tr><td align="center" bgcolor="${BRAND.red}" style="border:1px solid ${BRAND.red};border-radius:3px;mso-padding-alt:16px 20px"><a href="${emailUrl(content.action.url)}" style="display:block;box-sizing:border-box;padding:16px 20px;font-size:16px;line-height:22px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(content.action.label)}</a></td></tr></table>`
    : "";
  const summary = total
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:2px solid ${BRAND.ink};border-bottom:1px solid ${BRAND.rule}"><tr><td style="padding:20px 0"><p style="margin:0 0 5px;font-size:14px;color:${BRAND.muted}">${escapeHtml(total.label)}</p><p style="margin:0;font-size:38px;line-height:44px;font-weight:700;letter-spacing:-1px;color:${BRAND.ink}">${escapeHtml(total.value)}</p></td></tr></table>`
    : "";
  const code = content.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:2px solid ${BRAND.ink};border-bottom:1px solid ${BRAND.rule}"><tr><td style="padding:24px 0"><p style="margin:0 0 10px;font-size:14px;color:${BRAND.muted}">Your one-time code</p><p style="margin:0;font-family:Consolas,monospace;font-size:32px;line-height:40px;letter-spacing:6px;font-weight:700;color:${BRAND.ink}">${escapeHtml(content.code)}</p></td></tr></table>`
    : "";
  const html = `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.title)}</title></head>
<body style="margin:0;padding:0;background-color:${BRAND.paper};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};-webkit-text-size-adjust:100%">
<div lang="en" dir="ltr" style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(content.preview.slice(0, 90))}</div>
<table lang="en" dir="ltr" role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.paper}"><tr><td align="center" style="padding:24px 12px">
<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;border-top:4px solid ${BRAND.red}">
<tr><td style="padding:28px 24px 24px;border-bottom:1px solid ${BRAND.rule}"><a href="https://tayloredinstruction.com" style="text-decoration:none"><img src="${BRAND.logo}" alt="Taylored Instruction" width="238" height="70" style="display:block;width:238px;max-width:100%;height:auto;border:0;background-color:#ffffff;color:${BRAND.ink};font-size:18px"></a></td></tr>
<tr><td style="padding:32px 24px 28px">
<p style="margin:0 0 12px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND.red}">${escapeHtml(content.eyebrow)}</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.6px;color:${BRAND.ink}">${escapeHtml(content.title)}</h1>
${paragraphs}${summary}${code}${action}
${rows ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse"><caption style="text-align:left;padding:0 0 8px;font-size:16px;line-height:24px;font-weight:700;color:${BRAND.ink}">${total ? "Transaction details" : "Your training details"}</caption>${rows}</table>` : ""}
${content.note ? `<p style="margin:24px 0 0;font-size:14px;line-height:22px;color:${BRAND.muted}">${escapeHtml(content.note)}</p>` : ""}
</td></tr>
<tr><td style="padding:24px;border-top:1px solid ${BRAND.rule}"><p style="margin:0 0 6px;font-size:16px;line-height:24px;font-weight:700;color:${BRAND.ink}">Questions? We’re here to help.</p><p style="margin:0;font-size:14px;line-height:23px;color:${BRAND.muted}">Reply to this email or call <a href="tel:+13606588199" style="color:${BRAND.ink};text-decoration:underline">(360) 658-8199</a>.<br><a href="mailto:info@tayloredinstruction.com" style="color:${BRAND.ink};text-decoration:underline">info@tayloredinstruction.com</a></p></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px"><tr><td style="padding:20px 24px;font-size:12px;line-height:20px;color:${BRAND.muted}">Taylored Instruction LLC<br>Health &amp; safety training · Washington
${content.action ? `<p style="margin:12px 0 0">If the button doesn’t open, <a href="${emailUrl(content.action.url)}" style="color:${BRAND.ink};text-decoration:underline">${escapeHtml(content.action.label.toLowerCase())}</a> using this link.</p>` : ""}
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  const text = [
    content.title,
    ...content.paragraphs,
    content.code,
    ...details.map(({ label, value }) => `${label}: ${value}`),
    content.action
      ? `${content.action.label}: ${content.action.url}`
      : undefined,
    content.note,
    "Questions? Reply to this email or contact info@tayloredinstruction.com | (360) 658-8199.",
    "Taylored Instruction LLC",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}

const INVITATION_PATH =
  /Register at (\/s\/[A-Za-z0-9_-]+#invitation=[A-Za-z0-9-]+)/u;
/** How long the sign-in button in a transactional email keeps working. */
export const MAGIC_LINK_MS = 7 * 24 * 60 * 60 * 1000;
export const MAGIC_LINK_DAYS = MAGIC_LINK_MS / 86_400_000;

/** True when the email's button is the portal itself rather than an invoice or invitation. */
export function usesPortalAction(job: { body: string; link?: unknown }) {
  return !(job.link || INVITATION_PATH.test(job.body));
}

type RenderableJob = {
  body: string;
  subject: string;
  name: string;
  title: string;
  schedule: string;
  materials: { title: string; url: string | null }[];
  link?: { label: string; url: string };
  details: { label: string; value: string }[];
  category: string;
  calendar?: string;
};
/**
 * Renders a queued job into a safe subject and HTML body with structural
 * details appended. `portalUrl` is a one-time sign-in link for the recipient;
 * without it the button lands on the portal's request form.
 */
export function registrationEmail(
  job: RenderableJob,
  origin: string,
  portalUrl?: string
) {
  const portal = portalUrl ?? `${origin}/registrations`;
  const variables = {
    attendeeName: job.name,
    courseTitle: job.title,
    meetingDates: job.schedule,
    materials: job.materials
      .map((m) => `${m.title}: ${m.url ?? "Open portal"}`)
      .join("\n"),
    portalLink: portal,
  };
  const subject = renderSubject(job.subject, variables);
  const invitationPath = job.body.match(INVITATION_PATH)?.[1];
  const primaryAction = job.link
    ? { ...job.link, url: new URL(job.link.url, origin).href }
    : { label: "Open your registration portal", url: portal };
  if (invitationPath) {
    primaryAction.label = "Review your reserved opening";
    primaryAction.url = origin + invitationPath;
  }
  const details = [...job.details];
  if (job.schedule) {
    details.push({ label: "Your schedule", value: job.schedule });
  }
  if (job.materials.length) {
    details.push({
      label: "Ready in your portal",
      value: job.materials.map((m) => m.title).join("\n"),
    });
  }
  const headlines: Record<string, string> = {
    "Payment receipt": "Payment received",
    "Registration confirmed": "You’re registered",
    Invoice: "Your training invoice",
  };
  return {
    subject,
    ...brandedEmail({
      eyebrow: job.category,
      title: headlines[job.category] ?? subject,
      preview: `${job.title}. ${primaryAction.label}.`,
      paragraphs: emailParagraphs(renderSubject(job.body, variables)),
      details,
      action: primaryAction,
      note: [
        job.calendar
          ? "Your calendar invitation is attached. Add it to your calendar to keep the class time and location handy."
          : "",
        portalUrl
          ? `The button signs you in without a password and works for ${MAGIC_LINK_DAYS} days. Keep this email private. After that, request a new link with the email address you registered with.`
          : "Use the email address you registered with to access your registration.",
      ]
        .filter(Boolean)
        .join(" "),
    }),
  };
}
