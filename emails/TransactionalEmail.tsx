import {
  Amounts,
  Code,
  type DetailRow,
  Details,
  Note,
  Paragraph,
  PrimaryButton,
  Title,
} from "./components/blocks";
import { EmailLayout } from "./components/layout";

export type TransactionalEmailProps = {
  title: string;
  preview: string;
  paragraphs: string[];
  code?: string;
  amounts?: { rows: DetailRow[]; total?: DetailRow };
  action?: { label: string; url: string };
  details?: DetailRow[];
  note?: string;
};

/**
 * Sign-in codes, access links, and registration mail sent from Convex.
 * Rendered synchronously by `brandedEmail` in shared/registration/email.ts.
 */
export default function TransactionalEmail({
  title,
  preview,
  paragraphs,
  code,
  amounts,
  action,
  details,
  note,
}: TransactionalEmailProps) {
  return (
    <EmailLayout preview={preview}>
      <Title>{title}</Title>
      {paragraphs.map((paragraph) => (
        <Paragraph key={paragraph}>{paragraph}</Paragraph>
      ))}
      {code ? <Code>{code}</Code> : null}
      {amounts ? <Amounts {...amounts} /> : null}
      {action ? (
        <PrimaryButton href={action.url}>{action.label}</PrimaryButton>
      ) : null}
      {details?.length ? <Details rows={details} /> : null}
      {note ? <Note>{note}</Note> : null}
    </EmailLayout>
  );
}

TransactionalEmail.PreviewProps = {
  title: "You’re registered",
  preview: "BLS Provider (AHA). Open your registration portal.",
  paragraphs: [
    "Hi Jordan, your place is confirmed. Your class details are below. Please review your materials before class.",
  ],
  action: {
    label: "Open your registration portal",
    url: "https://tayloredinstruction.com/registrations",
  },
  details: [
    { label: "Course", value: "BLS Provider (AHA)" },
    { label: "Attendee", value: "Jordan Reyes" },
    {
      label: "Your schedule",
      value:
        "Saturday, November 14, 2026 at 9:00 AM – 1:00 PM (America/Los_Angeles)\n2101 E 4th Plain Blvd, Vancouver, WA",
    },
  ],
  note: "Your calendar invitation is attached.",
} satisfies TransactionalEmailProps;
