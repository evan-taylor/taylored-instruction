export const CERTIFICATION_AGENCIES = [
  { value: "arc", label: "American Red Cross" },
  { value: "aha", label: "American Heart Association" },
  { value: "other", label: "Other" },
] as const;

export type CertificationAgency =
  (typeof CERTIFICATION_AGENCIES)[number]["value"];

export const CERTIFICATION_TYPES = [
  { value: "bls-instructor", label: "BLS Instructor" },
  { value: "fa-cpr-aed-instructor", label: "First Aid/CPR/AED Instructor" },
  { value: "lifeguarding-instructor", label: "Lifeguarding Instructor" },
  {
    value: "lifeguarding-instructor-trainer",
    label: "Lifeguarding Instructor Trainer",
  },
  { value: "water-safety-instructor", label: "Water Safety Instructor" },
  { value: "acls-instructor", label: "ACLS Instructor" },
  { value: "pals-instructor", label: "PALS Instructor" },
  { value: "heartsaver-instructor", label: "Heartsaver Instructor" },
  { value: "instructor-trainer", label: "Instructor Trainer" },
  { value: "other", label: "Other" },
] as const;

export type CertificationType = (typeof CERTIFICATION_TYPES)[number]["value"];

/** Days before expiration that each reminder goes out; 0 is the expiration day. */
export const REMINDER_THRESHOLDS = [90, 30, 7, 0] as const;
export type ReminderThreshold = (typeof REMINDER_THRESHOLDS)[number];

/** A day-of reminder still goes out if the daily job missed a few days. */
const EXPIRED_CATCH_UP_DAYS = 7;

export const CERTIFICATION_TIME_ZONE = "America/Los_Angeles";

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_MS = 86_400_000;

export function isCalendarDate(value: string) {
  if (!DATE.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Today's calendar date at the business's home time zone, as YYYY-MM-DD. */
export function certificationToday(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CERTIFICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysUntil(expiresOn: string, today: string) {
  return Math.round(
    (Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS
  );
}

export type CertificationStatus = "valid" | "expiring" | "expired";

/** A certification is good through its expiration date and expired the day after. */
export function certificationStatus(
  expiresOn: string,
  today: string,
  expiringWithinDays = 90
): CertificationStatus {
  const days = daysUntil(expiresOn, today);
  if (days < 0) {
    return "expired";
  }
  return days <= expiringWithinDays ? "expiring" : "valid";
}

/**
 * The reminder owed today, if any: the most urgent threshold already reached.
 * Earlier thresholds that were skipped (a certification added 20 days out)
 * are never sent late, so each threshold goes out at most once.
 */
export function dueReminderThreshold(
  expiresOn: string,
  today: string
): ReminderThreshold | null {
  const days = daysUntil(expiresOn, today);
  if (days < -EXPIRED_CATCH_UP_DAYS) {
    return null;
  }
  return (
    [...REMINDER_THRESHOLDS].reverse().find((threshold) => days <= threshold) ??
    null
  );
}

export function agencyLabel(agency: string, other?: string) {
  if (agency === "other") {
    return other?.trim() || "Other agency";
  }
  return (
    CERTIFICATION_AGENCIES.find((option) => option.value === agency)?.label ??
    agency
  );
}

export function agencyShortLabel(agency: string, other?: string) {
  if (agency === "arc") {
    return "ARC";
  }
  if (agency === "aha") {
    return "AHA";
  }
  return agencyLabel(agency, other);
}

export function typeLabel(type: string, other?: string) {
  if (type === "other") {
    return other?.trim() || "Other certification";
  }
  return (
    CERTIFICATION_TYPES.find((option) => option.value === type)?.label ?? type
  );
}

export function formatCertificationDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

export function reminderLabel(threshold: number) {
  return threshold === 0 ? "Expiration day" : `${threshold} days before`;
}

export type ReportCertification = {
  userId: string;
  agency: string;
  agencyOther?: string;
  type: string;
  typeOther?: string;
  expiresOn: string;
  superseded?: boolean;
};

export type ReportFilter = {
  userId?: string;
  agency?: string;
  type?: string;
  status?: "all" | "valid" | "expiring" | "expired";
  withinDays: number;
};

/** Narrows the staff report; "expiring" means expiring within the chosen number of days. */
export function filterCertifications<T extends ReportCertification>(
  rows: T[],
  filter: ReportFilter,
  today: string
) {
  return rows.filter(
    (row) =>
      !(row.superseded && filter.status && filter.status !== "all") &&
      (!filter.userId || row.userId === filter.userId) &&
      (!filter.agency || row.agency === filter.agency) &&
      (!filter.type || row.type === filter.type) &&
      (!filter.status ||
        filter.status === "all" ||
        certificationStatus(row.expiresOn, today, filter.withinDays) ===
          filter.status)
  );
}

/**
 * Instructors lacking a current (unexpired) certification of the given type,
 * optionally from one agency. An expired card does not count as holding it.
 */
export function instructorsMissing<I extends { userId: string }>(
  instructors: I[],
  rows: ReportCertification[],
  type: string,
  today: string,
  agency?: string
) {
  const holders = new Set(
    rows
      .filter(
        (row) =>
          row.type === type &&
          (!agency || row.agency === agency) &&
          certificationStatus(row.expiresOn, today) !== "expired"
      )
      .map((row) => row.userId)
  );
  return instructors.filter((instructor) => !holders.has(instructor.userId));
}

export function expiringCounts(expirations: string[], today: string) {
  const counts = { expired: 0, within30: 0, within60: 0, within90: 0 };
  for (const expiresOn of expirations) {
    const days = daysUntil(expiresOn, today);
    if (days < 0) {
      counts.expired += 1;
    } else {
      counts.within30 += days <= 30 ? 1 : 0;
      counts.within60 += days <= 60 ? 1 : 0;
      counts.within90 += days <= 90 ? 1 : 0;
    }
  }
  return counts;
}

type Supersedable = {
  id: string;
  userId: string;
  agency: string;
  type: string;
  typeOther?: string;
  expiresOn: string;
};

/**
 * Certifications replaced by a newer card of the same agency and type for the
 * same instructor. Renewing by adding a new card retires the old one from
 * reminders, counts and the digest without deleting its history.
 */
export function supersededIds(rows: Supersedable[]) {
  const latest = new Map<string, Supersedable>();
  for (const row of rows) {
    const key = [
      row.userId,
      row.agency,
      row.type,
      row.type === "other" ? (row.typeOther ?? "").trim().toLowerCase() : "",
    ].join("|");
    const kept = latest.get(key);
    if (!kept || row.expiresOn > kept.expiresOn) {
      latest.set(key, row);
    }
  }
  const current = new Set(Array.from(latest.values(), (row) => row.id));
  return new Set(
    rows.filter((row) => !current.has(row.id)).map((row) => row.id)
  );
}
