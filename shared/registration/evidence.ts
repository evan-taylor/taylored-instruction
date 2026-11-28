import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import { cancellationPolicyUrl } from "../cancellation-policy";
import { formatMoney } from "./domain";

export type EvidenceAcknowledgement = {
  id: string;
  kind: "click-through" | "disclosed";
  channel: string;
  policyVersion: string;
  policyHash: string;
  policySnapshot: string;
  statement: string;
  recordedAt: number;
  purchaserName: string;
  purchaserEmail: string;
  orderId: string;
  seatIds: string[];
  sessionId?: string;
  courseId: string;
  invoiceId?: string;
  actor: string;
  ip: string | null;
  userAgent: string | null;
  digest: string;
  stripeCheckoutSession?: string;
  stripePaymentIntent?: string;
  integrity: { digestMatches: boolean; hashMatches: boolean };
};

export type EvidenceData = {
  generatedAt: number;
  order: {
    id: string;
    title: string;
    courseTitle: string;
    sessionStart?: number;
    sessionTimeZone?: string;
    purchaserName: string;
    purchaserEmail: string;
    status: string;
    total: number;
    tax: number;
    refunded: number;
    createdAt: number;
    settledAt?: number;
    source?: string;
    stripeCheckoutSession?: string;
    stripePaymentIntent?: string;
    seats: { id: string; name: string; email: string; state: string }[];
  };
  acknowledgements: EvidenceAcknowledgement[];
  emails: {
    description: string;
    recipient: string;
    deliveredTo?: string;
    subject: string;
    state: string;
    sentAt?: number;
    providerId?: string;
    deliveryStatus?: string;
    deliveryStatusAt?: number;
    deliveredAt?: number;
    text?: string;
  }[];
};

type Row = [label: string, value: string];
export type EvidenceSection = { title: string; rows?: Row[]; text?: string };

const CHANNELS: Record<string, string> = {
  "registration-form": "Public registration form, before payment",
  "payment-request-page": "Emailed payment page, before payment",
  "staff-booking": "Staff booking, disclosed by confirmation email",
  invoice: "Invoice footer and invoice email",
};

/** UTC plus Pacific time, so the moment is unambiguous. */
export function evidenceTime(timestamp?: number) {
  if (timestamp === undefined) {
    return "Not recorded";
  }
  const pacific = new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "America/Los_Angeles",
  });
  return `${new Date(timestamp).toISOString()} (${pacific})`;
}

function acknowledgementRows(
  ack: EvidenceAcknowledgement,
  origin: string
): Row[] {
  const clickThrough = ack.kind === "click-through";
  return [
    [
      "Type",
      clickThrough
        ? "Click-through agreement: the purchaser checked an unchecked-by-default box"
        : "Disclosure only, not a click-through: the payer did not check a box",
    ],
    ["Where", CHANNELS[ack.channel] ?? ack.channel],
    ["Recorded (server time)", evidenceTime(ack.recordedAt)],
    [clickThrough ? "Checkbox label" : "Disclosure", ack.statement],
    ["Policy version", ack.policyVersion],
    ["Permanent policy URL", cancellationPolicyUrl(origin, ack.policyVersion)],
    ["Policy text SHA-256", ack.policyHash],
    ["Purchaser", `${ack.purchaserName} <${ack.purchaserEmail}>`],
    ["IP address (server-captured)", ack.ip ?? "Not applicable"],
    ["User agent (server-captured)", ack.userAgent ?? "Not applicable"],
    ["Order id", ack.orderId],
    ["Seat ids", ack.seatIds.join(", ") || "None"],
    ["Session id", ack.sessionId ?? "Self-paced, no session"],
    ["Course id", ack.courseId],
    ...(ack.invoiceId ? [["Invoice id", ack.invoiceId] as Row] : []),
    [
      "Recorded by",
      ack.actor === "guest" ? "The purchaser" : `Staff user ${ack.actor}`,
    ],
    ["Stripe Checkout Session", ack.stripeCheckoutSession ?? "None"],
    ["Stripe PaymentIntent", ack.stripePaymentIntent ?? "None"],
    ["Acknowledgement id", ack.id],
    ["Record digest (SHA-256)", ack.digest],
    [
      "Integrity check",
      ack.integrity.digestMatches && ack.integrity.hashMatches
        ? "Passed: the record and policy text match their stored hashes"
        : "FAILED: the stored record no longer matches its hash",
    ],
  ];
}

