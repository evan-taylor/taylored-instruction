"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/dialog";
import { DescriptionList } from "@/components/ui/page-header";
import type { Doc } from "@/convex/_generated/dataModel";
import { EmailBody } from "@/shared/registration/email-body";
import { emailKind, emailStatus } from "./email-history-format";
import { formatDateTime, pluralize } from "./format";

export type EmailRecord = {
  job: Doc<"registrationJobs">;
  tracking: Doc<"registrationEmailTracking"> | null;
};

function subjectOf(job: EmailRecord["job"]) {
  return job.sentCopy?.subject ?? job.subject;
}

function timeOf(job: EmailRecord["job"]) {
  return job.sentAt ?? (job.state === "pending" ? job.due : job._creationTime);
}

function copyNote(job: EmailRecord["job"]) {
  if (job.sentCopy) {
    return "The text version exactly as it was sent.";
  }
  if (job.state === "sent") {
    return "The sent text wasn’t saved for this older message, so merge fields are shown as written.";
  }
  return "This message hasn’t been sent, so merge fields are shown as written.";
}

function engagement(at: number | undefined, count: number, noun: string) {
  return at === undefined
    ? "Not recorded"
    : `${formatDateTime(at)} · ${pluralize(count, noun)}`;
}

function EmailPreview({
  email,
  open,
  onClose,
}: {
  email: EmailRecord | undefined;
  open: boolean;
  onClose: () => void;
}) {
  if (!email) {
    return null;
  }
  const { job, tracking } = email;
  const status = emailStatus(job, tracking);
  const redirected = job.deliveredTo && job.deliveredTo !== job.recipient;
  return (
    <Modal
      description={emailKind(job)}
      onClose={onClose}
      open={open}
      size="lg"
      title={subjectOf(job)}
    >
      <div className="space-y-5">
        <DescriptionList
          items={[
            {
              label: "To",
              value: (
                <span className="break-all">
                  {job.deliveredTo ?? job.recipient}
                  {redirected ? (
                    <span className="block text-slate-500 text-xs">
                      Test redirect for {job.recipient}
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              label: job.sentAt ? "Sent" : "Scheduled",
              value: formatDateTime(timeOf(job)),
            },
            {
              label: "Status",
              value: <Badge tone={status.tone}>{status.label}</Badge>,
            },
            {
              label: "Delivered",
              value: tracking?.deliveredAt
                ? formatDateTime(tracking.deliveredAt)
                : "Not recorded",
            },
            {
              label: "First opened",
              value: engagement(
                tracking?.openedAt,
                tracking?.opens ?? 0,
                "open"
              ),
            },
            {
              label: "First clicked",
              value: engagement(
                tracking?.clickedAt,
                tracking?.clicks ?? 0,
                "click"
              ),
            },
          ]}
        />
        {job.error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-rose-800 text-sm">
            {job.error}
          </p>
        ) : null}
        <div className="rounded-lg bg-slate-100 p-3 sm:p-5">
          <div className="mx-auto max-w-[65ch] rounded-md bg-white p-5 shadow-xs ring-1 ring-slate-900/5">
            {job.sentCopy ? (
              <p className="whitespace-pre-wrap text-slate-700 text-sm leading-6">
                {job.sentCopy.text}
              </p>
            ) : (
              <EmailBody body={job.body} />
            )}
          </div>
        </div>
        <p className="text-slate-500 text-xs">
          {copyNote(job)} Opens and clicks come from the email provider and can
          include automated scanners.
        </p>
      </div>
    </Modal>
  );
}

/** A registration's emails, newest first; each opens a preview of what was sent. */
export function EmailHistory({ emails }: { emails: EmailRecord[] }) {
  const [previewId, setPreviewId] = useState<string>();
  const [open, setOpen] = useState(false);
  if (!emails.length) {
    return (
      <p className="rounded-lg border border-slate-200 border-dashed px-4 py-3 text-slate-500 text-sm">
        No emails recorded for this registration yet.
      </p>
    );
  }
  return (
    <>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {emails.map(({ job, tracking }) => {
          const status = emailStatus(job, tracking);
          return (
            <li key={job._id}>
              <button
                aria-label={`Preview ${emailKind(job).toLowerCase()} email: ${subjectOf(job)}`}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset sm:flex-nowrap"
                onClick={() => {
                  setPreviewId(job._id);
                  setOpen(true);
                }}
                type="button"
              >
                <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <span className="block text-slate-500 text-xs">
                    {emailKind(job)}
                  </span>
                  <span className="block truncate font-medium text-slate-900 text-sm">
                    {subjectOf(job)}
                  </span>
                </span>
                <time
                  className="shrink-0 text-slate-500 text-xs tabular-nums"
                  dateTime={new Date(timeOf(job)).toISOString()}
                >
                  {formatDateTime(timeOf(job))}
                </time>
                <Badge tone={status.tone}>{status.label}</Badge>
                <ChevronRight
                  aria-hidden="true"
                  className="ml-auto hidden h-4 w-4 shrink-0 text-slate-400 sm:block"
                />
              </button>
            </li>
          );
        })}
      </ul>
      <EmailPreview
        email={emails.find(({ job }) => job._id === previewId)}
        onClose={() => setOpen(false)}
        open={open}
      />
    </>
  );
}
