"use client";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { Award, Download, ExternalLink, FileText, Upload } from "lucide-react";
import type React from "react";
import { useId, useRef, useState } from "react";
import { errorText } from "@/components/registration/errors";
import { formatDateTime } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Select, Toggle } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { MAX_CERTIFICATE_FILE_BYTES } from "@/shared/registration/certificate-file";
import {
  AGENCY_LABELS,
  addDays,
  businessDate,
  type CertificateAgency,
  certificateCourseTitle,
  certificateLinks,
  formatCertificateDate,
} from "@/shared/registration/student-certificates";

export type CertificateTarget =
  | { kind: "session"; id: Id<"registrationSessions"> }
  | { kind: "independent"; id: Id<"independentSessions"> };

export type CertificateRow = Doc<"studentCertificates"> & {
  sessionTitle?: string;
};

const PAGE = 50;
const SKIP = "__skip";
const UNLINKED = "__unlinked";

const AGENCY_SHORT: Record<CertificateAgency, string> = {
  aha: "AHA",
  arc: "ARC",
};
const COMPACT_LABELS: Record<CertificateAgency, string> = {
  aha: "Claim on AHA",
  arc: "View",
};

/** Valid, expiring within 60 days, expired, or renewed by a newer card. */
export function certificateState(
  row: Pick<CertificateRow, "expiresOn" | "supersededBy">
) {
  const today = businessDate(Date.now());
  if (row.supersededBy) {
    return { label: "Renewed", tone: "neutral" as BadgeTone };
  }
  if (row.expiresOn < today) {
    return { label: "Expired", tone: "danger" as BadgeTone };
  }
  const soon = addDays(today, 60);
  return row.expiresOn <= soon
    ? { label: "Expiring soon", tone: "warning" as BadgeTone }
    : { label: "Valid", tone: "success" as BadgeTone };
}