/** The export's content, in order; the PDF and tests both read this. */
export function evidenceSections(
  data: EvidenceData,
  origin: string
): EvidenceSection[] {
  const { order } = data;
  const sections: EvidenceSection[] = [
    {
      title: "Order",
      rows: [
        ["Order id", order.id],
        ["Course", order.courseTitle],
        ["Class", order.title],
        [
          "Class starts",
          order.sessionStart === undefined
            ? "Self-paced"
            : evidenceTime(order.sessionStart),
        ],
        ["Purchaser", `${order.purchaserName} <${order.purchaserEmail}>`],
        ["Status", order.status],
        [
          "Amount",
          `${formatMoney(order.total + order.tax)} (tax ${formatMoney(order.tax)})`,
        ],
        ["Refunded", formatMoney(order.refunded)],
        ["Created", evidenceTime(order.createdAt)],
        ["Paid", evidenceTime(order.settledAt)],
        ["Payment source", order.source ?? "None"],
        ["Stripe Checkout Session", order.stripeCheckoutSession ?? "None"],
        ["Stripe PaymentIntent", order.stripePaymentIntent ?? "None"],
        [
          "Attendees",
          order.seats
            .map(
              (seat) =>
                `${seat.name} <${seat.email}> (${seat.state}, ${seat.id})`
            )
            .join("\n"),
        ],
      ],
    },
  ];
  if (!data.acknowledgements.length) {
    sections.push({
      title: "Cancellation policy acknowledgement",
      text: "No acknowledgement is recorded for this order. It predates policy agreement at checkout.",
    });
  }
  data.acknowledgements.forEach((ack, index) => {
    sections.push({
      title: `Acknowledgement ${index + 1} of ${data.acknowledgements.length}`,
      rows: acknowledgementRows(ack, origin),
    });
  });
  const versions = new Map(
    data.acknowledgements.map((ack) => [ack.policyVersion, ack.policySnapshot])
  );
  for (const [version, snapshot] of versions) {
    sections.push({
      title: `Policy text shown, version ${version} (exact snapshot)`,
      text: snapshot,
    });
  }
  if (!data.emails.length) {
    sections.push({
      title: "Confirmation email",
      text: "No confirmation or invoice email has been queued for this order.",
    });
  }
  for (const email of data.emails) {
    sections.push({
      title: email.description,
      rows: [
        ["To", email.recipient],
        ["Delivered to", email.deliveredTo ?? email.recipient],
        ["Subject", email.subject],
        ["Send state", email.state],
        ["Sent", evidenceTime(email.sentAt)],
        ["Resend message id", email.providerId ?? "None"],
        [
          "Delivery status",
          email.deliveryStatus
            ? `${email.deliveryStatus} at ${evidenceTime(email.deliveryStatusAt)}`
            : "No delivery event received",
        ],
        ["Delivered", evidenceTime(email.deliveredAt)],
      ],
      text: email.text ?? "The sent copy was not stored for this message.",
    });
  }
  return sections;
}

const PAGE = { width: 612, height: 792, margin: 54 };
const SIZE = 9;
const LEADING = 12.5;
const LABEL_WIDTH = 150;

function encodable(font: PDFFont, text: string) {
  return [...text]
    .map((char) => {
      try {
        font.encodeText(char);
        return char;
      } catch {
        return `[U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}]`;
      }
    })
    .join("");
}

