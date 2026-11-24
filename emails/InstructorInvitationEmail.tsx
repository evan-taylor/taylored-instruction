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
  /** Independent instructors aligned with our Training Site. */
  aligned?: boolean;
  /** Course titles an aligned instructor is approved to teach. */
  courses?: string[];
};

const BENEFITS = {
  instructor: [
    "Open your assigned sessions and rosters",
    "Buy digital eCards for your students",
    "Reach instructor resources and documentation",
  ],
  aligned: [
    "Schedule your own independent classes",
    "Keep rosters, attendance, and results for each class",
    "Export ARC and AHA rosters to issue cards",
    "Buy digital eCards for your students",
  ],
};

export default function InstructorInvitationEmail({
  signInUrl,
  email,
  aligned = false,
  courses = [],
}: InstructorInvitationEmailProps) {
  return (
    <EmailLayout
      preview={
        aligned
          ? "Sign in and accept your alignment to open the independent instructor portal."
          : "Sign in and accept your invitation to unlock instructor tools."
      }
    >
      <Title>
        {aligned
          ? "Your Taylored Instruction alignment is approved"
          : "You’re invited to teach with Taylored Instruction"}
      </Title>
      {courses.length ? (
        <>
          <Paragraph>You’re approved to teach:</Paragraph>
          <BulletList items={courses} />
        </>
      ) : null}
      <Paragraph>
        Sign in with <strong>{email}</strong>, then choose “Accept invitation”
        on your account page. Once you accept, you can:
      </Paragraph>
      <BulletList items={aligned ? BENEFITS.aligned : BENEFITS.instructor} />
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
