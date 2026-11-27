"use client";
import { useAction, useMutation } from "convex/react";
import { Check, Download, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Notice, ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CERTIFICATE_ACCEPT,
  MAX_CERTIFICATE_BYTES,
} from "@/shared/registration/certificate";
import { errorText } from "./errors";
import { formatDateTime } from "./format";

type Verification = {
  state: "verifying" | "needs_review" | "auto_passed" | "approved";
  error?:
    | "gateway_unavailable"
    | "gateway_error"
    | "timeout"
    | "unsupported_file"
    | "invalid_response";
  checks: {
    id: string;
    label: string;
    probability: number;
    verdict: "passed" | "uncertain" | "failed";
  }[];
};

export type StaffCertificate = {
  title: string;
  uploaded: boolean;
  review?: "verifying" | "needs_review";
  file?: {
    _id: Id<"registrationSessionFiles">;
    name: string;
    url: string | null;
    uploadedAt: number;
    staffUpload: boolean;
    verification?: Verification;
  };
};

const ERROR_TEXT: Record<NonNullable<Verification["error"]>, string> = {
  gateway_unavailable: "Automatic checking isn’t available right now.",
  gateway_error: "The automatic check failed.",
  timeout: "The automatic check didn’t finish in time.",
  unsupported_file: "The file couldn’t be read for automatic checking.",
  invalid_response: "The automatic check returned no usable answer.",
};

/** The roster's one-word status for an attendee's pre-class certificate. */
export function CertificateBadge({
  certificate,
}: {
  certificate: Pick<StaffCertificate, "uploaded" | "review">;
}) {
  if (certificate.review === "needs_review") {
    return <Badge tone="attention">Certificate needs review</Badge>;
  }
  if (certificate.review === "verifying") {
    return <Badge tone="info">Verifying certificate</Badge>;
  }
  return certificate.uploaded ? (
    <Badge tone="success">Certificate uploaded</Badge>
  ) : (
    <Badge tone="warning">Certificate missing</Badge>
  );
}

