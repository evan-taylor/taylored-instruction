import { createElement } from "react";
import { renderEmailHtml } from "../../emails/components/render";
import { PHONE } from "../../emails/components/theme";
import TransactionalEmail from "../../emails/TransactionalEmail";
import { renderSubject } from "./domain";

type EmailDetail = { label: string; value: string };
type EmailContent = {
  title: string;
  preview: string;
  paragraphs: string[];
  details?: EmailDetail[];
  action?: { label: string; url: string };
  note?: string;
  code?: string;
};

const PARAGRAPHS = /\n+/u;

/** Only web links are allowed in email actions. */
export function emailUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Email links must use HTTP or HTTPS");
  }
  return url.href;
}

export function emailParagraphs(body: string) {
  return body
    .split(PARAGRAPHS)
    .map((line) => line.trim())
    .filter(Boolean);
}

const AMOUNT_LABELS = new Set(["Payment waived", "Subtotal", "Sales tax"]);
const TOTAL_LABELS = new Set(["Total paid", "Invoice total"]);

/** Renders the shared transactional template with a plain-text twin. */
export function brandedEmail(content: EmailContent) {
  const details = content.details ?? [];
  const total = details.find(({ label }) => TOTAL_LABELS.has(label));
  const amounts = details.filter(({ label }) => AMOUNT_LABELS.has(label));
  const html = renderEmailHtml(
    createElement(TransactionalEmail, {
      title: content.title,
      preview: content.preview,
      paragraphs: content.paragraphs,
      code: content.code,
      amounts: total || amounts.length ? { rows: amounts, total } : undefined,
      action: content.action && {
        label: content.action.label,
        url: emailUrl(content.action.url),
      },
      details: details.filter(
        (detail) => detail !== total && !amounts.includes(detail)
      ),
      note: content.note,
    })
  );
  const text = [
    content.title,
    ...content.paragraphs,
    content.code,
    ...details.map(({ label, value }) => `${label}: ${value}`),
    content.action
      ? `${content.action.label}: ${content.action.url}`
      : undefined,
    content.note,
    `Questions? Reply to this email or call ${PHONE.label}.`,
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
