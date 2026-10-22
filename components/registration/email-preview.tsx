"use client";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/field";
import { ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { errorText } from "./errors";

const VARIABLE = /\{\{(\w+)\}\}/gu;

/** Merge fields the mailer substitutes on delivery, with the sample used in previews. */
export const MERGE_FIELDS: { key: string; sample: string; help: string }[] = [
  { key: "attendeeName", sample: "Sample attendee", help: "Attendee's name" },
  { key: "courseTitle", sample: "Sample course", help: "Course title" },
  {
    key: "meetingDates",
    sample: "October 10, 10:00 AM America/New_York",
    help: "Meeting schedule in the session's zone",
  },
  {
    key: "portalLink",
    sample: "https://example.test/registrations",
    help: "Link to the attendee portal",
  },
  {
    key: "materials",
    sample: "Sample included material",
    help: "Materials the attendee is entitled to",
  },
];
const SAMPLE: Record<string, string> = Object.fromEntries(
  MERGE_FIELDS.map((f) => [f.key, f.sample])
);
export function previewMerge(value: string) {
  return value.replace(VARIABLE, (_, key: string) => SAMPLE[key] ?? "");
}

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
  const [busy, setBusy] = useState(false);
  const sendTest = async () => {
    setMessage("");
    setBusy(true);
    try {
      await send({
        subject: previewMerge(subject),
        body: previewMerge(body),
        recipient,
        key: crypto.randomUUID(),
      });
      setMessage("Test email queued");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer select-none px-4 py-2.5 font-medium text-slate-700 text-sm hover:text-slate-900">
        Preview and send a test
      </summary>
      <div className="space-y-4 border-slate-200 border-t px-4 py-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <p className="m-0 text-slate-500 text-xs uppercase tracking-wide">
            Subject
          </p>
          <p className="m-0 mt-0.5 font-semibold text-slate-900 text-sm">
            {previewMerge(subject) || "(no subject)"}
          </p>
          <p className="m-0 mt-3 whitespace-pre-wrap text-slate-700 text-sm">
            {previewMerge(body)}
          </p>
          <p className="m-0 mt-3 text-slate-500 text-xs">
            Meeting details, secure portal access, and the recipient's entitled
            materials are appended on delivery.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field
            className="flex-1"
            hint="Only the configured safe test recipient is accepted."
            label="Test recipient"
          >
            {(props) => (
              <TextInput
                {...props}
                autoComplete="email"
                inputMode="email"
                onChange={(e) => setRecipient(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends the test without submitting the editor form.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendTest();
                  }
                }}
                placeholder="you@example.com"
                type="text"
                value={recipient}
              />
            )}
          </Field>
          <Button
            disabled={busy || !recipient.trim()}
            onClick={sendTest}
            size="sm"
            type="button"
            variant="secondary"
          >
            {busy ? "Working…" : "Send test email"}
          </Button>
        </div>
        <ResultNotice message={message} />
      </div>
    </details>
  );
}
