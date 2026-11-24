import { Text } from "react-email";
import { Note, Paragraph, PrimaryButton, Title } from "./components/blocks";
import { EmailLayout, FooterText } from "./components/layout";
import { colors } from "./components/theme";

export type CertificationDigestRow = {
  instructor: string;
  certification: string;
  expiresOn: string;
  daysLeft: number;
};

export type CertificationDigestEmailProps = {
  rows: CertificationDigestRow[];
  reportUrl: string;
};

function when(daysLeft: number) {
  if (daysLeft < 0) {
    return `expired ${-daysLeft} ${daysLeft === -1 ? "day" : "days"} ago`;
  }
  if (daysLeft === 0) {
    return "expires today";
  }
  return `in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
}

export function certificationDigestSubject(rows: CertificationDigestRow[]) {
  const expired = rows.filter((row) => row.daysLeft < 0).length;
  const upcoming = rows.length - expired;
  const parts = [
    upcoming ? `${upcoming} expiring within 90 days` : "",
    expired ? `${expired} expired` : "",
  ].filter(Boolean);
  return `Instructor certifications: ${parts.join(", ")}`;
}

/** Weekly staff summary of instructor certifications that need renewing. */
export default function CertificationDigestEmail({
  rows,
  reportUrl,
}: CertificationDigestEmailProps) {
  return (
    <EmailLayout
      footer={
        <FooterText>
          Sent every Monday to staff while any certification is expired or
          expires within 90 days.
        </FooterText>
      }
      preview={certificationDigestSubject(rows)}
    >
      <Title>Certifications to renew</Title>
      <Paragraph>
        These instructor certifications have expired or expire within the next
        90 days, soonest first.
      </Paragraph>
      <table cellPadding={0} cellSpacing={0} style={styles.table} width="100%">
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.instructor}-${row.certification}-${row.expiresOn}`}>
              <td style={styles.cell}>
                <Text style={styles.name}>{row.instructor}</Text>
                <Text style={styles.meta}>{row.certification}</Text>
              </td>
              <td style={{ ...styles.cell, ...styles.right }}>
                <Text style={row.daysLeft < 0 ? styles.expired : styles.name}>
                  {when(row.daysLeft)}
                </Text>
                <Text style={styles.meta}>{row.expiresOn}</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PrimaryButton href={reportUrl}>
        Open the certification report
      </PrimaryButton>
      <Note>
        Instructors get their own reminders at 90, 30 and 7 days and on the
        expiration day.
      </Note>
    </EmailLayout>
  );
}

const styles = {
  table: { borderCollapse: "collapse" as const, margin: "8px 0 8px" },
  cell: {
    borderTop: `1px solid ${colors.rule}`,
    padding: "10px 0",
    verticalAlign: "top" as const,
  },
  right: { textAlign: "right" as const, paddingLeft: "16px" },
  name: {
    margin: "0",
    fontSize: "15px",
    lineHeight: "22px",
    color: colors.ink,
  },
  meta: {
    margin: "0",
    fontSize: "13px",
    lineHeight: "20px",
    color: colors.muted,
  },
  expired: {
    margin: "0",
    fontSize: "15px",
    lineHeight: "22px",
    color: "#b42318",
    fontWeight: 600,
  },
};

CertificationDigestEmail.PreviewProps = {
  rows: [
    {
      instructor: "Sam Rivera",
      certification: "ARC Lifeguarding Instructor",
      expiresOn: "Nov 20, 2026",
      daysLeft: -4,
    },
    {
      instructor: "Jordan Lee",
      certification: "AHA BLS Instructor",
      expiresOn: "Dec 1, 2026",
      daysLeft: 7,
    },
  ],
  reportUrl: "https://tayloredinstruction.com/admin/certifications",
} satisfies CertificationDigestEmailProps;
