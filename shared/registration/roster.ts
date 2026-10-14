/**
 * Parses pasted group rosters. Accepts one attendee per line in any of:
 *   Jane Doe, jane@example.com
 *   jane@example.com, Jane Doe
 *   Jane Doe <jane@example.com>
 *   Jane Doe\tjane@example.com
 *   jane@example.com            (name missing; flagged)
 * A header row such as "Name, Email" is ignored.
 */
const EMAIL = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/u;
const SPLIT = /[\t,;]+|\s<|>\s*|\s{2,}/u;
const HEADER = /^(name|first|last|full name|attendee)\b/iu;
const QUOTES = /^["']|["']$/gu;
const ANGLES = /[<>]/gu;
const LINES = /\r?\n/u;

export type RosterRow = {
  key: string;
  name: string;
  email: string;
  issue?: string;
};

function clean(value: string) {
  return value.replace(QUOTES, "").replace(ANGLES, "").trim();
}

export function parseRosterLine(line: string, key: string): RosterRow | null {
  const trimmed = line.trim();
  if (!trimmed || HEADER.test(trimmed)) {
    return null;
  }
  const match = trimmed.match(EMAIL);
  const email = match?.[0]?.toLowerCase() ?? "";
  const remainder = match ? trimmed.replace(match[0], " ") : trimmed;
  const name = remainder
    .split(SPLIT)
    .map(clean)
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!email) {
    return { key, name, email: "", issue: "Missing email" };
  }
  if (!name) {
    return { key, name: "", email, issue: "Missing name" };
  }
  return { key, name, email };
}

export function parseRoster(input: string, keyFor: (index: number) => string) {
  const rows: RosterRow[] = [];
  const seen = new Map<string, number>();
  for (const [index, line] of input.split(LINES).entries()) {
    const row = parseRosterLine(line, keyFor(index));
    if (!row) {
      continue;
    }
    if (row.email) {
      const count = (seen.get(row.email) ?? 0) + 1;
      seen.set(row.email, count);
      if (count > 1) {
        row.issue = "Duplicate email in roster";
      }
    }
    rows.push(row);
  }
  return rows;
}

export function rosterSummary(rows: RosterRow[]) {
  const ready = rows.filter((r) => !r.issue);
  return {
    total: rows.length,
    ready: ready.length,
    problems: rows.length - ready.length,
  };
}
