import {
  type DetailRow,
  Details,
  Quote,
  TextLink,
  Title,
} from "./components/blocks";
import { smsConsent } from "./components/format";
import { EmailLayout, FooterText } from "./components/layout";

type ContactFormEmailProps = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  otherLocation?: string;
  message: string;
  smsOptIn?: boolean;
  smsOptOut?: boolean;
  contactMethods?: string[];
};

export default function ContactFormEmail({
  firstName,
  lastName,
  email,
  phone,
  location,
  otherLocation,
  message,
  smsOptIn,
  smsOptOut,
  contactMethods = [],
}: ContactFormEmailProps) {
  const rows: DetailRow[] = [
    {
      label: "Email",
      value: <TextLink href={`mailto:${email}`}>{email}</TextLink>,
    },
  ];
  if (phone) {
    rows.push({
      label: "Phone",
      value: <TextLink href={`tel:${phone}`}>{phone}</TextLink>,
    });
  }
  rows.push(
    {
      label: "Location",
      value:
        (location === "Other" && otherLocation ? otherLocation : location) ||
        "Not provided",
    },
    {
      label: "Preferred contact",
      value: contactMethods.join(", ") || "Not specified",
    },
    { label: "Text messages", value: smsConsent(smsOptIn, smsOptOut) }
  );
  return (
    <EmailLayout
      footer={
        <FooterText>
          Sent from the contact form on tayloredinstruction.com. Reply to answer{" "}
          {firstName} directly.
        </FooterText>
      }
      preview={message.slice(0, 120)}
    >
      <Title>
        New message from {firstName} {lastName}
      </Title>
      <Quote>{message}</Quote>
      <Details rows={rows} />
    </EmailLayout>
  );
}

ContactFormEmail.PreviewProps = {
  firstName: "Jordan",
  lastName: "Reyes",
  email: "jordan@example.com",
  phone: "(360) 555-0142",
  location: "Vancouver, WA",
  message:
    "Hi! We’re a dental office of 12 and need BLS renewal for everyone before March. Could you come on-site on a Saturday?",
  smsOptIn: true,
  contactMethods: ["Email", "Phone"],
} satisfies ContactFormEmailProps;
