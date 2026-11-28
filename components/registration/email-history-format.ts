import type { BadgeTone } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";

type Job = Pick<Doc<"registrationJobs">, "key" | "state">;
type Tracking = Pick<
  Doc<"registrationEmailTracking">,
  "status" | "deliveredAt" | "openedAt" | "clickedAt"
> | null;

const KINDS: Record<string, string> = {
  assigned: "Instructor assignment",
  cancel: "Cancellation",
  "cancel-order": "Cancellation",
  certificate: "Certificate",
  "certificate-rejected": "Certificate follow-up",
  confirmation: "Confirmation",
  instructor: "Instructor message",
  "instructor-cancel": "Instructor message",
  invoice: "Invoice",
  "invoice-reminder": "Invoice reminder",
  material: "Materials",
  offer: "Waitlist offer",
  "payment-request": "Payment request",
  receipt: "Receipt",
  resend: "Materials resent",
  schedule: "Schedule update",
  staff: "Staff message",
  step: "Course email",
  transfer: "Transfer",
};

/** A short label for the kind of message a registration job sends. */
export function emailKind(job: Pick<Job, "key">) {
  return KINDS[job.key.split(":")[0] ?? ""] ?? "Email";
}

/**
 * The furthest a message got. Delivery failures win over engagement, so a
 * bounce is never hidden behind an automated open.
 */
export function emailStatus(
  job: Job,
  tracking: Tracking
): { label: string; tone: BadgeTone } {
  if (job.state === "failed") {
    return { label: "Failed", tone: "danger" };
  }
  if (job.state === "canceled") {
    return { label: "Not sent", tone: "neutral" };
  }
  if (job.state !== "sent") {
    return { label: "Scheduled", tone: "info" };
  }
  if (tracking?.status === "email.bounced") {
    return { label: "Bounced", tone: "danger" };
  }
  if (tracking?.status === "email.failed") {
    return { label: "Failed", tone: "danger" };
  }
  if (tracking?.status === "email.suppressed") {
    return { label: "Suppressed", tone: "danger" };
  }
  if (tracking?.status === "email.complained") {
    return { label: "Marked as spam", tone: "danger" };
  }
  if (tracking?.clickedAt !== undefined) {
    return { label: "Clicked", tone: "success" };
  }
  if (tracking?.openedAt !== undefined) {
    return { label: "Opened", tone: "success" };
  }
  if (
    tracking?.deliveredAt !== undefined ||
    tracking?.status === "email.delivered"
  ) {
    return { label: "Delivered", tone: "success" };
  }
  if (tracking?.status === "email.delivery_delayed") {
    return { label: "Delayed", tone: "warning" };
  }
  return { label: "Sent", tone: "neutral" };
}
