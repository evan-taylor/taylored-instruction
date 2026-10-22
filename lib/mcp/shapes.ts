import { z } from "zod";

/** Zod mirrors of the Convex validators in shared/registration/validators.ts. */

export const id = z.string().min(1).describe("Convex document id");
export const email = z.string().trim().toLowerCase().email();

/** Accepts epoch milliseconds or an ISO 8601 string and yields epoch ms. */
export const instant = z
  .union([z.number().int(), z.string().min(1)])
  .describe("Epoch milliseconds or ISO 8601 date-time");

export function toEpoch(value: number | string, field = "date") {
  if (typeof value === "number") {
    return value;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`${field} must be epoch milliseconds or ISO 8601`);
  }
  return ms;
}

export const pagination = {
  cursor: z
    .string()
    .nullable()
    .optional()
    .describe("continueCursor from the previous page; omit for the first page"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("Page size, default 50"),
};

export function paginationOpts(args: {
  cursor?: string | null;
  limit?: number;
}) {
  return { cursor: args.cursor ?? null, numItems: args.limit ?? 50 };
}

export const materialPolicy = z
  .enum(["included", "optional", "waivable"])
  .describe(
    "included: always charged; optional: attendee opts in; waivable: charged unless attendee waives"
  );

export const materialAttachment = z.object({
  id: z
    .string()
    .optional()
    .describe("Stable id; generated when omitted. Reuse ids when editing."),
  materialId: id.describe("registrationMaterials id"),
  title: z.string().min(1),
  policy: materialPolicy,
  cents: z.number().int().min(0).describe("Price in cents"),
});

export const question = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(["text", "choice", "checkbox"]),
  required: z.boolean(),
  options: z.array(z.string()).default([]),
  policyUrl: z.string().url().optional(),
  version: z.number().int().min(1).optional(),
});

export const outcome = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(["category", "percentage"]),
  options: z.array(z.string()).default([]),
  required: z.boolean(),
  passingValue: z.string().optional(),
  minimum: z.number().optional(),
  version: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Bump when grading rules change so earlier entries are invalidated"
    ),
});

export const emailStep = z.object({
  id: z.string().optional(),
  anchor: z
    .enum(["first", "last", "registration"])
    .describe(
      "Reference point: first meeting, last meeting, or registration time"
    ),
  offsetMinutes: z
    .number()
    .int()
    .describe("Minutes relative to the anchor; negative sends before"),
  subject: z.string().min(1),
  body: z
    .string()
    .min(1)
    .describe(
      "Plain text. Variables: {{name}}, {{title}}, {{start}}, {{location}}, {{instructions}}, {{code}}"
    ),
});

export const settings = z.object({
  tuition: z.number().int().min(0).describe("Tuition in cents"),
  taxCode: z
    .string()
    .optional()
    .describe("Stripe tax code, e.g. txcd_20030000"),
  materials: z.array(materialAttachment).default([]),
  questions: z.array(question).default([]),
  outcomes: z.array(outcome).default([]),
  emails: z.array(emailStep).default([]),
  cutoffMinutes: z
    .number()
    .int()
    .min(0)
    .describe("Minutes before the first meeting when online enrollment closes"),
});

export const overrides = z
  .object({
    tuition: z.number().int().min(0).optional(),
    taxCode: z.string().optional(),
    materials: z.array(materialAttachment).optional(),
    questions: z.array(question).optional(),
    outcomes: z.array(outcome).optional(),
    emails: z.array(emailStep).optional(),
    cutoffMinutes: z.number().int().min(0).optional(),
  })
  .describe("Per-session overrides of the course template settings");

export const meeting = z.object({
  id: z.string().optional().describe("Keep existing ids when editing"),
  start: instant,
  end: instant,
  location: z.string().describe("Display address or 'Online'"),
  locationId: id.optional().describe("registrationLocations id"),
  onlineUrl: z.string().url().optional(),
  instructions: z.string().default(""),
});

export const publication = z.enum(["draft", "published", "archived"]);
export const visibility = z
  .enum(["public", "private", "admin"])
  .describe(
    "public: listed; private: reachable by link/code only; admin: staff enrollment only"
  );

export const answer = z.object({
  id: z.string().describe("Question id from the course settings"),
  value: z.union([z.string(), z.boolean()]),
});

export const attendee = z.object({
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email,
  selected: z
    .array(z.string())
    .default([])
    .describe("Ids of optional materials this attendee wants"),
  waived: z
    .array(z.string())
    .default([])
    .describe("Ids of waivable materials this attendee already owns"),
  answers: z.array(answer).default([]),
});

export const postalAddress = {
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional().describe("Two-letter code, e.g. US"),
};

export const groupStatus = z.enum([
  "new",
  "contacted",
  "quoted",
  "scheduled",
  "closed",
]);
export const invoiceStatus = z.enum(["draft", "open", "paid", "void"]);
export const materialKind = z.enum(["pdf", "link", "keycode", "physical"]);

type Identified = { id?: string; version?: number };
/** Fills in ids and versions so partially specified config items are valid. */
export function withIds<T extends Identified>(
  items: T[],
  previous: { id: string; version?: number }[] = []
): (Omit<T, "id" | "version"> & { id: string; version: number })[] {
  return items.map((item) => {
    const old = item.id ? previous.find((p) => p.id === item.id) : undefined;
    return {
      ...item,
      id: item.id ?? crypto.randomUUID(),
      version: item.version ?? old?.version ?? 1,
    };
  });
}
