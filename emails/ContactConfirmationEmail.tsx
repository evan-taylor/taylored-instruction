import { Paragraph, PrimaryButton, Title } from "./components/blocks";
import { EmailLayout } from "./components/layout";
import { SITE_URL } from "./components/theme";

type ContactConfirmationEmailProps = {
  firstName: string;
};

export default function ContactConfirmationEmail({
  firstName,
}: ContactConfirmationEmailProps) {
  return (
    <EmailLayout preview="Thanks for reaching out. We’ll reply within one to two business days.">
      <Title>We got your message</Title>
      <Paragraph>
        Hi {firstName}, thanks for reaching out to Taylored Instruction. We’ll
        read your message and reply within one to two business days.
      </Paragraph>
      <Paragraph>
        Looking to book training in the meantime? Our class schedule is always
        up to date.
      </Paragraph>
      <PrimaryButton href={`${SITE_URL}/classes`}>
        See upcoming classes
      </PrimaryButton>
    </EmailLayout>
  );
}

ContactConfirmationEmail.PreviewProps = {
  firstName: "Jordan",
} satisfies ContactConfirmationEmailProps;
