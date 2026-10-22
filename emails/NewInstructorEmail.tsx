import { Details, Paragraph, PrimaryButton, Title } from "./components/blocks";
import { EmailLayout, FooterText } from "./components/layout";
import { SITE_URL } from "./components/theme";

type NewInstructorEmailProps = {
  userId: string;
  email?: string;
};

export default function NewInstructorEmail({
  userId,
  email,
}: NewInstructorEmailProps) {
  return (
    <EmailLayout
      footer={
        <FooterText>
          Sent when someone creates an instructor account.
        </FooterText>
      }
      preview={`${email ?? "Someone"} signed up and is waiting for approval.`}
    >
      <Title>New instructor signup</Title>
      <Paragraph>
        Someone created an instructor account. Approve it to give them access to
        eCards and instructor resources.
      </Paragraph>
      <PrimaryButton href={`${SITE_URL}/admin/instructors`}>
        Review instructors
      </PrimaryButton>
      <Details
        rows={[
          { label: "Email", value: email ?? "Not provided" },
          { label: "User ID", value: userId },
        ]}
      />
    </EmailLayout>
  );
}

NewInstructorEmail.PreviewProps = {
  userId: "k57d2x9q4m1n8b3c6v0z",
  email: "jordan@example.com",
} satisfies NewInstructorEmailProps;
