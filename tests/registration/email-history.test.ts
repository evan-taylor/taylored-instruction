import { describe, expect, it } from "vitest";
import {
  emailKind,
  emailStatus,
} from "@/components/registration/email-history-format";

const sent = { key: "confirmation:seat", state: "sent" as const };
const tracking = {
  status: "email.delivered",
  deliveredAt: 1,
  openedAt: undefined,
  clickedAt: undefined,
};

describe("email history", () => {
  it("labels each kind of registration email from its job key", () => {
    expect(emailKind({ key: "confirmation:seat" })).toBe("Confirmation");
    expect(emailKind({ key: "payment-request:order:1" })).toBe(
      "Payment request"
    );
    expect(emailKind({ key: "cancel-order:order:a@b.test" })).toBe(
      "Cancellation"
    );
    expect(emailKind({ key: "step:seat:reminder" })).toBe("Course email");
    expect(emailKind({ key: "something-new:1" })).toBe("Email");
  });

  it("reports the furthest each email got", () => {
    expect(emailStatus({ ...sent, state: "pending" }, null).label).toBe(
      "Scheduled"
    );
    expect(emailStatus({ ...sent, state: "canceled" }, null).label).toBe(
      "Not sent"
    );
    expect(emailStatus({ ...sent, state: "failed" }, null)).toEqual({
      label: "Failed",
      tone: "danger",
    });
    expect(emailStatus(sent, null).label).toBe("Sent");
    expect(emailStatus(sent, tracking).label).toBe("Delivered");
    expect(emailStatus(sent, { ...tracking, openedAt: 2 }).label).toBe(
      "Opened"
    );
    expect(
      emailStatus(sent, { ...tracking, openedAt: 2, clickedAt: 3 }).label
    ).toBe("Clicked");
  });

  it("never hides a bounce behind an automated open", () => {
    expect(
      emailStatus(sent, {
        status: "email.bounced",
        deliveredAt: undefined,
        openedAt: 2,
        clickedAt: undefined,
      })
    ).toEqual({ label: "Bounced", tone: "danger" });
    for (const [status, label] of [
      ["email.failed", "Failed"],
      ["email.suppressed", "Suppressed"],
    ]) {
      expect(
        emailStatus(sent, {
          status,
          deliveredAt: undefined,
          openedAt: 2,
          clickedAt: 3,
        }).label
      ).toBe(label);
    }
  });
});
