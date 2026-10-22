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
export default crons;
