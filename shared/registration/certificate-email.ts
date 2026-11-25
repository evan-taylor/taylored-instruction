import { createElement } from "react";
import CertificateEmail, {
  type CertificateEmailProps,
  type EmailAsk,
} from "../../emails/CertificateEmail";
import { renderEmailHtml } from "../../emails/components/render";
import { PHONE } from "../../emails/components/theme";
import { COURSE_SURVEY_URLS, GOOGLE_REVIEW_URL } from "../../lib/business";
import {
  AGENCY_LABELS,
  ARC_FIND_CERTIFICATE_URL,
  type CertificateAgency,
  certificateLinks,
  daysUntil,
  formatCertificateDate,
} from "./student-certificates";

export type CertificateMail = {
  kind: "issued" | "reminder";
  firstName: string;
  course: string;
  agency: CertificateAgency;
  certificateId: string;
  issuedOn: string;
  expiresOn: string;
  instructor?: string;
  /** Ask for a Google review; false when the student was already asked. */
  review: boolean;
  /** Site path to book the matching renewal course. */
  renewPath: string;
  /** Business date the reminder is written for. */
  today?: string;
  unsubscribeToken?: string;
};

const SIGNATURE = ["Best,", "Evan Taylor", "Taylored Instruction"];
export type SurveyUrls = Record<CertificateAgency, string | null>;

export function courseSurveyUrl(
  agency: CertificateAgency,
  surveys: SurveyUrls = COURSE_SURVEY_URLS
) {
  return surveys[agency];
}

function reminderLead(mail: CertificateMail, days: number) {
  const date = formatCertificateDate(mail.expiresOn);
  if (days < 0) {
    return `Your ${mail.course} certificate expired on ${date}. It’s time to renew so you stay certified.`;
  }
  if (days === 0) {
    return `Your ${mail.course} certificate expires today, ${date}. It’s time to renew so you stay certified.`;
  }
  return `Your ${mail.course} certificate expires on ${date}, in ${days} days. It’s time to renew so you stay certified without a gap.`;
}

function reminderTitle(mail: CertificateMail, days: number) {
  if (days < 0) {
    return `Your ${mail.course} certificate has expired`;
  }
  return days === 0
    ? `Your ${mail.course} certificate expires today`
    : `Your ${mail.course} certificate expires in ${days} days`;
}

function certificateDetails(mail: CertificateMail) {
  return [
    {
      label: "Certificate",
      value: `${mail.course} · ${AGENCY_LABELS[mail.agency]}`,
    },
    ...(mail.agency === "arc"
      ? [{ label: "Certificate ID", value: mail.certificateId }]
      : []),
    { label: "Issued", value: formatCertificateDate(mail.issuedOn) },
    { label: "Valid through", value: formatCertificateDate(mail.expiresOn) },
  ];
}

function ahaCode(mail: CertificateMail) {
  return mail.agency === "aha"
    ? { label: "Your eCard code", value: mail.certificateId }
    : undefined;
}

function reminderContent(
  mail: CertificateMail,
  origin: string,
  name: string,
  unsubscribeUrl: string | undefined
) {
  const days = daysUntil(mail.today ?? mail.expiresOn, mail.expiresOn);
  const title = reminderTitle(mail, days);
  const links = certificateLinks(mail.agency, mail.certificateId);
  return {
    subject: title,
    title,
    preview: reminderLead(mail, days),
    paragraphs: [`Hi ${name},`, reminderLead(mail, days)],
    details: certificateDetails(mail),
    code: ahaCode(mail),
    action: {
      label: "Book your renewal class",
      url: new URL(mail.renewPath, origin).href,
    },
    howTo:
      "Renewal classes fill up, so booking a few weeks ahead keeps your card current. Reply to this email if you’d like help picking a date.",
    secondary: { label: links.view.label, url: links.view.url },
    closing: ["Thanks for training with Taylored Instruction!"],
    signature: SIGNATURE,
    unsubscribeUrl,
  };
}

/**
 * Evan's post-class note, one student at a time: thanks, where the card is,
 * then the anonymous survey and a Google review.
 */
