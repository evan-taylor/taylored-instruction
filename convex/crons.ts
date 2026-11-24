import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
  "Release registration holds",
  { minutes: 1 },
  internal.registrationPayments.expire
);
crons.interval(
  "Deliver registration outbox",
  { minutes: 1 },
  internal.registrationExternal.deliver
);
crons.interval(
  "Reconcile registration refunds",
  { minutes: 5 },
  internal.registrationExternal.reconcileRefunds
);
// 16:00 UTC is 8 or 9 a.m. in the Pacific time zone.
crons.daily(
  "Instructor certification reminders",
  { hourUTC: 16, minuteUTC: 0 },
  internal.instructorCertifications.runReminders,
  {}
);
crons.weekly(
  "Instructor certification staff digest",
  { dayOfWeek: "monday", hourUTC: 16, minuteUTC: 15 },
  internal.instructorCertifications.runDigest,
  {}
);
export default crons;
