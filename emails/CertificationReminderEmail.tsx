import {
  Details,
  Note,
  Paragraph,
  PrimaryButton,
  Title,
} from "./components/blocks";
import { EmailLayout } from "./components/layout";

export type CertificationReminderEmailProps = {
  name: string;
  certification: string;
  agency: string;
  number?: string;
  expiresOn: string;
  daysLeft: number;
  profileUrl: string;
};

export function certificationReminderSubject({
  certification,
  daysLeft,
}: Pick<CertificationReminderEmailProps, "certification" | "daysLeft">) {
  if (daysLeft < 0) {
    return `Your ${certification} certification has expired`;
  }
  if (daysLeft === 0) {
    return `Your ${certification} certification expires today`;
  }
  return `Your ${certification} certification expires in ${daysLeft} days`;
}

function lead(daysLeft: number, expiresOn: string) {
  if (daysLeft < 0) {
    return `It expired on ${expiresOn}. Until it is renewed, you can't teach courses that require it.`;
  }
  if (daysLeft === 0) {
    return `It expires today, ${expiresOn}. Renew it to keep teaching courses that require it.`;
  }
  return `It expires on ${expiresOn}, ${daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}. Renewing early keeps your teaching schedule open.`;
}

/** Sent at 90, 30 and 7 days before an instructor certification expires, and on the day. */
export default function CertificationReminderEmail({
  name,
  certification,
  agency,
  number,
  expiresOn,
  daysLeft,
  profileUrl,
}: CertificationReminderEmailProps) {
  const subject = certificationReminderSubject({ certification, daysLeft });
  return (
    <EmailLayout preview={lead(daysLeft, expiresOn)}>
      <Title>{subject}</Title>
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Your {agency} {certification} certification is on file with Taylored
        Instruction. {lead(daysLeft, expiresOn)}
      </Paragraph>
      <Details
        rows={[
          { label: "Certification", value: certification },
          { label: "Agency", value: agency },
          ...(number ? [{ label: "Certificate ID", value: number }] : []),
          { label: "Expires", value: expiresOn },
        ]}
      />
      <PrimaryButton href={profileUrl}>Update my certification</PrimaryButton>
      <Note>
        Once you renew, enter the new expiration date and upload the new card on
        your account page. That stops these reminders for the old card.
      </Note>
    </EmailLayout>
  );
}

CertificationReminderEmail.PreviewProps = {
  name: "Jordan",
  certification: "BLS Instructor",
  agency: "American Heart Association",
  number: "AHA-2231-0045",
  expiresOn: "Feb 21, 2027",
  daysLeft: 30,
  profileUrl: "https://tayloredinstruction.com/my-account#certifications",
} satisfies CertificationReminderEmailProps;
