import {
  BulletList,
  Note,
  Paragraph,
  PrimaryButton,
  Title,
} from "./components/blocks";
import { EmailLayout } from "./components/layout";

type InstructorInvitationEmailProps = {
  signInUrl: string;
  email: string;
};

export default function InstructorInvitationEmail({
  signInUrl,
  email,
}: InstructorInvitationEmailProps) {
  return (
    <EmailLayout preview="Sign in and accept your invitation to unlock instructor tools.">
      <Title>You’re invited to teach with Taylored Instruction</Title>
      <Paragraph>
        Sign in with <strong>{email}</strong>, then choose “Accept invitation”
        on your account page. Once you accept, you can:
      </Paragraph>
      <BulletList
        items={[
          "Open your assigned sessions and rosters",
          "Buy digital eCards for your students",
          "Reach instructor resources and documentation",
        ]}
      />
      <PrimaryButton href={signInUrl}>Sign in and accept</PrimaryButton>
      <Note>
        No password needed: we email you a one-time code when you sign in. The
        invitation only works for the address above.
      </Note>
      <Paragraph>
        Welcome aboard,
        <br />
        Evan Taylor
      </Paragraph>
    </EmailLayout>
  );
}

InstructorInvitationEmail.PreviewProps = {
  signInUrl: "https://tayloredinstruction.com/my-account",
  email: "jordan@example.com",
} satisfies InstructorInvitationEmailProps;
