import { describe, expect, it } from "vitest";
import {
  getBLSCourseSchema,
  getFirstAidCPRAEDCourseSchema,
  getHeartsaverCourseSchema,
  getLifeguardingCourseSchema,
  getRedCrossBLSCourseSchema,
} from "@/lib/structuredData";

const FIXED_LENGTH = /"(duration|timeRequired|courseWorkload)"/u;

describe("service page Course schemas", () => {
  it.each([
    ["AHA BLS", getBLSCourseSchema],
    ["Red Cross BLS", getRedCrossBLSCourseSchema],
    ["First Aid/CPR/AED", getFirstAidCPRAEDCourseSchema],
    ["Heartsaver", getHeartsaverCourseSchema],
    ["Lifeguarding", getLifeguardingCourseSchema],
  ])("%s states no fixed course length", (_name, build) => {
    expect(JSON.stringify(build())).not.toMatch(FIXED_LENGTH);
  });
});