function issuedContent(
  mail: CertificateMail,
  name: string,
  surveyUrl: string | null
) {
  const classDate = formatCertificateDate(mail.issuedOn);
  const review = mail.review ? GOOGLE_REVIEW_URL : null;
  const links = certificateLinks(mail.agency, mail.certificateId);
  const shared = {
    details: certificateDetails(mail),
    code: ahaCode(mail),
    action: links.view,
    signature: SIGNATURE,
  };
  if (mail.agency === "aha") {
    const asks: EmailAsk[] = [
      ...(surveyUrl
        ? [
            {
              text: "If you could take a moment to complete this anonymous course feedback survey. It’s quick and should only take about a minute.",
              label: "Take the anonymous survey",
              url: surveyUrl,
            },
          ]
        : []),
      ...(review
        ? [
            {
              text: "I’d be incredibly grateful if you could leave a review for us on Google. Your feedback is one of the best ways to support our growth, and it only takes a moment of your time!",
              label: "Leave a review here",
              url: review,
            },
          ]
        : []),
    ];
    return {
      ...shared,
      subject: `Your ${mail.course} eCard is ready to claim`,
      title: `Thank you, ${name}!`,
      preview: `Thank you for your time in ${mail.course}. Your eCard is ready to claim.`,
      paragraphs: [
        `Hi ${name},`,
        `Thank you for your time during ${mail.course} on ${classDate}! Your eCard has been processed, and you should have received an email from the American Heart Association with directions to claim your card. If you didn’t receive that email or have any questions, please feel free to reach out to us.`,
      ],
      howTo: links.howTo,
      asksIntro:
        asks.length > 1
          ? "If you have a moment, I’d truly appreciate your help with two things:"
          : "If you have a moment, I’d truly appreciate your help:",
      asks,
      closing: ["It was a pleasure meeting you. Have a fantastic day!"],
    };
  }
  const asks: EmailAsk[] = [
    ...(surveyUrl
      ? [
          {
            text: "If you have a moment, I’d be so grateful for your help if you could provide feedback on the class by completing this anonymous survey (it takes less than 2 minutes). Your input is super helpful in helping us improve the course, and we read every submission!",
            label: "Take the anonymous survey",
            url: surveyUrl,
          },
        ]
      : []),
    ...(review
      ? [
          {
            text: "And if you enjoyed the class, I’d be incredibly grateful for a review on Google. It’s one of the best ways to support a small local business like ours, and it only takes a moment!",
            label: "Leave a review here",
            url: review,
          },
        ]
      : []),
  ];
  return {
    ...shared,
    subject: `Your ${mail.course} certificate is ready`,
    title: `Thank you, ${name}!`,
    preview: `Thank you for your hard work in ${mail.course}. Your Red Cross certificate is ready.`,
    paragraphs: [
      `Hi ${name},`,
      `Thank you for all your hard work during ${mail.course} on ${classDate}! We’ve just finished processing your certification, and you should have received an email from the Red Cross with your certificate attached. You can also view and download it any time with the button below, by logging into your Red Cross Learning Center account, or on Find My Certificate with your certificate ID.`,
    ],
    action: { label: "View your Red Cross certificate", url: links.view.url },
    secondary: {
      label: "Red Cross Find My Certificate",
      url: ARC_FIND_CERTIFICATE_URL,
    },
    asks,
    closing: [
      "If there is anything we can ever help with, feel free to reach out. We are always happy to help.",
    ],
  };
}

/** What each certificate email says, for both the HTML and the text part. */
export function certificateEmailContent(
  mail: CertificateMail,
  origin: string,
  surveys: SurveyUrls = COURSE_SURVEY_URLS
): CertificateEmailProps & { subject: string } {
  const name = mail.firstName.trim() || "there";
  if (mail.kind === "reminder") {
    const unsubscribeUrl = mail.unsubscribeToken
      ? `${origin}/unsubscribe?token=${encodeURIComponent(mail.unsubscribeToken)}`
      : undefined;
    return reminderContent(mail, origin, name, unsubscribeUrl);
  }
  return issuedContent(mail, name, courseSurveyUrl(mail.agency, surveys));
}

/** Renders a certificate email with its plain-text twin. */
export function certificateEmail(
  mail: CertificateMail,
  origin: string,
  surveys: SurveyUrls = COURSE_SURVEY_URLS
) {
  const { subject, ...content } = certificateEmailContent(
    mail,
    origin,
    surveys
  );
  const html = renderEmailHtml(createElement(CertificateEmail, content));
  const text = [
    content.title,
    ...content.paragraphs,
    ...content.details.map(({ label, value }) => `${label}: ${value}`),
    content.code ? `${content.code.label}: ${content.code.value}` : undefined,
    `${content.action.label}: ${content.action.url}`,
    content.howTo,
    content.secondary
      ? `${content.secondary.label}: ${content.secondary.url}`
      : undefined,
    content.asks?.length ? content.asksIntro : undefined,
    ...(content.asks ?? []).map(
      (ask) => `${ask.text} ${ask.label}: ${ask.url}`
    ),
    ...content.closing,
    content.signature?.join("\n"),
    `Questions? Reply to this email or call ${PHONE.label}.`,
    "Taylored Instruction LLC",
    content.unsubscribeUrl
      ? `Unsubscribe from reminder and marketing emails: ${content.unsubscribeUrl}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject, html, text, unsubscribeUrl: content.unsubscribeUrl };
}
