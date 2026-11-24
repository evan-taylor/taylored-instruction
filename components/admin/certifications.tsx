"use client";
import { useQuery } from "convex/react";
import { AlertTriangle, CalendarClock, Download, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CertificationForm,
  CertificationList,
  CertificationStatusBadge,
  useCertificationToday,
} from "@/components/certifications/certifications";
import { formatDateTime } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  agencyShortLabel,
  CERTIFICATION_AGENCIES,
  CERTIFICATION_TYPES,
  certificationStatus,
  expiringCounts,
  filterCertifications,
  formatCertificationDate,
  instructorsMissing,
  type ReportFilter,
  reminderLabel,
  typeLabel,
} from "@/shared/instructor-certifications";
import { csv } from "@/shared/registration/domain";

type Status = "all" | "valid" | "expiring" | "expired" | "missing";
const STATUSES: { value: Status; label: string }[] = [
  { value: "all", label: "All certifications" },
  { value: "valid", label: "Valid" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "missing", label: "Missing a certification" },
];

const ACTIONS: Record<string, string> = {
  added: "Added",
  updated: "Edited",
  renewed: "Renewed",
  removed: "Removed",
  verified: "Verified",
  unverified: "Verification removed",
  "card-uploaded": "Card uploaded",
  "card-removed": "Card removed",
};

