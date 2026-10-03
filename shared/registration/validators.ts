import { v } from "convex/values";

export const materialAttachment = v.object({
  id: v.string(),
  materialId: v.id("registrationMaterials"),
  title: v.string(),
  policy: v.union(
    v.literal("included"),
    v.literal("optional"),
    v.literal("waivable")
  ),
  cents: v.number(),
});
export const question = v.object({
  id: v.string(),
  title: v.string(),
  type: v.union(v.literal("text"), v.literal("choice"), v.literal("checkbox")),
  required: v.boolean(),
  options: v.array(v.string()),
  policyUrl: v.optional(v.string()),
  version: v.number(),
});
export const outcome = v.object({
  id: v.string(),
  title: v.string(),
  type: v.union(v.literal("category"), v.literal("percentage")),
  options: v.array(v.string()),
  required: v.boolean(),
  passingValue: v.optional(v.string()),
  minimum: v.optional(v.number()),
  version: v.number(),
});
export const emailStep = v.object({
  id: v.string(),
  anchor: v.union(
    v.literal("first"),
    v.literal("last"),
    v.literal("registration")
  ),
  offsetMinutes: v.number(),
  subject: v.string(),
  body: v.string(),
});
export const settingsFields = {
  tuition: v.number(),
  materials: v.array(materialAttachment),
  questions: v.array(question),
  outcomes: v.array(outcome),
  emails: v.array(emailStep),
  cutoffMinutes: v.number(),
};
export const settings = v.object(settingsFields);
export const overrides = v.object({
  tuition: v.optional(v.number()),
  materials: v.optional(v.array(materialAttachment)),
  questions: v.optional(v.array(question)),
  outcomes: v.optional(v.array(outcome)),
  emails: v.optional(v.array(emailStep)),
  cutoffMinutes: v.optional(v.number()),
});
export const meeting = v.object({
  id: v.string(),
  start: v.number(),
  end: v.number(),
  location: v.string(),
  locationId: v.optional(v.id("registrationLocations")),
  onlineUrl: v.optional(v.string()),
  instructions: v.string(),
  sequence: v.number(),
});
export const answer = v.object({
  id: v.string(),
  value: v.union(v.string(), v.boolean()),
});
export const attendee = v.object({
  name: v.string(),
  email: v.string(),
  selected: v.array(v.string()),
  waived: v.array(v.string()),
  answers: v.array(answer),
});
export const line = v.object({
  id: v.string(),
  title: v.string(),
  cents: v.number(),
  discount: v.number(),
  materialId: v.optional(v.id("registrationMaterials")),
});
export const quotedSeat = v.object({
  attendee,
  acceptedAt: v.optional(v.number()),
  lines: v.array(line),
  total: v.number(),
  couponUsed: v.boolean(),
  materials: v.array(materialAttachment),
  questions: v.array(question),
  acknowledgment: v.optional(v.string()),
});
export const publication = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);
export const visibility = v.union(
  v.literal("public"),
  v.literal("private"),
  v.literal("admin")
);
export const orderStatus = v.union(
  v.literal("hold"),
  v.literal("unpaid"),
  v.literal("settled"),
  v.literal("expired"),
  v.literal("exception")
);
export const courseFields = {
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  delivery: v.union(v.literal("scheduled"), v.literal("self-paced")),
  publication,
  settings,
  enrollmentOpen: v.boolean(),
  revision: v.number(),
};
export const sessionFields = {
  courseId: v.id("registrationCourses"),
  title: v.string(),
  code: v.string(),
  publication,
  visibility,
  state: v.union(
    v.literal("open"),
    v.literal("canceled"),
    v.literal("finished")
  ),
  capacity: v.number(),
  reserved: v.number(),
  timeZone: v.string(),
  meetings: v.array(meeting),
  firstStart: v.number(),
  lastEnd: v.number(),
  overrides,
  revision: v.number(),
  instructors: v.array(v.id("users")),
  offerMinutes: v.number(),
};
export const couponFields = {
  code: v.string(),
  type: v.union(v.literal("percent"), v.literal("fixed")),
  amount: v.number(),
  materialIds: v.array(v.id("registrationMaterials")),
  allMaterials: v.boolean(),
  courseIds: v.array(v.id("registrationCourses")),
  expires: v.number(),
  limit: v.number(),
  reserved: v.number(),
  consumed: v.number(),
  disabled: v.boolean(),
};