function VerificationSummary({ verification }: { verification: Verification }) {
  if (verification.state === "auto_passed") {
    return <p className="text-slate-500 text-xs">Verified automatically.</p>;
  }
  if (verification.state === "approved") {
    return <p className="text-slate-500 text-xs">Approved by staff.</p>;
  }
  if (verification.state === "verifying") {
    return (
      <Notice>
        Checking this certificate automatically. This takes a minute.
      </Notice>
    );
  }
  const flagged = verification.checks.filter(
    (check) => check.verdict !== "passed"
  );
  return (
    <Notice tone="attention">
      <p className="font-medium">Needs review</p>
      {verification.error ? <p>{ERROR_TEXT[verification.error]}</p> : null}
      {flagged.length ? (
        <ul className="mt-1 list-disc pl-5">
          {flagged.map((check) => (
            <li key={check.id}>
              {check.label}:{" "}
              {check.verdict === "failed" ? "failed" : "uncertain"} (
              {Math.round(check.probability * 100)}% likely)
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1">Open the file, then approve or reject it.</p>
    </Notice>
  );
}

/** Staff upload, replace, or remove an attendee's pre-class certificate. */
export function StaffCertificateUpload({
  certificate,
  seatId,
  attendeeName,
}: {
  certificate: StaffCertificate;
  seatId: Id<"registrationSeats">;
  attendeeName: string;
}) {
  const upload = useAction(api.registrationCertificates.uploadForAttendee);
  const remove = useMutation(api.registrationOperations.removeFile);
  const approve = useMutation(api.registrationCertificates.approve);
  const reject = useMutation(api.registrationCertificates.reject);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "danger">("success");
  const current = certificate.file;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) {
      return;
    }
    setTone("danger");
    if (file.size > MAX_CERTIFICATE_BYTES) {
      setMessage("The certificate must be 3 MB or smaller.");
      return;
    }
    const form = event.currentTarget;
    setMessage("");
    setPending(true);
    try {
      await upload({
        seatId,
        name: file.name,
        bytes: await file.arrayBuffer(),
      });
      form.reset();
      setFile(null);
      setTone("success");
      setMessage(`Uploaded ${file.name} for ${attendeeName}.`);
    } catch (cause) {
      setMessage(errorText(cause, "The certificate could not be uploaded."));
    } finally {
      setPending(false);
    }
  }

  async function approveUpload(id: Id<"registrationSessionFiles">) {
    setDeciding(true);
    try {
      await approve({ fileId: id });
      setTone("success");
      setMessage(`Approved ${attendeeName}’s certificate.`);
    } catch (cause) {
      setTone("danger");
      setMessage(errorText(cause, "The certificate could not be approved."));
    } finally {
      setDeciding(false);
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <h3 className="font-semibold text-slate-900 text-sm">
        {certificate.title} certificate
      </h3>
      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-sm">
            <div className="truncate font-medium text-slate-900">
              {current.name}
            </div>
            <div className="text-slate-500 text-xs">
              {current.staffUpload
                ? "Uploaded by staff"
                : "Uploaded by attendee"}{" "}
              {formatDateTime(current.uploadedAt)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {current.url ? (
              <Button
                aria-label={`View ${current.name}`}
                href={current.url}
                size="xs"
                target="_blank"
                variant="secondary"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                View
              </Button>
            ) : null}
            <Button
              aria-label={`Remove certificate for ${attendeeName}`}
              onClick={() => setRemoving(true)}
              size="xs"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Notice tone="warning">
          {attendeeName} hasn’t uploaded this certificate yet.
        </Notice>
      )}
      {current?.verification ? (
        <VerificationSummary verification={current.verification} />
      ) : null}
      {current && certificate.review ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={deciding}
            onClick={() => approveUpload(current._id)}
            size="sm"
            type="button"
          >
            <Check aria-hidden="true" className="h-4 w-4" />
            Approve
          </Button>
          <Button
            disabled={deciding}
            onClick={() => setRejecting(true)}
            size="sm"
            type="button"
            variant="secondary"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Reject
          </Button>
        </div>
      ) : null}
      <form className="space-y-3" onSubmit={submit}>
        <Field
          hint="PDF, JPEG, or PNG up to 3 MB. Counts as the attendee’s own upload."
          label={current ? "Replace certificate" : "Upload for attendee"}
        >
          {(props) => (
            <input
              {...props}
              accept={CERTIFICATE_ACCEPT}
              className="block w-full min-w-0 cursor-pointer rounded-md text-slate-900 text-sm file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-md file:border file:border-primary file:bg-white file:px-3 file:font-medium file:text-primary hover:file:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50"
              disabled={pending}
              onChange={(event) => {
                setFile(event.currentTarget.files?.item(0) ?? null);
                setMessage("");
              }}
              type="file"
            />
          )}
        </Field>
        {file ? (
          <Button disabled={pending} size="sm" type="submit">
            {pending ? "Uploading…" : "Upload certificate"}
          </Button>
        ) : null}
      </form>
      <ResultNotice message={message} tone={tone} />
      <ConfirmDialog
        confirmLabel="Remove certificate"
        danger
        description="The file is deleted and the attendee’s certificate requirement reopens. Upload reminders that haven’t sent yet will go out again; ones skipped while a certificate was on file won’t."
        onClose={() => setRemoving(false)}
        onConfirm={async () => {
          if (!current) {
            return;
          }
          await remove({ id: current._id });
          setRemoving(false);
          setTone("success");
          setMessage(`Removed ${current.name}.`);
        }}
        open={removing}
        title={`Remove ${attendeeName}’s certificate?`}
      />
      <ConfirmDialog
        confirmLabel="Reject certificate"
        danger
        description="The file is deleted, the requirement reopens, and the attendee is emailed to upload a new copy. Upload reminders resume."
        onClose={() => setRejecting(false)}
        onConfirm={async () => {
          if (!current) {
            return;
          }
          try {
            await reject({ fileId: current._id });
            setTone("success");
            setMessage(
              `Rejected ${current.name}. ${attendeeName} was asked to upload it again.`
            );
          } catch (cause) {
            setTone("danger");
            setMessage(
              errorText(cause, "The certificate could not be rejected.")
            );
          } finally {
            setRejecting(false);
          }
        }}
        open={rejecting}
        title={`Reject ${attendeeName}’s certificate?`}
      />
    </section>
  );
}
