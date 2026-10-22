import type { Infer } from "convex/values";
import type {
  attendee,
  couponFields,
  outcome,
  quotedSeat,
  settings,
} from "./validators";

export type Settings = Infer<typeof settings>;
export type Attendee = Infer<typeof attendee>;
export type Quote = Infer<typeof quotedSeat>;
export type Coupon = {
  [K in keyof typeof couponFields]: Infer<(typeof couponFields)[K]>;
};
export const HOLD_MS = 30 * 60 * 1000;
/** Seats and coupon uses stay reserved this long while a card payment is entered. */
export const CHECKOUT_HOLD_MS = 15 * 60 * 1000;
export const CHECKOUT_HOLD_MINUTES = CHECKOUT_HOLD_MS / 60_000;
export const BATCH = 50;
export const MAX_SEATS = 20;
/** Staff-created group orders may carry larger rosters than public checkout. */
export const ADMIN_MAX_SEATS = 100;
export const WAIVER = "I already have this material";
export const INVOICE_TERMS_DAYS = 30;

export function formatMoney(valueInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(valueInCents / 100);
}
/** Parses a dollar string such as "1,250.50" into integer cents. */
export function parseDollars(value: string) {
  const normalized = value.replaceAll(/[$,\s]/gu, "");
  if (normalized === "") {
    return 0;
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid dollar amount");
  }
  return Math.round(amount * 100);
}
export function invoiceNumber(sequence: number, at = Date.now()) {
  const year = new Date(at).getUTCFullYear();
  return `TI-${year}-${String(sequence).padStart(4, "0")}`;
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const FORMULA = /^[\s]*[=+\-@\t\r]/u;
const HTML_CHARS = /[&<>"']/gu;
const MERGE_FIELD = /\{\{([a-zA-Z]+)\}\}/gu;

export function email(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL.test(normalized)) {
    throw new Error("Enter a valid email address");
  }
  return normalized;
}
export function cents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000) {
    throw new Error("Money must be nonnegative integer cents");
  }
  return value;
}
export function safeUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Use an HTTPS link without embedded credentials");
  }
  return url.href;
}
export function effective(
  defaults: Settings,
  overrides: Partial<Settings>
): Settings {
  // Absence means inherit; any defined override wins, including keys the
  // template leaves unset (such as an optional tax code).
  const defined = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  );
  return { ...defaults, ...defined } as Settings;
}
/** Common Stripe Tax codes offered when the live list cannot be fetched. */
export const DEFAULT_TAX_CODES = [
  { id: "txcd_20030000", name: "General - Services" },
  { id: "txcd_10000000", name: "General - Electronically Supplied Services" },
  { id: "txcd_99999999", name: "General - Tangible Goods" },
] as const;
const TAX_CODE = /^txcd_\d{8}$/u;
export function taxCode(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return;
  }
  if (!TAX_CODE.test(trimmed)) {
    throw new Error("Tax codes look like txcd_20030000");
  }
  return trimmed;
}
export function validateSettings(config: Settings) {
  cents(config.tuition);
  taxCode(config.taxCode);
  if (!Number.isFinite(config.cutoffMinutes) || config.cutoffMinutes < 0) {
    throw new Error("Invalid registration cutoff");
  }
  for (const items of [
    config.materials,
    config.questions,
    config.outcomes,
    config.emails,
  ]) {
    if (
      items.length > BATCH ||
      new Set(items.map((item) => item.id)).size !== items.length
    ) {
      throw new Error("Use at most 50 unique fields per section");
    }
  }
  if (
    new Set(config.materials.map((m) => m.materialId)).size !==
    config.materials.length
  ) {
    throw new Error("Each material can only be attached once");
  }
  for (const material of config.materials) {
    cents(material.cents);
  }
  for (const q of config.questions) {
    if (q.policyUrl) {
      safeUrl(q.policyUrl);
    }
  }
  for (const rule of config.outcomes) {
    if (
      rule.type === "percentage" &&
      rule.required &&
      (rule.minimum === undefined || rule.minimum < 0 || rule.minimum > 100)
    ) {
      throw new Error(
        "A percentage completion rule needs a threshold from 0 to 100"
      );
    }
    if (
      rule.type === "category" &&
      rule.required &&
      !rule.options.includes(rule.passingValue ?? "")
    ) {
      throw new Error("Choose a passing category");
    }
  }
}
export function quote(
  config: Settings,
  inputs: Attendee[],
  coupon: Coupon | null,
  availableUses: number,
  maxSeats = MAX_SEATS
): Quote[] {
  validateSettings(config);
  if (inputs.length < 1 || inputs.length > maxSeats) {
    throw new Error(`Choose between 1 and ${maxSeats} attendees`);
  }
  const seen = new Set<string>();
  let uses = availableUses;
  return inputs.map((input) => {
    const normalized = email(input.email);
    if (!input.name.trim() || input.name.length > 200 || seen.has(normalized)) {
      throw new Error("Every attendee needs a name and a distinct email");
    }
    seen.add(normalized);
    validateAttendee(config, input);
    const materials = config.materials.filter((m) => {
      if (input.waived.includes(m.id) && m.policy !== "waivable") {
        throw new Error("Only required-waivable materials can be waived");
      }
      return (
        m.policy === "included" ||
        (m.policy === "optional"
          ? input.selected.includes(m.id)
          : !input.waived.includes(m.id))
      );
    });
    const lines: Quote["lines"] = [
      { id: "tuition", title: "Tuition", cents: config.tuition, discount: 0 },
      ...materials.map((m) => ({
        id: m.id,
        title: m.title,
        cents: m.cents,
        discount: 0,
        materialId: m.materialId,
      })),
    ];
    const eligible = lines.filter(
      (l) =>
        !l.materialId ||
        coupon?.allMaterials ||
        coupon?.materialIds.includes(l.materialId)
    );
    const subtotal = eligible.reduce((sum, l) => sum + l.cents, 0);
    let discount = 0;
    if (coupon && uses > 0) {
      discount = Math.min(
        subtotal,
        coupon.type === "fixed"
          ? coupon.amount
          : Math.floor((subtotal * coupon.amount + 50) / 100)
      );
    }
    const couponUsed = discount > 0;
    if (couponUsed) {
      uses -= 1;
    }
    allocateDiscount(eligible, subtotal, discount);
    return {
      attendee: { ...input, name: input.name.trim(), email: normalized },
      acceptedAt: Date.now(),
      lines,
      materials,
      questions: config.questions,
      total: lines.reduce((sum, l) => sum + l.cents - l.discount, 0),
      couponUsed,
      ...(input.waived.length ? { acknowledgment: WAIVER } : {}),
    };
  });
}
export function completion(
  definitions: Infer<typeof outcome>[],
  values: { fieldId: string; version: number; value: string | number }[]
) {
  const required = definitions.filter((d) => d.required);
  if (!required.length) {
    return "not-evaluated";
  }
  return required.every((d) => {
    const value = values.find(
      (v) => v.fieldId === d.id && v.version === d.version
    )?.value;
    return d.type === "percentage"
      ? typeof value === "number" && value >= (d.minimum ?? 101) && value <= 100
      : value !== undefined && value === d.passingValue;
  })
    ? "complete"
    : "incomplete";
}
export function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(
    HTML_CHARS,
    (character) => entities[character] ?? character
  );
}
export function renderSubject(
  subject: string,
  variables: Record<string, string>
) {
  return subject.replace(
    MERGE_FIELD,
    (_, field: string) => variables[field] ?? ""
  );
}
export function renderEmail(body: string, variables: Record<string, string>) {
  return escapeHtml(body)
    .replace(MERGE_FIELD, (_, field: string) =>
      escapeHtml(variables[field] ?? "")
    )
    .split("\n")
    .map((text) => `<p>${text}</p>`)
    .join("");
}
export function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map(
          (value) =>
            `"${(FORMULA.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\r\n");
}
export function inventoryPreview(input: string) {
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  for (const line of input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)) {
    try {
      const url = safeUrl(line);
      if (valid.includes(url)) {
        duplicates.push(url);
      } else {
        valid.push(url);
      }
    } catch {
      invalid.push(line);
    }
  }
  if (valid.length > 200) {
    throw new Error("Paste at most 200 links per batch");
  }
  return { valid, invalid, duplicates };
}

function validateAttendee(config: Settings, input: Attendee) {
  const knownQuestions = new Set(config.questions.map((q) => q.id));
  if (
    new Set(input.answers.map((a) => a.id)).size !== input.answers.length ||
    input.answers.some(
      (a) =>
        !knownQuestions.has(a.id) ||
        (typeof a.value === "string" && a.value.length > 10_000)
    )
  ) {
    throw new Error("Unknown, duplicate, or oversized question answer");
  }
  const ids = new Set(config.materials.map((m) => m.id));
  if ([...input.selected, ...input.waived].some((id) => !ids.has(id))) {
    throw new Error("Unknown material choice");
  }
  for (const q of config.questions) {
    const answer = input.answers.find((a) => a.id === q.id)?.value;
    if (
      q.required &&
      (answer === undefined || answer === false || answer === "")
    ) {
      throw new Error(`Required: ${q.title}`);
    }
    if (
      answer !== undefined &&
      ((q.type === "checkbox" && typeof answer !== "boolean") ||
        (q.type !== "checkbox" && typeof answer !== "string") ||
        (q.type === "choice" && !q.options.includes(String(answer))))
    ) {
      throw new Error(`Invalid answer: ${q.title}`);
    }
  }
}

function allocateDiscount(
  eligible: Quote["lines"],
  subtotal: number,
  discount: number
) {
  // Deterministic proportional allocation, with remainder assigned in line order.
  let remaining = discount;
  for (const l of eligible) {
    l.discount =
      subtotal === 0 ? 0 : Math.floor((discount * l.cents) / subtotal);
    remaining -= l.discount;
  }
  for (const l of eligible) {
    if (remaining > 0 && l.discount < l.cents) {
      l.discount += 1;
      remaining -= 1;
    }
  }
}
