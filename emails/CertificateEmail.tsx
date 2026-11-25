import { Section } from "react-email";
import {
  Code,
  type DetailRow,
  Details,
  Note,
  Paragraph,
  PrimaryButton,
  TextLink,
  Title,
} from "./components/blocks";
import { EmailLayout } from "./components/layout";

export type EmailAsk = { text: string; label: string; url: string };

export type CertificateEmailProps = {
  title: string;
  preview: string;
  paragraphs: string[];
  details: DetailRow[];
  code?: { label: string; value: string };
  action: { label: string; url: string };
  howTo?: string;
  secondary?: { label: string; url: string };
  asksIntro?: string;
  asks?: EmailAsk[];
  closing: string[];
  signature?: string[];
  unsubscribeUrl?: string;
};

function SignatureLines({ lines }: { lines: string[] }) {
  return (
    <Paragraph>
      {lines.map((line, index) => (
        <span key={line}>
          {index ? <br /> : null}
          {line}
        </span>
      ))}
    </Paragraph>
  );
}

/**
 * The post-class certificate note and the expiry reminders. Content comes
 * from `certificateEmail` in shared/registration/certificate-email.ts.
 */
export default function CertificateEmail({
  title,
  preview,
  paragraphs,
  details,
  code,
  action,
  howTo,
  secondary,
  asksIntro,
  asks,
  closing,
  signature,
  unsubscribeUrl,
}: CertificateEmailProps) {
  return (
    <EmailLayout preview={preview} unsubscribeUrl={unsubscribeUrl}>
      <Title>{title}</Title>
      {paragraphs.map((paragraph) => (
        <Paragraph key={paragraph}>{paragraph}</Paragraph>
      ))}
      <Details rows={details} />
      {code ? (
        <>
          <Note>{code.label}</Note>
          <Code>{code.value}</Code>
        </>
      ) : null}
      <PrimaryButton href={action.url}>{action.label}</PrimaryButton>
      <Section style={{ marginBottom: "28px" }}>
        {howTo ? <Note>{howTo}</Note> : null}
        {secondary ? (
          <Note>
            <TextLink href={secondary.url}>{secondary.label}</TextLink>
          </Note>
        ) : null}
      </Section>
      {asks?.length && asksIntro ? <Paragraph>{asksIntro}</Paragraph> : null}
      {asks?.map((ask, index) => (
        <Paragraph key={ask.url}>
          {asks.length > 1 && asksIntro ? `${index + 1}. ` : ""}
          {ask.text} <TextLink href={ask.url}>{ask.label}</TextLink>
        </Paragraph>
      ))}
      {closing.map((line) => (
        <Paragraph key={line}>{line}</Paragraph>
      ))}
      {signature?.length ? <SignatureLines lines={signature} /> : null}
    </EmailLayout>
  );
}

CertificateEmail.PreviewProps = {
  title: "Thank you, Jordan!",
  preview: "Your BLS Provider eCard is ready to claim.",
  paragraphs: [
    "Hi Jordan,",
    "Thank you for your time during BLS Provider on September 13, 2026!",
  ],
  details: [
    {
      label: "Certificate",
      value: "BLS Provider · American Heart Association",
    },
    { label: "Valid through", value: "September 30, 2028" },
  ],
  code: { label: "Your eCard code", value: "123456789012" },
  action: {
    label: "Claim your AHA eCard",
    url: "https://ecards.heart.org/student/myecards",
  },
  closing: ["It was a pleasure meeting you. Have a fantastic day!"],
  signature: ["Best,", "Evan Taylor", "Taylored Instruction"],
} satisfies CertificateEmailProps;
