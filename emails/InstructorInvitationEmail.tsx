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
  /** Courses they are aligned with our Training Site for; empty when not aligned. */
  courses?: string[];
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
  courses = [],
}: InstructorInvitationEmailProps) {
  const aligned = courses.length > 0;
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
        <>
          <Paragraph>You’re aligned with our Training Site to teach:</Paragraph>
          <BulletList items={courses} />
        </>
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
  courses: ["BLS Provider"],
} satisfies InstructorInvitationEmailProps;
