/** Display helpers shared by registration screens. Money lives in shared/registration/domain. */
const WHITESPACE = /\s+/u;

export function formatDateTime(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(ms));
}
export function formatDate(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(ms));
}
export function formatTime(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    timeZone,
  }).format(new Date(ms));
}
export function formatWeekday(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(ms));
}
/** "Mon, Oct 20 · 9:00 AM – 1:00 PM" in the session's zone. */
export function formatMeeting(
  meeting: { start: number; end: number },
  timeZone?: string
) {
  return `${formatWeekday(meeting.start, timeZone)} · ${formatTime(meeting.start, timeZone)} – ${formatTime(meeting.end, timeZone)}`;
}
export function formatRelative(ms: number, now = Date.now()) {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (abs >= size || unit === "minute") {
      return formatter.format(Math.round(diff / size), unit);
    }
  }
  return formatter.format(0, "minute");
}
export function shortZone(timeZone: string, at = Date.now()) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(new Date(at))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}
/** Converts an epoch to the value a datetime-local input expects in a zone. */
export function toLocalInput(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
/** Converts a datetime-local value interpreted in a zone back to an epoch. */
export function fromLocalInput(value: string, timeZone: string) {
  const [date, time] = value.split("T");
  if (!(date && time)) {
    return Number.NaN;
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = Date.UTC(
    year ?? 0,
    (month ?? 1) - 1,
    day ?? 1,
    hour ?? 0,
    minute ?? 0
  );
  // Two-pass correction for the zone offset, which handles DST transitions.
  const offsetAt = (ms: number) => {
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const get = (type: string) =>
      Number(local.find((p) => p.type === type)?.value ?? 0);
    return (
      Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second")
      ) - ms
    );
  };
  const first = guess - offsetAt(guess);
  return guess - offsetAt(first);
}
export function initials(name: string) {
  return name
    .split(WHITESPACE)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`
) {
  return `${count} ${count === 1 ? singular : plural}`;
}
