const LONG_ID = /\b(?=[a-z0-9]*\d)[a-z0-9]{24,}\b/gu;
const ID_KEY = /id$/iu;

type Titled = { title?: unknown };

function titles(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry: Titled) =>
          typeof entry?.title === "string" ? entry.title : ""
        )
        .filter(Boolean)
        .join(", ")
    : "";
}

function describeObject(data: Record<string, unknown>) {
  const parts: string[] = [];
  const added = titles(data.added);
  const removed = titles(data.removed);
  if (added) {
    parts.push(`Added ${added}`);
  }
  if (removed) {
    parts.push(`Removed ${removed}`);
  }
  for (const [key, value] of Object.entries(data)) {
    if (
      key === "reason" ||
      ID_KEY.test(key) ||
      (typeof value !== "string" && typeof value !== "number")
    ) {
      continue;
    }
    parts.push(`${key}: ${value}`);
  }
  if (typeof data.reason === "string" && data.reason) {
    parts.push(`Reason: ${data.reason}`);
  }
  return parts.join(" · ");
}

/** Shortens a database id for display; the full value belongs in a title or copy button. */
export function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

/** "invoice-paid-offline" → "Invoice paid offline". */
export function activityLabel(action: string) {
  const text = action.replaceAll("-", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Turns a raw audit detail (free text or a JSON payload) into one readable line. */
export function activityDetail(detail: string) {
  if (detail.startsWith("{")) {
    try {
      const summary = describeObject(JSON.parse(detail));
      if (summary) {
        return summary;
      }
    } catch {
      // Not JSON after all; fall through to the plain text.
    }
  }
  const text = detail.replaceAll(LONG_ID, (id) => shortId(id));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