function download(name: string, rows: string[][]) {
  const url = URL.createObjectURL(
    new Blob([csv(rows)], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function InstructorDetail({
  userId,
  onClose,
}: {
  userId: Id<"users"> | null;
  onClose: () => void;
}) {
  const today = useCertificationToday();
  const detail = useQuery(
    api.instructorCertifications.forInstructor,
    userId ? { userId, today } : "skip"
  );
  return (
    <Modal
      description={detail?.instructor.email}
      onClose={onClose}
      open={userId !== null}
      size="xl"
      title={detail?.instructor.name ?? "Instructor"}
    >
      {detail ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-900">Certifications</h3>
            <CertificationList
              certifications={detail.certifications}
              emptyText="No certifications on file."
              staff
              userId={detail.instructor.userId}
            />
          </section>
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-900">Reminder emails</h3>
            {detail.reminders.length ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Certification</TH>
                    <TH>Reminder</TH>
                    <TH>For expiration</TH>
                    <TH>Status</TH>
                    <TH>When</TH>
                  </TR>
                </THead>
                <TBody>
                  {detail.reminders.map((row) => (
                    <TR key={row.id}>
                      <TD>{row.certification}</TD>
                      <TD>{row.label}</TD>
                      <TD className="tabular-nums">
                        {formatCertificationDate(row.expiresOn)}
                      </TD>
                      <TD>
                        <StatusBadge status={row.state} />
                        {row.error ? (
                          <p className="mt-1 text-rose-700 text-xs">
                            {row.error}
                          </p>
                        ) : null}
                      </TD>
                      <TD className="whitespace-nowrap text-slate-600">
                        {formatDateTime(row.at)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-slate-600 text-sm">No reminders sent yet.</p>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-900">Audit log</h3>
            {detail.activity.length ? (
              <ul className="list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
                {detail.activity.map((row) => (
                  <li className="px-4 py-3 text-sm" key={row.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        {ACTIONS[row.action] ?? row.action} by {row.actor}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {formatDateTime(row.at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-600">{row.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600 text-sm">No changes recorded.</p>
            )}
          </section>
        </div>
      ) : (
        <Skeleton className="h-48" />
      )}
    </Modal>
  );
}

function AddForInstructor({
  instructors,
  open,
  onClose,
}: {
  instructors: { userId: Id<"users">; name: string }[];
  open: boolean;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState<Id<"users"> | "">("");
  if (userId && open) {
    return (
      <CertificationForm
        onClose={() => {
          setUserId("");
          onClose();
        }}
        open
        userId={userId}
      />
    );
  }
  return (
    <Modal
      description="Staff can enter a certification for any instructor. It is logged under your name."
      onClose={onClose}
      open={open}
      size="sm"
      title="Add a certification for…"
    >
      <Field label="Instructor">
        {(props) => (
          <Select
            {...props}
            onChange={(event) => setUserId(event.target.value as Id<"users">)}
            value={userId}
          >
            <option disabled value="">
              Choose an instructor
            </option>
            {instructors.map((instructor) => (
              <option key={instructor.userId} value={instructor.userId}>
                {instructor.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </Modal>
  );
}

export function CertificationsAdmin() {
  const today = useCertificationToday();
  const report = useQuery(api.instructorCertifications.report, { today });
  const params = useSearchParams();
  const [userId, setUserId] = useState("");
  const [agency, setAgency] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<Status>(
    (params.get("status") as Status | null) ?? "all"
  );
  const [withinDays, setWithinDays] = useState(
    Number(params.get("within")) || 30
  );
  const [open, setOpen] = useState<Id<"users"> | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    if (!report || status === "missing") {
      return [];
    }
    const filter: ReportFilter = {
      userId: userId || undefined,
      agency: agency || undefined,
      type: type || undefined,
      status,
      withinDays,
    };
    return filterCertifications(report.certifications, filter, report.today);
  }, [report, userId, agency, type, status, withinDays]);

  const missing = useMemo(() => {
    if (!(report && status === "missing" && type)) {
      return [];
    }
    return instructorsMissing(
      report.instructors.filter((i) => !userId || i.userId === userId),
      report.certifications,
      type,
      report.today,
      agency || undefined
    );
  }, [report, status, type, agency, userId]);

  if (!report) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const current = report.certifications.filter((row) => !row.superseded);
  const counts = expiringCounts(
    current.map((row) => row.expiresOn),
    report.today
  );
  const missingLabel = `${agency ? `${agencyShortLabel(agency)} ` : ""}${typeLabel(type)}`;

  const exportCsv = () => {
    if (status === "missing") {
      download(`instructors-missing-${type}-${report.today}.csv`, [
        ["Instructor", "Email", "Missing"],
        ...missing.map((i) => [i.name, i.email, missingLabel]),
      ]);
      return;
    }
    download(`instructor-certifications-${report.today}.csv`, [
      [
        "Instructor",
        "Email",
        "Agency",
        "Certification",
        "Certificate ID",
        "Issued",
        "Expires",
        "Status",
        "Verified by staff",
        "Last reminder",
      ],
      ...filtered.map((row) => [
        row.instructor,
        row.email,
        agencyShortLabel(row.agency, row.agencyOther),
        typeLabel(row.type, row.typeOther),
        row.number ?? "",
        row.issuedOn,
        row.expiresOn,
        row.superseded
          ? "replaced"
          : certificationStatus(
              row.expiresOn,
              report.today,
              status === "expiring" ? withinDays : 90
            ),
        row.verified ? row.verified.by : "",
        row.lastReminder ? reminderLabel(row.lastReminder.threshold) : "",
      ]),
    ]);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button
              disabled={status === "missing" && !type}
              onClick={exportCsv}
              size="sm"
              variant="secondary"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setAdding(true)} size="sm">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add for instructor
            </Button>
          </>
        }
        description="Every instructor's teaching certifications, renewal status, and reminder history."
        title="Instructor certifications"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          hint="Not yet renewed"
          icon={<AlertTriangle aria-hidden="true" className="h-5 w-5" />}
          label="Expired"
          tone={counts.expired ? "danger" : "neutral"}
          value={counts.expired}
        />
        {([30, 60, 90] as const).map((days) => (
          <StatTile
            hint={`Expiring in the next ${days} days`}
            icon={<CalendarClock aria-hidden="true" className="h-5 w-5" />}
            key={days}
            label={`Within ${days} days`}
            tone={days === 30 && counts.within30 ? "warning" : "neutral"}
            value={counts[`within${days}`]}
          />
        ))}
      </div>
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Instructor">
          {(props) => (
            <Select
              {...props}
              onChange={(event) => setUserId(event.target.value)}
              value={userId}
            >
              <option value="">All instructors</option>
              {report.instructors.map((instructor) => (
                <option key={instructor.userId} value={instructor.userId}>
                  {instructor.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Agency">
          {(props) => (
            <Select
              {...props}
              onChange={(event) => setAgency(event.target.value)}
              value={agency}
            >
              <option value="">All agencies</option>
              {CERTIFICATION_AGENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Certification">
          {(props) => (
            <Select
              {...props}
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              <option value="">All certifications</option>
              {CERTIFICATION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Status">
          {(props) => (
            <Select
              {...props}
              onChange={(event) => setStatus(event.target.value as Status)}
              value={status}
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          hint={status === "expiring" ? undefined : "Used by Expiring soon"}
          label="Expiring within (days)"
        >
          {(props) => (
            <TextInput
              {...props}
              disabled={status !== "expiring"}
              inputMode="numeric"
              min={0}
              onChange={(event) =>
                setWithinDays(Math.max(0, Number(event.target.value) || 0))
              }
              type="number"
              value={withinDays}
            />
          )}
        </Field>
      </div>
      {status === "missing" ? (
        <section className="space-y-3">
          {type ? (
            <>
              <h2 className="font-semibold text-slate-900">
                Instructors without a current {missingLabel}
              </h2>
              {missing.length ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Instructor</TH>
                      <TH>Email</TH>
                      <TH className="text-right">Certifications</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {missing.map((instructor) => (
                      <TR key={instructor.userId}>
                        <TD className="font-medium text-slate-900">
                          {instructor.name}
                        </TD>
                        <TD className="text-slate-600">{instructor.email}</TD>
                        <TD className="text-right">
                          <Button
                            onClick={() => setOpen(instructor.userId)}
                            size="xs"
                            variant="ghost"
                          >
                            Open
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <Notice tone="success">
                  Every instructor holds a current {missingLabel}.
                </Notice>
              )}
            </>
          ) : (
            <Notice tone="info">
              Choose a certification to see which instructors don’t hold a
              current one. Pick an agency to narrow it further.
            </Notice>
          )}
        </section>
      ) : (
        <section>
          {filtered.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Instructor</TH>
                  <TH>Certification</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                  <TH>Card</TH>
                  <TH>Last reminder</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <button
                        className="font-medium text-slate-900 hover:text-primary hover:underline"
                        onClick={() => setOpen(row.userId)}
                        type="button"
                      >
                        {row.instructor}
                      </button>
                      <div className="text-slate-500 text-xs">{row.email}</div>
                    </TD>
                    <TD>
                      <div className="text-slate-900">
                        {typeLabel(row.type, row.typeOther)}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {agencyShortLabel(row.agency, row.agencyOther)}
                        {row.number ? ` · ${row.number}` : ""}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap tabular-nums">
                      {formatCertificationDate(row.expiresOn)}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        <CertificationStatusBadge
                          daysLeft={row.daysLeft}
                          superseded={row.superseded}
                        />
                        {row.verified ? (
                          <Badge tone="info">Verified</Badge>
                        ) : null}
                      </div>
                    </TD>
                    <TD>
                      {row.card?.url ? (
                        <a
                          className="text-primary hover:underline"
                          href={row.card.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-slate-600">
                      {row.lastReminder
                        ? reminderLabel(row.lastReminder.threshold)
                        : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              description={
                report.certifications.length
                  ? "No certifications match these filters."
                  : "Instructors add certifications from their account page, or staff can add them here."
              }
              title="No certifications to show"
            />
          )}
        </section>
      )}
      <InstructorDetail onClose={() => setOpen(null)} userId={open} />
      <AddForInstructor
        instructors={report.instructors}
        onClose={() => setAdding(false)}
        open={adding}
      />
    </div>
  );
}
