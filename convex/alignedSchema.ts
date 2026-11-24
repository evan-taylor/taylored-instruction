import { defineTable } from "convex/server";
import { v } from "convex/values";
import { outcome } from "../shared/registration/validators";

export const attendanceStatus = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("not-recorded")
);

/**
 * Independent instructors aligned with our Training Site. They run their own
 * classes and only record rosters here; these tables never touch registration
 * sessions, seats, orders, materials, or email.
 */
export const alignedTables = {
  alignedInstructors: defineTable({
    userId: v.id("users"),
    email: v.string(),
    /** Courses staff authorized this instructor to teach under our alignment. */
    courseIds: v.array(v.id("registrationCourses")),
    grantedBy: v.id("users"),
    grantedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("users")),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),
  independentSessions: defineTable({
    instructorId: v.id("users"),
    courseId: v.id("registrationCourses"),
    title: v.string(),
    start: v.number(),
    end: v.number(),
    timeZone: v.string(),
    location: v.string(),
    instructorNames: v.array(v.string()),
    outcomeDefinitions: v.array(outcome),
    state: v.union(v.literal("scheduled"), v.literal("canceled")),
    studentCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_instructorId_and_start", ["instructorId", "start"])
    .index("by_start", ["start"])
    .index("by_courseId", ["courseId"]),
  independentStudents: defineTable({
    sessionId: v.id("independentSessions"),
    instructorId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    attendance: attendanceStatus,
    outcomes: v.array(
      v.object({
        fieldId: v.string(),
        version: v.number(),
        value: v.union(v.string(), v.number()),
      })
    ),
    evaluation: v.string(),
    reason: v.string(),
    additionalInformation: v.string(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_and_email", ["sessionId", "email"]),
  independentActivity: defineTable({
    sessionId: v.id("independentSessions"),
    instructorId: v.id("users"),
    actor: v.id("users"),
    action: v.string(),
    detail: v.string(),
    at: v.number(),
  })
    .index("by_sessionId_and_at", ["sessionId", "at"])
    .index("by_instructorId_and_at", ["instructorId", "at"]),
};
