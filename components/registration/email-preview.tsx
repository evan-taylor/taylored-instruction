"use client";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";

const VARIABLE = /\{\{(\w+)\}\}/gu;
export function EmailPreview({
  subject,
  body,
}: {
  subject: string;
  body: string;
}) {
  const send = useMutation(api.registrationOperations.testEmail);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const sample: Record<string, string> = {
    attendeeName: "Sample attendee",
    courseTitle: "Sample course",
    meetingDates: "October 10, 10:00 AM America/New_York",
    portalLink: "https://example.test/registrations",
    materials: "Sample included material",
  };
  const preview = (value: string) =>
    value.replace(VARIABLE, (_, key: string) => sample[key] ?? "");
  return (
    <details>
      <summary>Preview and send test</summary>
      <h4>{preview(subject)}</h4>
      <p className="whitespace-pre-wrap">{preview(body)}</p>
      <p>
        Meeting details, secure portal access, and the recipient’s entitled
        materials are appended on delivery.
      </p>
      <label className="block">
        Configured safe test recipient
        <Input
          onChange={(e) => setRecipient(e.target.value)}
          type="email"
          value={recipient}
        />
      </label>
      <Button
        onClick={async () => {
          try {
            await send({
              subject: preview(subject),
              body: preview(body),
              recipient,
              key: crypto.randomUUID(),
            });
            setMessage("Test email queued");
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
      >
        Send test email
      </Button>
      <p role="status">{message}</p>
    </details>
  );
}
