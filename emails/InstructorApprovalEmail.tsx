import {
  BulletList,
  Paragraph,
  PrimaryButton,
  TextLink,
  Title,
} from "./components/blocks";
import { EmailLayout } from "./components/layout";
import { SITE_URL } from "./components/theme";

type InstructorApprovalEmailProps = {
  firstName: string;
};

export default function InstructorApprovalEmail({
  firstName,
}: InstructorApprovalEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || SITE_URL;

  return (
    <EmailLayout preview="Your instructor account is approved. Sign in to buy eCards and open instructor resources.">
      <Title>Your instructor account is approved</Title>
      <Paragraph>
        Hi {firstName}, you now have instructor access on the Taylored
        Instruction website. Once you sign in, you can:
      </Paragraph>
      <BulletList
        items={[
          "Buy digital eCards for your students",
          "Open instructor resources and documentation",
          "Manage your instructor account",
        ]}
      />
      <PrimaryButton href={`${baseUrl}/login`}>Sign in</PrimaryButton>
      <Paragraph>
        After signing in, head to the{" "}
        <TextLink href={`${baseUrl}/ecards`}>eCards page</TextLink> to buy
        certification cards for your students.
      </Paragraph>
      <Paragraph>
        Welcome aboard,
        <br />
        Evan Taylor
      </Paragraph>
    </EmailLayout>
  );
}

InstructorApprovalEmail.PreviewProps = {
  firstName: "Jordan",
} satisfies InstructorApprovalEmailProps;
