import type { ReactNode } from "react";
import { Button, Heading, Link, Section, Text } from "react-email";
import { colors } from "./theme";

type Children = { children: ReactNode };

export type DetailRow = { label: string; value: ReactNode };

export function Title({ children }: Children) {
  return (
    <Heading as="h1" style={styles.title}>
      {children}
    </Heading>
  );
}

export function Paragraph({ children }: Children) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

/** Secondary guidance: expiry, privacy, and what to do if it wasn't you. */
export function Note({ children }: Children) {
  return <Text style={styles.note}>{children}</Text>;
}

export function TextLink({ href, children }: Children & { href: string }) {
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

export function PrimaryButton({ href, children }: Children & { href: string }) {
  return (
    <Section style={styles.buttonRow}>
      <Button href={href} style={styles.button}>
        {children}
      </Button>
    </Section>
  );
}

/** A one-time code, large enough to read across the room from a laptop. */
export function Code({ children }: Children) {
  return (
    <Section style={styles.codeBox}>
      <Text style={styles.code}>{children}</Text>
    </Section>
  );
}

/** Someone else's words, such as a contact form message. */
export function Quote({ children }: Children) {
  return <Text style={styles.quote}>{children}</Text>;
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={styles.list}>
      {items.map((item) => (
        <li key={item} style={styles.listItem}>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Labelled facts as a real table so screen readers announce each label.
 * Cells stack label-over-value; clients that ignore `display` fall back
 * to two columns.
 */
export function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <table cellPadding={0} cellSpacing={0} style={styles.table} width="100%">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" style={styles.detailLabel}>
              {row.label}
            </th>
            <td style={styles.detailValue}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Line items with right-aligned amounts and an emphasized total. */
export function Amounts({
  rows,
  total,
}: {
  rows: DetailRow[];
  total?: DetailRow;
}) {
  return (
    <Section style={styles.amountsBox}>
      <table
        cellPadding={0}
        cellSpacing={0}
        style={styles.amountsTable}
        width="100%"
      >
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" style={styles.amountLabel}>
                {row.label}
              </th>
              <td align="right" style={styles.amountValue}>
                {row.value}
              </td>
            </tr>
          ))}
          {total ? (
            <tr>
              <th scope="row" style={styles.totalLabel}>
                {total.label}
              </th>
              <td align="right" style={styles.totalValue}>
                {total.value}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Section>
  );
}

const amountCell = {
  padding: "5px 0",
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: 400,
  verticalAlign: "top",
};
const totalCell = {
  padding: "12px 0 0",
  borderTop: `1px solid ${colors.rule}`,
  fontSize: "16px",
  lineHeight: "24px",
  fontWeight: 600,
  color: colors.ink,
};

const styles = {
  title: {
    margin: "0 0 16px",
    fontSize: "24px",
    lineHeight: "32px",
    fontWeight: 600,
    letterSpacing: "-0.2px",
    color: colors.ink,
  },
  paragraph: {
    margin: "0 0 16px",
    fontSize: "16px",
    lineHeight: "26px",
    color: colors.body,
  },
  note: {
    margin: "24px 0 0",
    fontSize: "14px",
    lineHeight: "22px",
    color: colors.muted,
  },
  link: { color: colors.primary, textDecoration: "underline" },
  buttonRow: { margin: "28px 0" },
  button: {
    display: "inline-block",
    boxSizing: "border-box" as const,
    padding: "12px 22px",
    borderRadius: "6px",
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: 600,
    textDecoration: "none",
  },
  codeBox: {
    margin: "24px 0 8px",
    padding: "20px 24px",
    borderRadius: "8px",
    backgroundColor: colors.surface,
    textAlign: "center" as const,
  },
  code: {
    margin: "0",
    // Trailing letter-spacing pushes the digits left; pad the other side.
    paddingLeft: "8px",
    fontSize: "32px",
    lineHeight: "40px",
    fontWeight: 600,
    letterSpacing: "8px",
    color: colors.ink,
    fontVariantNumeric: "tabular-nums",
  },
  quote: {
    margin: "0 0 24px",
    padding: "2px 0 2px 16px",
    borderLeft: `3px solid ${colors.rule}`,
    fontSize: "16px",
    lineHeight: "26px",
    color: colors.ink,
    whiteSpace: "pre-line" as const,
  },
  list: { margin: "0 0 16px", padding: "0 0 0 22px" },
  listItem: {
    margin: "0 0 6px",
    fontSize: "16px",
    lineHeight: "26px",
    color: colors.body,
  },
  table: { borderCollapse: "collapse" as const, margin: "28px 0 0" },
  amountsTable: { borderCollapse: "collapse" as const },
  detailLabel: {
    display: "block",
    padding: "14px 0 2px",
    borderTop: `1px solid ${colors.rule}`,
    fontSize: "13px",
    lineHeight: "20px",
    fontWeight: 400,
    textAlign: "left" as const,
    color: colors.muted,
  },
  detailValue: {
    display: "block",
    padding: "0 0 14px",
    fontSize: "15px",
    lineHeight: "23px",
    color: colors.ink,
    whiteSpace: "pre-line" as const,
    overflowWrap: "anywhere" as const,
  },
  amountsBox: {
    margin: "24px 0 4px",
    padding: "16px 20px",
    borderRadius: "8px",
    backgroundColor: colors.surface,
  },
  amountLabel: {
    ...amountCell,
    textAlign: "left" as const,
    color: colors.body,
  },
  amountValue: {
    ...amountCell,
    color: colors.ink,
    whiteSpace: "nowrap" as const,
    fontVariantNumeric: "tabular-nums",
  },
  totalLabel: { ...totalCell, textAlign: "left" as const },
  totalValue: {
    ...totalCell,
    whiteSpace: "nowrap" as const,
    fontVariantNumeric: "tabular-nums",
  },
};
