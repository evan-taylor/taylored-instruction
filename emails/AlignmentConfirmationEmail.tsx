import { Paragraph, Title } from "./components/blocks";
import { EmailLayout } from "./components/layout";

type AlignmentConfirmationEmailProps = {
  firstName: string;
};

export default function AlignmentConfirmationEmail({
  firstName,
}: AlignmentConfirmationEmailProps) {
  return (
    <EmailLayout preview="We received your alignment request and will be in touch soon.">
      <Title>Thanks for your interest in aligning with us</Title>
      <Paragraph>
        Hi {firstName}, we received your request to align with Taylored
        Instruction as an instructor.
      </Paragraph>
      <Paragraph>
        We’ll review your details and reach out soon to talk through next steps.
        If anything changes in the meantime, just reply to this email.
      </Paragraph>
      <Paragraph>
        Thanks,
        <br />
        The Taylored Instruction team
      </Paragraph>
    </EmailLayout>
  );
}

AlignmentConfirmationEmail.PreviewProps = {
  firstName: "Jordan",
} satisfies AlignmentConfirmationEmailProps;