export function CertificateLinks({
  agency,
  certificateId,
  compact,
}: {
  agency: CertificateAgency;
  certificateId: string;
  compact?: boolean;
}) {
  const links = certificateLinks(agency, certificateId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        href={links.view.url}
        rel="noopener noreferrer"
        size="xs"
        target="_blank"
        variant="secondary"
      >
        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        {compact ? COMPACT_LABELS[agency] : links.view.label}
      </Button>
      {links.find && !compact ? (
        <a
          className="text-primary text-sm underline underline-offset-2"
          href={links.find.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {links.find.label}
        </a>
      ) : null}
    </div>
  );
}

/** Certificates as a table, for staff views. */
export function CertificateTable({
  rows,
  showStudent = true,
  showSession = false,
}: {
  rows: CertificateRow[];
  showStudent?: boolean;
  showSession?: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          {showStudent ? <TH>Student</TH> : null}
          <TH>Certificate</TH>
          <TH>ID</TH>
          <TH>Issued</TH>
          <TH>Expires</TH>
          {showSession ? <TH>Session</TH> : null}
          <TH className="text-right">
            <span className="sr-only">Links</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const state = certificateState(row);
          return (
            <TR key={row._id}>
              {showStudent ? (
                <TD>
                  <div className="font-medium text-slate-900">
                    {row.firstName} {row.lastName}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {row.email || "No email"}
                  </div>
                </TD>
              ) : null}
              <TD>
                <div className="font-medium text-slate-900">
                  {certificateCourseTitle(row.course)}
                </div>
                <div className="text-slate-500 text-xs">
                  {AGENCY_SHORT[row.agency]}
                  {row.instructor ? ` · ${row.instructor}` : ""}
                </div>
              </TD>
              <TD className="whitespace-nowrap font-mono text-xs">
                {row.certificateId}
              </TD>
              <TD className="whitespace-nowrap">
                {formatCertificateDate(row.issuedOn)}
              </TD>
              <TD className="whitespace-nowrap">
                <div>{formatCertificateDate(row.expiresOn)}</div>
                <Badge tone={state.tone}>{state.label}</Badge>
              </TD>
              {showSession ? (
                <TD className="text-sm">{row.sessionTitle ?? "—"}</TD>
              ) : null}
              <TD className="text-right">
                <CertificateLinks
                  agency={row.agency}
                  certificateId={row.certificateId}
                  compact
                />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

type Preview = {
  agency: CertificateAgency;
  course: string;
  courseTitle: string;
  trainingSite?: string;
  location?: string;
  sessionTitle: string;
  rows: {
    row: number;
    firstName: string;
    lastName: string;
    email: string;
    certificateId?: string;
    status: string;
    issuedOn: string;
    expiresOn: string;
    instructor?: string;
    match?: {
      status: "email" | "name" | "ambiguous" | "unmatched";
      attendeeId?: string;
      candidates: string[];
    };
    saved: boolean;
  }[];
  roster: { id: string; name: string; email: string }[];
  withoutCertificate: string[];
  emails: boolean;
  recentClass: boolean;
  email?: { to: string; subject: string; html: string };
};

type UploadedFile = { storageId: Id<"_storage">; fileName: string };

const MATCH_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  email: { label: "Matched by email", tone: "success" },
  name: { label: "Matched by name", tone: "info" },
  ambiguous: { label: "Choose attendee", tone: "warning" },
  unmatched: { label: "Not on roster", tone: "danger" },
};

function MatchCell({
  row,
  preview,
  choice,
  onChoose,
}: {
  row: Preview["rows"][number];
  preview: Preview;
  choice: string | undefined;
  onChoose: (value: string) => void;
}) {
  const { match } = row;
  if (!match) {
    return (
      <span className="text-slate-500 text-sm">No certificate issued</span>
    );
  }
  const flagged = !match.attendeeId;
  const candidates = new Set(match.candidates);
  const ordered = [
    ...preview.roster.filter((a) => candidates.has(a.id)),
    ...preview.roster.filter((a) => !candidates.has(a.id)),
  ];
  const value = choice ?? match.attendeeId ?? "";
  const label = MATCH_LABELS[match.status];
  return (
    <div className="space-y-1.5">
      <Badge tone={label.tone}>{label.label}</Badge>
      <Select
        aria-label={`Roster attendee for ${row.firstName} ${row.lastName}`}
        className={cn(
          "w-full min-w-48",
          flagged && !choice && "border-amber-400"
        )}
        onChange={(event) => onChoose(event.target.value)}
        value={value}
      >
        {flagged ? <option value="">Choose…</option> : null}
        {ordered.map((attendee) => (
          <option key={attendee.id} value={attendee.id}>
            {attendee.name} · {attendee.email}
          </option>
        ))}
        <option value={UNLINKED}>Save without a roster link</option>
        <option value={SKIP}>Don’t save this certificate</option>
      </Select>
    </div>
  );
}

function PreviewTable({
  preview,
  choices,
  setChoice,
}: {
  preview: Preview;
  choices: Record<number, string>;
  setChoice: (row: number, value: string) => void;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>In the file</TH>
          <TH>Certificate</TH>
          <TH>Roster attendee</TH>
        </tr>
      </THead>
      <TBody>
        {preview.rows.map((row) => (
          <TR key={row.row}>
            <TD>
              <div className="font-medium text-slate-900">
                {row.firstName} {row.lastName}
              </div>
              <div className="text-slate-500 text-xs">
                {row.email || "No email"}
              </div>
            </TD>
            <TD>
              {row.certificateId ? (
                <>
                  <div className="font-mono text-xs">{row.certificateId}</div>
                  <div className="text-slate-500 text-xs">
                    Expires {formatCertificateDate(row.expiresOn)}
                    {row.saved ? " · already saved" : ""}
                  </div>
                </>
              ) : (
                <span className="text-slate-500 text-xs">
                  {row.status || "Not issued"}
                </span>
              )}
            </TD>
            <TD>
              <MatchCell
                choice={choices[row.row]}
                onChoose={(value) => setChoice(row.row, value)}
                preview={preview}
                row={row}
              />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

type Decision = { row: number; attendeeId?: string; skip?: boolean };

function decisionsFor(preview: Preview, choices: Record<number, string>) {
  const missing: string[] = [];
  const decisions = preview.rows.flatMap((row): Decision[] => {
    if (!row.match) {
      return [];
    }
    const choice = choices[row.row];
    if (choice === undefined) {
      if (!row.match.attendeeId) {
        missing.push(`${row.firstName} ${row.lastName}`);
      }
      return [];
    }
    if (choice === SKIP) {
      return [{ row: row.row, skip: true }];
    }
    return [
      { row: row.row, attendeeId: choice === UNLINKED ? undefined : choice },
    ];
  });
  return { decisions, missing };
}

function ImportReview({
  preview,
  upload,
  target,
  onDone,
  onCancel,
}: {
  preview: Preview;
  upload: UploadedFile;
  target: CertificateTarget;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const confirm = useAction(api.studentCertificateFiles.confirm);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [sendEmail, setSendEmail] = useState(
    preview.emails && preview.recentClass
  );
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { decisions, missing } = decisionsFor(preview, choices);
  const issued = preview.rows.filter((row) => row.certificateId);
  const flagged = issued.filter((row) => !row.match?.attendeeId).length;
  const absent = preview.roster.filter((a) =>
    preview.withoutCertificate.includes(a.id)
  );
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await confirm({
        target,
        storageId: upload.storageId,
        fileName: upload.fileName,
        decisions,
        postClassEmail: sendEmail,
      });
      onDone(
        `Saved ${result.created} new and updated ${result.updated} certificates${result.emails ? `; ${result.emails} post-class emails queued` : ""}.`
      );
    } catch (failure) {
      setError(errorText(failure, "The certificates could not be saved."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {AGENCY_LABELS[preview.agency]} · {preview.courseTitle}
        </CardTitle>
        <p className="text-slate-600 text-sm">
          {upload.fileName} · {issued.length} certificates
          {flagged ? ` · ${flagged} need a match` : ""}
          {preview.location ? ` · ${preview.location}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {flagged ? (
          <Notice tone="warning">
            Match the highlighted rows to a roster attendee, save them without a
            roster link, or leave them out.
          </Notice>
        ) : null}
        <PreviewTable
          choices={choices}
          preview={preview}
          setChoice={(row, value) =>
            setChoices((current) => ({ ...current, [row]: value }))
          }
        />
        {absent.length ? (
          <Notice tone="warning">
            On the roster with no certificate in this file:{" "}
            {absent.map((a) => a.name).join(", ")}.
          </Notice>
        ) : null}
        {preview.emails ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4">
            <Toggle
              checked={sendEmail}
              description={
                preview.recentClass
                  ? "Each newly certified student gets a thank-you note with their certificate link, the course survey, and a Google review request. Their other post-class emails then skip the review request."
                  : "This class ended more than 30 days ago, so the email is off by default."
              }
              label="Send the post-class certificate email"
              onChange={setSendEmail}
            />
            {preview.email ? (
              <Button
                onClick={() => setEmailOpen(true)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Preview email
              </Button>
            ) : null}
          </div>
        ) : (
          <Notice tone="info">
            Certificates from independent sessions are saved to the student’s
            record. No email is sent.
          </Notice>
        )}
        <ResultNotice message={error} tone="danger" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={busy}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={busy || missing.length > 0}
            onClick={save}
            type="button"
          >
            {busy ? "Saving…" : "Save certificates"}
          </Button>
        </div>
      </CardContent>
      {preview.email ? (
        <Modal
          description={`To ${preview.email.to} · ${preview.email.subject}`}
          onClose={() => setEmailOpen(false)}
          open={emailOpen}
          title="Post-class email preview"
        >
          <iframe
            className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
            sandbox=""
            srcDoc={preview.email.html}
            title="Post-class email preview"
          />
        </Modal>
      ) : null}
    </Card>
  );
}

function UploadZone({
  busy,
  onFile,
}: {
  busy: string | null;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <Card>
      <CardContent className="p-0">
        <button
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
            dragging
              ? "border-primary bg-primary/5"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          )}
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const [file] = Array.from(event.dataTransfer.files);
            if (file) {
              onFile(file);
            }
          }}
          type="button"
        >
          <Upload aria-hidden="true" className="h-6 w-6 text-slate-400" />
          <span className="font-medium text-slate-900">
            {busy ?? "Upload issued certificates"}
          </span>
          <span className="text-slate-500 text-sm">
            AHA Student eCards export (.xlsx) or Red Cross ILT Class Roster
            (PDF)
          </span>
        </button>
        <input
          accept=".xlsx,.xls,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Choose a certificate file"
          className="sr-only"
          disabled={busy !== null}
          id={inputId}
          onChange={(event) => {
            const [file] = Array.from(event.target.files ?? []);
            if (file) {
              onFile(file);
            }
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
      </CardContent>
    </Card>
  );
}

function ImportedFiles({ target }: { target: CertificateTarget }) {
  const files = useQuery(api.studentCertificates.imports, { target });
  if (!files?.length) {
    return null;
  }
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-slate-900 text-sm">Uploaded files</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {files.map((file) => (
          <li
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            key={file._id}
          >
            <span className="flex min-w-0 items-center gap-2">
              <FileText
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-slate-400"
              />
              <span className="truncate">{file.fileName}</span>
              <span className="whitespace-nowrap text-slate-500 text-xs">
                {file.certificates} certificates ·{" "}
                {formatDateTime(file.uploadedAt)}
                {file.postClassEmail === "send" ? " · post-class email on" : ""}
                {file.postClassEmail === "skip"
                  ? " · post-class email off"
                  : ""}
              </span>
            </span>
            {file.url ? (
              <Button
                aria-label={`Download ${file.fileName}`}
                href={file.url}
                size="xs"
                target="_blank"
                variant="ghost"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Upload an agency file for one session, review the matches, save, and see
 * the certificates already saved for it.
 */
export function SessionCertificates({ target }: { target: CertificateTarget }) {
  const uploadUrl = useMutation(api.studentCertificates.uploadUrl);
  const previewFile = useAction(api.studentCertificateFiles.preview);
  const saved = usePaginatedQuery(
    api.studentCertificates.forTarget,
    { target },
    { initialNumItems: PAGE }
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "danger">("success");
  const [review, setReview] = useState<{
    preview: Preview;
    upload: UploadedFile;
  } | null>(null);

  const onFile = async (file: File) => {
    setMessage("");
    setReview(null);
    try {
      if (file.size > MAX_CERTIFICATE_FILE_BYTES) {
        throw new Error(`${file.name} is larger than 10 MB`);
      }
      setBusy(`Uploading ${file.name}…`);
      const url = await uploadUrl({ target });
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`${file.name} could not be uploaded`);
      }
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      setBusy(`Reading ${file.name}…`);
      const preview = await previewFile({ target, storageId });
      setReview({ preview, upload: { storageId, fileName: file.name } });
    } catch (error) {
      setTone("danger");
      setMessage(errorText(error, `${file.name} could not be read.`));
    } finally {
      setBusy(null);
    }
  };

  let list: React.ReactNode;
  if (saved.status === "LoadingFirstPage") {
    list = <Skeleton className="h-40" />;
  } else if (saved.results.length === 0) {
    list = (
      <EmptyState
        description="Upload the agency file after you issue cards. Each student’s certificate is saved to their record."
        icon={<Award aria-hidden="true" className="h-6 w-6" />}
        title="No certificates saved yet"
      />
    );
  } else {
    list = (
      <>
        <CertificateTable rows={saved.results} />
        {saved.status === "CanLoadMore" || saved.status === "LoadingMore" ? (
          <div className="flex justify-center">
            <Button
              disabled={saved.status === "LoadingMore"}
              onClick={() => saved.loadMore(PAGE)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Load more certificates
            </Button>
          </div>
        ) : null}
      </>
    );
  }
  return (
    <div className="space-y-5">
      {review ? (
        <ImportReview
          onCancel={() => setReview(null)}
          onDone={(text) => {
            setReview(null);
            setTone("success");
            setMessage(text);
          }}
          preview={review.preview}
          target={target}
          upload={review.upload}
        />
      ) : (
        <UploadZone busy={busy} onFile={onFile} />
      )}
      <ResultNotice message={message} tone={tone} />
      {list}
      <ImportedFiles target={target} />
    </div>
  );
}

/** The signed-in student's certificates, for the registration portal. */
export function MyCertificates() {
  const mine = usePaginatedQuery(
    api.studentCertificates.mine,
    {},
    { initialNumItems: 20 }
  );
  if (mine.status === "LoadingFirstPage" || mine.results.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="my-certificates" className="space-y-3">
      <h2 className="font-semibold text-lg text-slate-900" id="my-certificates">
        Your certificates
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {mine.results.map((row) => {
          const state = certificateState(row);
          const links = certificateLinks(row.agency, row.certificateId);
          return (
            <li key={row._id}>
              <Card className="h-full">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {certificateCourseTitle(row.course)}
                      </p>
                      <p className="text-slate-600 text-sm">
                        {AGENCY_LABELS[row.agency]}
                      </p>
                    </div>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-slate-500">
                        {row.agency === "aha" ? "eCard code" : "Certificate ID"}
                      </dt>
                      <dd className="font-mono">{row.certificateId}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Valid through</dt>
                      <dd>{formatCertificateDate(row.expiresOn)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Issued</dt>
                      <dd>{formatCertificateDate(row.issuedOn)}</dd>
                    </div>
                    {row.instructor ? (
                      <div>
                        <dt className="text-slate-500">Instructor</dt>
                        <dd>{row.instructor}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <CertificateLinks
                    agency={row.agency}
                    certificateId={row.certificateId}
                  />
                  <p className="text-slate-500 text-xs">{links.howTo}</p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      {mine.status === "CanLoadMore" ? (
        <Button
          onClick={() => mine.loadMore(20)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Show more certificates
        </Button>
      ) : null}
    </section>
  );
}

/** Staff: one student's certificates, by email. */
export function StudentCertificates({ email }: { email: string }) {
  const rows = usePaginatedQuery(
    api.studentCertificates.forStudent,
    { email },
    { initialNumItems: 20 }
  );
  if (rows.status === "LoadingFirstPage" || rows.results.length === 0) {
    return null;
  }
  return (
    <section aria-label={`Certificates for ${email}`} className="space-y-2">
      <h3 className="font-medium text-slate-900 text-sm">Certificates</h3>
      <CertificateTable rows={rows.results} showSession showStudent={false} />
      {rows.status === "CanLoadMore" ? (
        <Button
          onClick={() => rows.loadMore(20)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Load more certificates
        </Button>
      ) : null}
    </section>
  );
}
