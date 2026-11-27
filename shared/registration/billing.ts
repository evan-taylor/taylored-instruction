import { v } from "convex/values";

/** How an organization pays for each seat a billing code covers. */
export const billingPricing = v.union(
  v.literal("percent"),
  v.literal("fixed"),
  v.literal("full")
);
export type BillingPricing = "percent" | "fixed" | "full";

export const billingCodeFields = {
  organizationId: v.id("registrationOrganizations"),
  code: v.string(),
  pricing: billingPricing,
  /** Percent off for `percent`, cents per seat for `fixed`, 0 for `full`. */
  amount: v.number(),
  courseIds: v.array(v.id("registrationCourses")),
  expires: v.optional(v.number()),
  limit: v.optional(v.number()),
  /** Seats currently charged to the organization through this code. */
  uses: v.number(),
  active: v.boolean(),
};

export const BUSINESS_TIME_ZONE = "America/Los_Angeles";

function wallClock(at: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const part = (type: string) =>
    Number(parts.find((value) => value.type === type)?.value);
  return Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second")
  );
}

/** The last millisecond of a YYYY-MM-DD date where the business operates. */
export function endOfBusinessDay(date: string, timeZone = BUSINESS_TIME_ZONE) {
  const [year, month, day] = date.split("-").map(Number);
  const midnight = Date.UTC(year, month - 1, day + 1);
  const offset = (at: number) => wallClock(at, timeZone) - at;
  return midnight - offset(midnight - offset(midnight)) - 1;
}

export const chargeState = v.union(
  v.literal("unbilled"),
  v.literal("invoiced"),
  v.literal("void")
);

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,30}[A-Z0-9]$/u;
const NON_ALPHANUMERIC = /[^A-Z0-9]+/gu;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DAY_MS = 86_400_000;
/** The cancellation policy's administrative fee, in cents. */
export const LATE_CHANGE_FEE = 2000;
/** Changes this close to the class keep the administrative fee. */
export const FREE_CHANGE_DAYS = 7;

/** The stored form of a typed code, or null when it isn't a valid code. */
export function normalizeBillingCode(value: string) {
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** A readable code such as ACME-7K3P9Q, prefixed with the organization's name. */
export function generateBillingCode(organizationName: string) {
  const prefix = organizationName
    .toUpperCase()
    .replace(NON_ALPHANUMERIC, "")
    .slice(0, 6);
  const random = crypto.getRandomValues(new Uint32Array(6));
  const suffix = Array.from(
    random,
    (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]
  ).join("");
  return prefix.length >= 2 ? `${prefix}-${suffix}` : `ORG-${suffix}`;
}

/** Why these pricing terms are invalid, or null when they're fine. */
export function billingPricingProblem(pricing: BillingPricing, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) {
    return "Enter a whole, non-negative amount";
  }
  if (pricing === "percent" && amount > 100) {
    return "A percent discount cannot exceed 100%";
  }
  if (pricing === "full" && amount !== 0) {
    return "Full price takes no amount";
  }
  return null;
}

/** What the organization owes for one seat whose list price is `listPrice`. */
export function agreedAmount(
  code: { pricing: BillingPricing; amount: number },
  listPrice: number
) {
  if (code.pricing === "fixed") {
    return code.amount;
  }
  if (code.pricing === "percent") {
    return Math.round((listPrice * (100 - code.amount)) / 100);
  }
  return listPrice;
}

export function describeBillingPricing(code: {
  pricing: BillingPricing;
  amount: number;
}) {
  if (code.pricing === "percent") {
    return `${code.amount}% off list price`;
  }
  if (code.pricing === "fixed") {
    return `$${(code.amount / 100).toFixed(2)} per seat`;
  }
  return "Full list price";
}

/** Why a billing code cannot cover this checkout, or null when it can. */
export function billingCodeProblem(
  code: {
    active: boolean;
    expires?: number;
    limit?: number;
    uses: number;
    courseIds: string[];
  },
  courseId: string,
  seats: number,
  now: number
) {
  if (!code.active) {
    return "This code is no longer active. Check with your organization.";
  }
  if (code.expires !== undefined && code.expires <= now) {
    return "This code has expired. Check with your organization.";
  }
  if (code.courseIds.length && !code.courseIds.includes(courseId)) {
    return "This code doesn't cover this class. Check with your organization.";
  }
  if (code.limit !== undefined && code.uses + seats > code.limit) {
    const left = Math.max(0, code.limit - code.uses);
    return left
      ? `This code has ${left} registration${left === 1 ? "" : "s"} left; register fewer attendees or check with your organization.`
      : "This code has been used up. Check with your organization.";
  }
  return null;
}

/**
 * What stays on the organization's balance when a covered seat is canceled,
 * following the cancellation policy: nothing when we canceled the class or
 * the change is at least seven days out, otherwise the $20 administrative fee.
 */
export function amountAfterCancellation(
  amount: number,
  classStart: number | undefined,
  sessionCanceled: boolean,
  now: number
) {
  if (
    sessionCanceled ||
    classStart === undefined ||
    now <= classStart - FREE_CHANGE_DAYS * DAY_MS
  ) {
    return 0;
  }
  return Math.min(amount, LATE_CHANGE_FEE);
}
