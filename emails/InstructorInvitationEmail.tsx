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
  /** Accepting makes them teach for us. */
  teaches?: boolean;
  /** Accepting marks them aligned with our Training Site. */
  aligned?: boolean;
};

const TEACHING = [
  "Open your assigned sessions and rosters",
  "Reach instructor resources and documentation",
];
const INDEPENDENT = [
  "Schedule your own independent classes",
  "Keep rosters, attendance, and results for each class",
  "Export ARC and AHA rosters to issue cards",
];

export default function InstructorInvitationEmail({
  signInUrl,
  email,
  teaches = true,
  aligned = false,
}: InstructorInvitationEmailProps) {
  const alignedOnly = aligned && !teaches;
  return (
    <EmailLayout
      preview={
        alignedOnly
          ? "Sign in and accept your alignment to open the independent instructor portal."
          : "Sign in and accept your invitation to unlock instructor tools."
      }
    >
      <Title>
        {alignedOnly
          ? "Your Taylored Instruction alignment is approved"
          : "You’re invited to teach with Taylored Instruction"}
      </Title>
      {aligned ? (
        <Paragraph>
          You’re aligned with our Training Site, so you can run your own classes
          for any of our courses.
        </Paragraph>
      ) : null}
      <Paragraph>
        Sign in with <strong>{email}</strong>, then choose “Accept invitation”
        on your account page. Once you accept, you can:
      </Paragraph>
      <BulletList
        items={[
          ...(teaches ? TEACHING : []),
          ...(aligned ? INDEPENDENT : []),
          "Buy digital eCards for your students",
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
  aligned: true,
} satisfies InstructorInvitationEmailProps;
