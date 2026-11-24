/**
 * Parses a pasted roster for an independent session. One student per line,
 * fields separated by commas, tabs, or semicolons, in any order:
 *   Jane Doe, jane@example.com, 555-123-4567
 *   jane@example.com\tJane\tDoe
 *   Doe, Jane, jane@example.com      (read as first "Doe", last "Jane")
 * A header row such as "First name, Last name, Email" is ignored.
 */
const EMAIL = /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+$/u;
const PHONE = /^\+?[\d\s().-]{7,}$/u;
const SPLIT = /[\t,;]+/u;
const WHITESPACE = /\s+/u;
const LINES = /\r?\n/u;
const QUOTES = /^["'<]+|["'>]+$/gu;
const HEADER = /^(first|last|name|full name|student|email)\b/iu;

export type PastedStudent = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  issue?: string;
};

export function parseStudentLine(line: string): PastedStudent | null {
  const fields = line
    .split(SPLIT)
    .map((field) => field.replace(QUOTES, "").trim())
    .filter(Boolean);
  if (!fields.length) {
    return null;
  }
  if (HEADER.test(fields[0] ?? "") && !fields.some((f) => EMAIL.test(f))) {
    return null;
  }
  let email = "";
  let phone = "";
  const names: string[] = [];
  for (const field of fields) {
    if (!email && EMAIL.test(field)) {
      email = field.toLowerCase();
    } else if (!phone && PHONE.test(field)) {
      phone = field;
    } else {
      names.push(field);
    }
  }
  const [first = "", ...rest] =
    names.length === 1 ? (names[0] ?? "").split(WHITESPACE) : names;
  const student = {
    firstName: first,
    lastName: rest.join(" "),
    email,
    phone,
  };
  if (!email) {
    return { ...student, issue: "Missing email" };
  }
  if (!(student.firstName && student.lastName)) {
    return { ...student, issue: "Needs a first and last name" };
  }
  return student;
}

export function parseStudents(input: string, existingEmails: string[] = []) {
  const seen = new Set(existingEmails.map((e) => e.toLowerCase()));
  const rows: PastedStudent[] = [];
  for (const line of input.split(LINES)) {
    const row = parseStudentLine(line);
    if (!row) {
      continue;
    }
    if (row.email && seen.has(row.email) && !row.issue) {
      row.issue = "Already on this roster";
    }
    seen.add(row.email);
    rows.push(row);
  }
  return rows;
}