function wrap(font: PDFFont, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of encodable(font, paragraph).split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, SIZE) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
      }
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, SIZE) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Renders the evidence as a paginated, text-searchable PDF. */
export async function evidencePdf(data: EvidenceData, origin: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cancellation policy evidence, order ${data.order.id}`);
  pdf.setAuthor("Taylored Instruction LLC");
  pdf.setCreationDate(new Date(data.generatedAt));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const content = PAGE.width - PAGE.margin * 2;
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;
  const ensure = (height: number) => {
    if (y - height < PAGE.margin) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - PAGE.margin;
    }
  };
  const draw = (text: string, x: number, font: PDFFont, size = SIZE) => {
    page.drawText(text, { x, y, size, font, color: rgb(0.1, 0.12, 0.16) });
  };
  draw("Taylored Instruction LLC", PAGE.margin, bold, 14);
  y -= 20;
  draw(
    "Cancellation policy agreement: dispute evidence",
    PAGE.margin,
    bold,
    12
  );
  y -= 16;
  draw(
    encodable(
      regular,
      `Order ${data.order.id}. Generated ${evidenceTime(data.generatedAt)}.`
    ),
    PAGE.margin,
    regular
  );
  y -= LEADING * 2;
  for (const section of evidenceSections(data, origin)) {
    ensure(LEADING * 3);
    draw(encodable(bold, section.title), PAGE.margin, bold, 11);
    y -= LEADING * 1.4;
    for (const [label, value] of section.rows ?? []) {
      const labels = wrap(bold, label, LABEL_WIDTH - 10);
      const values = wrap(regular, value, content - LABEL_WIDTH);
      const height = Math.max(labels.length, values.length) * LEADING;
      ensure(Math.min(height, LEADING * 4));
      const count = Math.max(labels.length, values.length);
      for (let i = 0; i < count; i += 1) {
        ensure(LEADING);
        draw(labels[i] ?? "", PAGE.margin, bold);
        draw(values[i] ?? "", PAGE.margin + LABEL_WIDTH, regular);
        y -= LEADING;
      }
    }
    if (section.text) {
      y -= section.rows ? LEADING / 2 : 0;
      for (const line of wrap(regular, section.text, content)) {
        ensure(LEADING);
        draw(line, PAGE.margin, regular);
        y -= LEADING;
      }
    }
    y -= LEADING;
  }
  const pages = pdf.getPages();
  pages.forEach((each, index) => {
    each.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE.margin,
      y: PAGE.margin / 2,
      size: 8,
      font: regular,
      color: rgb(0.4, 0.45, 0.5),
    });
  });
  return await pdf.save();
}

/** Draft text for Stripe's dispute evidence fields; never submitted automatically. */
export function disputeEvidenceText(data: EvidenceData, origin: string) {
  const newestFirst = [...data.acknowledgements].reverse();
  const ack =
    newestFirst.find((row) => row.kind === "click-through") ?? newestFirst[0];
  if (!ack) {
    return null;
  }
  const url = cancellationPolicyUrl(origin, ack.policyVersion);
  const receipt = data.emails.find((email) =>
    email.description.startsWith("Purchaser")
  );
  const emailNote = receipt?.sentAt
    ? ` A confirmation email sent to ${receipt.deliveredTo ?? receipt.recipient} on ${evidenceTime(receipt.sentAt)} (delivery status: ${receipt.deliveryStatus ?? "unknown"}) linked to the permanent page for policy version ${ack.policyVersion}; the attached PDF includes that email as sent.`
    : "";
  const disclosure =
    ack.kind === "click-through"
      ? `Before paying, the purchaser (${ack.purchaserName}, ${ack.purchaserEmail}) checked an unchecked-by-default box labeled "${ack.statement}" on our registration page at ${evidenceTime(ack.recordedAt)} from IP address ${ack.ip ?? "unknown"}. Payment could not proceed without it. The key refund terms were shown beside the checkbox and the full policy (version ${ack.policyVersion}) was one click away; it remains published at ${url}.${emailNote} The attached PDF contains the server-side record, the exact policy text shown, and the confirmation email.`
      : `This order was booked by our staff, so the payer did not check an agreement box. Cancellation Policy version ${ack.policyVersion} was disclosed as follows: ${ack.statement} The policy is published at ${url}.${emailNote}`;
  return {
    cancellation_policy_disclosure: disclosure,
    refund_policy_disclosure: disclosure,
    customer_name: data.order.purchaserName,
    customer_email_address: data.order.purchaserEmail,
    customer_purchase_ip: ack.ip ?? undefined,
    product_description: `${data.order.courseTitle}: ${data.order.title} for ${data.order.seats.map((seat) => seat.name).join(", ")}`,
    service_date: data.order.sessionStart
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: data.order.sessionTimeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(data.order.sessionStart)
      : undefined,
  };
}
