import type { ReactNode } from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import { colors, fontFamily, PHONE, READEX_PRO_WOFF2, SITE_URL } from "./theme";

type EmailLayoutProps = {
  preview: string;
  children: ReactNode;
  /** Replaces the customer support line, e.g. on internal notifications. */
  footer?: ReactNode;
};

/** Logo, one content column, and a quiet footer shared by every email. */
export function EmailLayout({ preview, children, footer }: EmailLayoutProps) {
  return (
    <Html dir="ltr" lang="en">
      <Head>
        <Font
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          fontFamily="Readex Pro"
          fontWeight="400 700"
          webFont={{ url: READEX_PRO_WOFF2, format: "woff2" }}
        />
      </Head>
      <Body style={styles.body}>
        <Preview>{preview}</Preview>
        <Container style={styles.container}>
          <Link href={SITE_URL}>
            <Img
              alt="Taylored Instruction"
              height={35}
              src={`${SITE_URL}/email/logo.png`}
              style={styles.logo}
              width={160}
            />
          </Link>
          <Section style={styles.content}>{children}</Section>
          <Hr style={styles.rule} />
          {footer ?? (
            <FooterText>
              Questions? Reply to this email or call{" "}
              <Link href={PHONE.href} style={styles.footerLink}>
                {PHONE.label}
              </Link>
              .
            </FooterText>
          )}
          <FooterText>
            Taylored Instruction LLC ·{" "}
            <Link href={SITE_URL} style={styles.footerLink}>
              tayloredinstruction.com
            </Link>
          </FooterText>
        </Container>
      </Body>
    </Html>
  );
}

export function FooterText({ children }: { children: ReactNode }) {
  return <Text style={styles.footer}>{children}</Text>;
}

const styles = {
  body: {
    margin: "0",
    backgroundColor: colors.white,
    color: colors.body,
    fontFamily,
  },
  container: {
    maxWidth: "560px",
    padding: "40px 24px 32px",
  },
  logo: { display: "block", border: "0" },
  content: { padding: "36px 0 0" },
  rule: {
    border: "none",
    borderTop: `1px solid ${colors.rule}`,
    margin: "32px 0 20px",
  },
  footer: {
    margin: "0 0 6px",
    fontSize: "13px",
    lineHeight: "20px",
    color: colors.muted,
  },
  footerLink: { color: colors.muted, textDecoration: "underline" },
};
