import { createElement } from "react";
import { renderEmailHtml } from "../../emails/components/render";
import { PHONE } from "../../emails/components/theme";
import TransactionalEmail from "../../emails/TransactionalEmail";
import { renderSubject } from "./domain";
import { EmailBody, emailBodyText } from "./email-body";

type EmailDetail = { label: string; value: string };
type EmailContent = {
  title: string;
  preview: string;
  paragraphs: string[];
  body?: string;
  variables?: Record<string, string>;
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
      body: content.body
        ? createElement(EmailBody, {
            body: content.body,
            variables: content.variables,
          })
        : undefined,
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
    content.body
      ? emailBodyText(content.body, content.variables ?? {})
      : undefined,
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
 * details appended. The portal button lands on the sign-in form, which emails
 * a one-time code to the registered address.
 */
export function registrationEmail(job: RenderableJob, origin: string) {
  const portal = `${origin}/registrations`;
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
      paragraphs: [],
      body: job.body,
      variables,
      details,
      action: primaryAction,
      note: [
        job.calendar
          ? "Your calendar invitation is attached. Add it to your calendar to keep the class time and location handy."
          : "",
        "To open your portal, sign in with the email address you registered with. We’ll send a one-time code; no password needed.",
      ]
        .filter(Boolean)
        .join(" "),
    }),
  };
}
