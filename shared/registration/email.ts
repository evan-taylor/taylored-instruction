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

/** Table layout and inline styles keep the essential design usable in Outlook. */
export function brandedEmail(content: EmailContent) {
  const details = content.details ?? [];
  const rows = details
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:12px 16px;border-bottom:1px solid #e4eaf0;font-size:13px;color:#526477;vertical-align:top;width:34%">${escapeHtml(label)}</td><td style="padding:12px 16px;border-bottom:1px solid #e4eaf0;font-size:15px;line-height:1.5;font-weight:600;color:#173b5c;white-space:pre-line;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#42566b">${escapeHtml(paragraph)}</p>`
    )
    .join("");
  const action = content.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 18px"><tr><td bgcolor="#163f69" style="border-radius:8px"><a href="${emailUrl(content.action.url)}" style="display:inline-block;padding:16px 24px;border:1px solid #163f69;border-radius:8px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(content.action.label)} &rarr;</a></td></tr></table><p style="font-size:12px;line-height:1.6;color:#64748b;overflow-wrap:anywhere;word-break:break-all">Button not working? <a href="${emailUrl(content.action.url)}" style="color:#163f69;text-decoration:underline">Open this link</a> in your browser.</p>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(content.title)}</title><style>@media(max-width:620px){.outer{padding:16px 8px!important}.content{padding:28px 22px!important}.headline{font-size:28px!important}}</style></head><body style="margin:0;padding:0;background:#f1f5f8;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(content.preview)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="outer" align="center" style="padding:40px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px"><tr><td style="padding:0 8px 24px"><span style="font-size:21px;letter-spacing:-0.5px;font-weight:800;color:#163f69">TAYLORED<span style="color:#457c86"> / </span>INSTRUCTION</span><div style="margin-top:6px;font-size:12px;color:#61758a;letter-spacing:1px">CPR · BLS · FIRST AID TRAINING</div></td></tr><tr><td class="content" bgcolor="#ffffff" style="padding:38px;border:1px solid #e0e7ef;border-top:5px solid #397c86;border-radius:12px"><p style="margin:0 0 12px;font-size:12px;line-height:1.5;font-weight:700;letter-spacing:1.5px;color:#397580;text-transform:uppercase">${escapeHtml(content.eyebrow)}</p><h1 class="headline" style="margin:0 0 24px;font-size:32px;line-height:1.2;letter-spacing:-0.8px;color:#173b5c">${escapeHtml(content.title)}</h1>${paragraphs}${content.code ? `<div style="margin:26px 0;padding:24px 12px;background:#eef4f8;border:1px solid #d9e5ee;border-radius:10px;text-align:center;font-family:monospace;font-size:38px;font-weight:700;letter-spacing:8px;color:#163f69">${escapeHtml(content.code)}</div>` : ""}${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f7f9fb;border:1px solid #e4eaf0;border-radius:8px">${rows}</table>` : ""}${action}${content.note ? `<p style="margin:22px 0 0;padding-top:20px;border-top:1px solid #e4eaf0;font-size:13px;line-height:1.6;color:#64748b">${escapeHtml(content.note)}</p>` : ""}</td></tr><tr><td style="padding:24px 8px;font-size:13px;line-height:1.7;color:#61758a"><strong style="color:#173b5c">Here to help.</strong> Questions about your training or payment?<br>Reply to this email or contact <a href="mailto:info@tayloredinstruction.com" style="color:#163f69">info@tayloredinstruction.com</a><br><a href="tel:+13606588199" style="color:#163f69">(360) 658-8199</a><p style="margin:18px 0 0;font-size:11px;color:#7b8c9c">Taylored Instruction LLC<br>This is a service email about your account or registration.</p></td></tr></table></td></tr></table></body></html>`;
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
/** Renders a queued job into a safe subject and HTML body with structural details appended. */
export function registrationEmail(job: RenderableJob, origin: string) {
  const variables = {
    attendeeName: job.name,
    courseTitle: job.title,
    meetingDates: job.schedule,
    materials: job.materials
      .map((m) => `${m.title}: ${m.url ?? "Open portal"}`)
      .join("\n"),
    portalLink: `${origin}/registrations`,
  };
  const subject = renderSubject(job.subject, variables);
  const invitationPath = job.body.match(INVITATION_PATH)?.[1];
  const primaryAction = job.link
    ? { ...job.link, url: new URL(job.link.url, origin).href }
    : {
        label: "Open your registration portal",
        url: `${origin}/registrations`,
      };
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
    "Payment receipt": "Your payment receipt.",
    "Registration confirmed": "You’re registered.",
    Invoice: "Your training invoice.",
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
      note: job.calendar
        ? "Your calendar invitation is attached. Add it to your calendar, and check the portal for the latest joining instructions. Need a change? Reply and we’ll help."
        : "Use the email address you registered with to access your portal. For registration changes or billing questions, reply and we’ll help.",
    }),
  };
}
