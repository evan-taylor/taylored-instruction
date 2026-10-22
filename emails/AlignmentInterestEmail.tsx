import {
  type DetailRow,
  Details,
  Quote,
  TextLink,
  Title,
} from "./components/blocks";
import { smsConsent } from "./components/format";
import { EmailLayout, FooterText } from "./components/layout";

type AlignmentInterestEmailProps = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hasCertification: "Yes" | "No";
  agencies?: string[];
  message?: string;
  smsOptIn?: boolean;
  smsOptOut?: boolean;
};

export default function AlignmentInterestEmail({
  firstName,
  lastName,
  email,
  phone,
  hasCertification,
  agencies,
  message,
  smsOptIn,
  smsOptOut,
}: AlignmentInterestEmailProps) {
  const rows: DetailRow[] = [
    {
      label: "Email",
      value: <TextLink href={`mailto:${email}`}>{email}</TextLink>,
    },
    {
      label: "Phone",
      value: <TextLink href={`tel:${phone}`}>{phone}</TextLink>,
    },
    { label: "Holds an instructor certification", value: hasCertification },
  ];
  if (hasCertification === "Yes" && agencies?.length) {
    rows.push({ label: "Agencies", value: agencies.join(", ") });
  }
  rows.push({ label: "Text messages", value: smsConsent(smsOptIn, smsOptOut) });
  return (
    <EmailLayout
      footer={
        <FooterText>
          Sent from the alignment form on tayloredinstruction.com. Reply to
          answer {firstName} directly.
        </FooterText>
      }
      preview={`${firstName} ${lastName} wants to align as an instructor.`}
    >
      <Title>
        Alignment request from {firstName} {lastName}
      </Title>
      {message ? <Quote>{message}</Quote> : null}
      <Details rows={rows} />
    </EmailLayout>
  );
}

AlignmentInterestEmail.PreviewProps = {
  firstName: "Jordan",
  lastName: "Reyes",
  email: "jordan@example.com",
  phone: "(360) 555-0142",
  hasCertification: "Yes",
  agencies: ["American Heart Association", "American Red Cross"],
  message:
    "I’ve taught BLS for six years and would like to align with your training center.",
} satisfies AlignmentInterestEmailProps;
