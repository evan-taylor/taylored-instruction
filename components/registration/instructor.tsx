"use client";
import {
  useConvex,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { ChevronDown, ChevronUp, Download, Mail, Search } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { SessionFiles } from "@/components/admin/session-files";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Meter } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { BATCH } from "@/shared/registration/domain";
import { AgencyRosterExport } from "./agency-roster-export";
import { useAssignedSessions } from "./catalog";
import { errorText } from "./errors";
import {
  formatMeeting,
  formatRelative,
  formatWeekday,
  pluralize,
  shortZone,
} from "./format";

type AttendanceStatus = Doc<"registrationAttendance">["status"];
type Seat = Doc<"registrationSeats"> & {
  attendance: Pick<Doc<"registrationAttendance">, "meetingId" | "status">[];
  completion: string;
};
const EMAIL_BATCH = 50;
const ATTENDANCE_CHOICES = [
  { status: "present", label: "Present" },
  { status: "absent", label: "Absent" },
  { status: "not-recorded", label: "Clear" },
] as const;
const ROSTER_PAGE_SIZE = 50;

/* ---------------------------- Session list --------------------------- */

export function InstructorSessions() {
  const sessions = useAssignedSessions();
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <PageHeader
          description="Sessions you are assigned to teach. Open a roster to record attendance and outcomes."
          eyebrow="Instructor"
          title="Assigned sessions"
        />
        {sessions === undefined ? (
          <div aria-busy="true" className="space-y-3" role="status">
            <span className="sr-only">Loading sessions…</span>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : null}
        {sessions?.length === 0 ? (
          <EmptyState
            description="When an administrator assigns you to a session it will appear here."
            title="No assigned sessions"
          />
        ) : null}
        {sessions?.length ? (
          <Card>
            <CardContent className="p-0">
              <Table wrapperClassName="rounded-none border-0">
                <THead>
                  <TR>
                    <TH>Starts</TH>
                    <TH>Session</TH>
                    <TH>Seats</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Roster</TH>
                  </TR>
                </THead>
                <TBody>
                  {sessions.map((s) => (
                    <TR key={s._id}>
                      <TD className="whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {formatWeekday(s.firstStart, s.timeZone)}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {formatRelative(s.firstStart)}
                        </div>
                      </TD>
                      <TD>
                        <Link
                          className="font-medium text-slate-900 hover:text-primary"
                          href={`/instructor/sessions/${s._id}`}
                        >
                          {s.title}
                        </Link>
                        <div className="text-slate-500 text-xs">
                          {pluralize(s.meetings.length, "meeting")} ·{" "}
                          {shortZone(s.timeZone, s.firstStart)}
                        </div>
                      </TD>
                      <TD>
                        <Meter
                          label={`${s.reserved} of ${s.capacity} seats reserved`}
                          max={s.capacity}
                          value={s.reserved}
                        />
                      </TD>
                      <TD>
                        <StatusBadge status={s.state} />
                      </TD>
                      <TD className="text-right">
                        <Button
                          href={`/instructor/sessions/${s._id}`}
                          size="xs"
                          variant="secondary"
                        >
                          Open roster
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------- Roster ------------------------------ */

function completionTone(completion: string | undefined) {
  if (completion === "complete") {
    return "success" as const;
  }
  if (completion === "incomplete") {
    return "warning" as const;
  }
  return "neutral" as const;
}
function completionLabel(completion: string | undefined) {
  if (!completion) {
    return "Loading…";
  }
  return completion === "not-evaluated"
    ? "No outcomes"
    : completion.replaceAll("-", " ");
}

function AnswerList({ seat }: { seat: Seat }) {
  if (!seat.snapshot.questions.length) {
    return <p className="text-slate-500 text-sm">No questions asked.</p>;
  }
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {seat.snapshot.questions.map((q) => {
        const value = seat.snapshot.attendee.answers.find(
          (a) => a.id === q.id
        )?.value;
        return (
          <div key={q.id}>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">
              {q.title}
            </dt>
            <dd className="mt-0.5 text-slate-900 text-sm">
              {value === undefined ? "Not answered" : String(value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function AttendanceCell({
  seat,
  meetingId,
  bulkSaving,
}: {
  seat: Seat;
  meetingId: string;
  bulkSaving: boolean;
}) {
  const record = useMutation(api.registrationOperations.attendance);
  const [pending, setPending] = useState<AttendanceStatus>();
  const [error, setError] = useState("");
  const current =
    seat.attendance.find((row) => row.meetingId === meetingId)?.status ??
    "not-recorded";

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {ATTENDANCE_CHOICES.map(({ status, label }) => (
          <Button
            aria-label={`${label} attendance for ${seat.name}`}
            aria-pressed={
              status === "not-recorded" ? undefined : current === status
            }
            disabled={bulkSaving || pending !== undefined}
            key={status}
            onClick={async () => {
              if (current === status) {
                return;
              }
              setPending(status);
              setError("");
              try {
                await record({ seatId: seat._id, meetingId, status });
              } catch (failure) {
                setError(errorText(failure));
              } finally {
                setPending(undefined);
              }
            }}
            size="xs"
            type="button"
            variant={
              current === status && status !== "not-recorded"
                ? "primary"
                : "secondary"
            }
          >
            {label}
          </Button>
        ))}
      </div>
      <span aria-live="polite" className="text-slate-500 text-xs">
        {pending ? "Saving…" : null}
        {!pending && current === "not-recorded" ? "Not recorded" : null}
      </span>
      <ResultNotice message={error} tone="danger" />
    </>
  );
}

function OutcomeField({
  seatId,
  definition,
  current,
}: {
  seatId: Seat["_id"];
  definition: Seat["outcomeDefinitions"][number];
  current: string | number | undefined;
}) {
  const record = useMutation(api.registrationOperations.recordOutcome);
  const [draft, setDraft] = useState<string>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const saving = useRef(false);
  const percentage = definition.type === "percentage";
  const value = draft ?? String(current ?? "");

  async function save(next: string | number) {
    if (saving.current || next === current) {
      return;
    }
    saving.current = true;
    setError("");
    setStatus("Saving…");
    try {
      await record({ seatId, fieldId: definition.id, value: next });
      setDraft(undefined);
      setStatus("Saved");
    } catch (failure) {
      if (!percentage) {
        setDraft(undefined);
      }
      setStatus("");
      setError(`Couldn’t save outcome. ${errorText(failure)}`);
    } finally {
      saving.current = false;
    }
  }

  async function saveScore(input: HTMLInputElement) {
    if (draft === undefined || saving.current) {
      return;
    }
    if (input.validity.badInput || (input.value && !input.validity.valid)) {
      setError("Enter a score from 0 to 100.");
      return;
    }
    if (!input.value || input.valueAsNumber === current) {
      setDraft(undefined);
      setError("");
      return;
    }
    await save(input.valueAsNumber);
  }

  return (
    <div>
      <Field
        error={error}
        hint={
          percentage && definition.minimum !== undefined
            ? `Passing score: ${definition.minimum}% or higher`
            : undefined
        }
        label={`${definition.title} ${definition.required ? "(required)" : "(informational)"}`}
      >
        {(props) =>
          percentage ? (
            <TextInput
              {...props}
              max={100}
              min={0}
              onBlur={(event) => saveScore(event.currentTarget)}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
                setStatus("");
              }}
              onKeyDown={async (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  await saveScore(event.currentTarget);
                }
              }}
              readOnly={status === "Saving…"}
              step="any"
              type="number"
              value={value}
            />
          ) : (
            <Select
              {...props}
              disabled={status === "Saving…"}
              onChange={async (event) => {
                const choice = event.target.value;
                setDraft(choice);
                await save(choice);
              }}
              value={value}
            >
              <option disabled value="">
                Choose…
              </option>
              {definition.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          )
        }
      </Field>
      <span aria-live="polite" className="text-slate-500 text-xs">
        {status}
      </span>
    </div>
  );
}

function SeatDetails({
  seat,
  data,
}: {
  seat: Seat;
  data: { values: Doc<"registrationOutcomes">[] } | undefined;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900 text-sm">Answers</h3>
        <AnswerList seat={seat} />
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold text-slate-900 text-sm">Outcomes</h3>
        {data?.values &&
          seat.outcomeDefinitions.map((definition) => (
            <OutcomeField
              current={
                data.values.find(
                  (value) =>
                    value.fieldId === definition.id &&
                    value.version === definition.version
                )?.value
              }
              definition={definition}
              key={`${definition.id}:${definition.version}`}
              seatId={seat._id}
            />
          ))}
        {!data && seat.outcomeDefinitions.length > 0 ? (
          <p role="status">Loading outcomes…</p>
        ) : null}
        {seat.outcomeDefinitions.length === 0 ? (
          <p className="text-slate-500 text-sm">
            This course has no outcome fields.
          </p>
        ) : null}
        <p className="text-slate-500 text-xs">
          Completion overrides are handled by administrators.
        </p>
      </section>
    </div>
  );
}

function RosterRow({
  seat,
  meetingId,
  bulkSaving,
  selected,
  onSelect,
}: {
  seat: Seat;
  meetingId: string | undefined;
  bulkSaving: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const data = useQuery(
    api.registrationOperations.outcomeState,
    open ? { seatId: seat._id } : "skip"
  );
  return (
    <>
      <TR className={cn(open && "bg-slate-50/70")}>
        <TD>
          <input
            aria-label={`Select ${seat.name}`}
            checked={selected}
            className="h-4 w-4 rounded-sm border-slate-300 accent-primary"
            onChange={(e) => onSelect(e.target.checked)}
            type="checkbox"
          />
        </TD>
        <TD>
          <div className="font-medium text-slate-900">{seat.name}</div>
          <div className="text-slate-500 text-xs">{seat.email}</div>
        </TD>
        <TD>
          <StatusBadge status={seat.state} />
        </TD>
        <TD>
          <Badge className="capitalize" tone={completionTone(seat.completion)}>
            {completionLabel(seat.completion)}
          </Badge>
        </TD>
        {meetingId ? (
          <TD>
            <AttendanceCell
              bulkSaving={bulkSaving}
              meetingId={meetingId}
              seat={seat}
            />
          </TD>
        ) : null}
        <TD className="text-right">
          <Button
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} details for ${seat.name}`}
            onClick={() => setOpen(!open)}
            size="xs"
            type="button"
            variant="ghost"
          >
            {open ? (
              <ChevronUp aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            )}
            {open ? "Hide" : "Details"}
          </Button>
        </TD>
      </TR>
      {open ? (
        <TR className="hover:bg-white">
          <TD className="bg-slate-50/40 px-6 py-5" colSpan={meetingId ? 6 : 5}>
            <SeatDetails data={data} seat={seat} />
          </TD>
        </TR>
      ) : null}
    </>
  );
}

function EmailDialog({
  open,
  onClose,
  sessionId,
  seats,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: Id<"registrationSessions">;
  seats: Id<"registrationSeats">[];
  onResult: (message: string) => void;
}) {
  const send = useMutation(api.registrationOperations.selectedEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  // One attempt per message: the key and progress survive a failed batch so
  // retrying resumes where it stopped instead of re-queueing earlier batches.
  const attempt = useRef({ signature: "", key: "", sent: 0 });
  async function submit() {
    setBusy(true);
    try {
      const signature = JSON.stringify({ seats, subject, body });
      if (attempt.current.signature !== signature) {
        attempt.current = { signature, key: crypto.randomUUID(), sent: 0 };
      }
      // The backend accepts up to EMAIL_BATCH recipients per call.
      while (attempt.current.sent < seats.length) {
        const start = attempt.current.sent;
        // biome-ignore lint/performance/noAwaitInLoops: batches must be sequential so progress is tracked
        await send({
          sessionId,
          seats: seats.slice(start, start + EMAIL_BATCH),
          subject,
          body,
          requestKey: `${attempt.current.key}:${start / EMAIL_BATCH}`,
        });
        attempt.current.sent = start + EMAIL_BATCH;
      }
      attempt.current = { signature: "", key: "", sent: 0 };
      onResult("Selected-attendee message queued");
      setSubject("");
      setBody("");
      onClose();
    } catch (error) {
      onResult(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      description={`Sends to ${pluralize(seats.length, "selected attendee")}.`}
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={busy || !seats.length || !subject.trim() || !body.trim()}
            onClick={submit}
            size="sm"
            type="button"
          >
            {busy ? "Sending…" : `Send to ${seats.length} selected attendees`}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="Email selected attendees"
    >
      <div className="space-y-4">
        <Field label="Subject">
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => setSubject(e.target.value)}
              required
              value={subject}
            />
          )}
        </Field>
        <Field label="Message">
          {(props) => (
            <TextArea
              {...props}
              className="min-h-40"
              onChange={(e) => setBody(e.target.value)}
              required
              value={body}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

type RosterPage = { csv: string; isDone: boolean; continueCursor: string };
type FetchPage = (cursor: string | null) => Promise<RosterPage>;

/** Pages are sequential by design: each cursor comes from the prior page. */
async function collectPages(
  fetchPage: FetchPage,
  cursor: string | null,
  pages: string[]
): Promise<string[]> {
  const page = await fetchPage(cursor);
  pages.push(cursor ? page.csv.slice(page.csv.indexOf("\n") + 1) : page.csv);
  if (page.isDone) {
    return pages;
  }
  return collectPages(fetchPage, page.continueCursor, pages);
}
async function downloadRoster(fetchPage: FetchPage) {
  const pages = await collectPages(fetchPage, null, []);
  const url = URL.createObjectURL(
    new Blob([pages.join("\n")], { type: "text/csv" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "internal-roster-not-for-agency-upload.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function AttendanceToolbar({
  attendanceSeats,
  bulkSaving,
  meetingId,
  meetings,
  onMeetingChange,
  onSavingChange,
  sessionId,
  timeZone,
}: {
  attendanceSeats: Id<"registrationSeats">[];
  bulkSaving: boolean;
  meetingId: string;
  meetings: Doc<"registrationSessions">["meetings"];
  onMeetingChange: (meetingId: string) => void;
  onSavingChange: (saving: boolean) => void;
  sessionId: Id<"registrationSessions">;
  timeZone?: string;
}) {
  const recordBulk = useMutation(api.registrationOperations.bulkAttendance);
  const [attendanceResult, setAttendanceResult] = useState<{
    message: string;
    tone: "danger" | "success";
  }>();
  async function markSelected(status: "present" | "absent") {
    if (!attendanceSeats.length || bulkSaving) {
      return;
    }
    onSavingChange(true);
    setAttendanceResult(undefined);
    let processed = 0;
    try {
      while (processed < attendanceSeats.length) {
        // biome-ignore lint/performance/noAwaitInLoops: finish each batch before starting the next
        await recordBulk({
          sessionId,
          meetingId,
          status,
          seatIds: attendanceSeats.slice(processed, processed + BATCH),
        });
        processed = Math.min(processed + BATCH, attendanceSeats.length);
      }
      setAttendanceResult({
        message: `Marked ${pluralize(processed, "attendee")} ${status}.`,
        tone: "success",
      });
    } catch (error) {
      setAttendanceResult({
        message: `Saved ${processed} of ${attendanceSeats.length} attendance updates. ${errorText(error)}`,
        tone: "danger",
      });
    } finally {
      onSavingChange(false);
    }
  }
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="font-semibold text-slate-900">Attendance</h2>
        <div className="flex flex-wrap items-end gap-3">
          {meetings.length > 1 ? (
            <Field label="Meeting">
              {(props) => (
                <Select
                  {...props}
                  disabled={bulkSaving}
                  onChange={(event) => {
                    setAttendanceResult(undefined);
                    onMeetingChange(event.target.value);
                  }}
                  value={meetingId}
                >
                  {meetings.map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>
                      {formatMeeting(meeting, timeZone)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={bulkSaving || !attendanceSeats.length}
              onClick={() => markSelected("present")}
              size="sm"
              type="button"
            >
              Mark selected present
            </Button>
            <Button
              disabled={bulkSaving || !attendanceSeats.length}
              onClick={() => markSelected("absent")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Mark selected absent
            </Button>
          </div>
        </div>
        <p aria-live="polite" className="text-slate-500 text-sm">
          {bulkSaving
            ? "Saving attendance…"
            : `${pluralize(attendanceSeats.length, "active attendee")} selected for attendance. Use the roster checkboxes to select attendees.`}
        </p>
        {attendanceResult ? <ResultNotice {...attendanceResult} /> : null}
      </CardContent>
    </Card>
  );
}

export function InstructorRoster({
  sessionId,
  embedded = false,
}: {
  sessionId: Id<"registrationSessions">;
  /** Renders without the page chrome, for use inside the admin session page. */
  embedded?: boolean;
}) {
  const session = useQuery(api.registrationOperations.sessionForStaff, {
    sessionId,
  });
  const roster = usePaginatedQuery(
    api.registrationOperations.roster,
    { sessionId },
    { initialNumItems: ROSTER_PAGE_SIZE }
  );
  const convex = useConvex();
  const [chosenMeeting, setChosenMeeting] = useState<string>();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Id<"registrationSeats">[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const needle = search.trim().toLowerCase();
  const emptyRosterDescription = needle
    ? "No loaded attendees match your search."
    : "Attendees appear here as registrations are paid.";
  const visible = roster.results.filter((s) =>
    `${s.name} ${s.email}`.toLowerCase().includes(needle)
  );
  const selectedIds = new Set(selected);
  const allVisibleSelected =
    visible.length > 0 && visible.every((s) => selectedIds.has(s._id));
  const attendanceSeats = roster.results
    .filter((seat) => seat.state === "active" && selectedIds.has(seat._id))
    .map((seat) => seat._id);
  const meetings = session?.meetings ?? [];
  const meetingId =
    meetings.find((meeting) => meeting.id === chosenMeeting)?.id ??
    meetings.at(0)?.id;

  if (session === null) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <EmptyState
            action={
              <Button href="/instructor/sessions" size="sm">
                Assigned sessions
              </Button>
            }
            description="It may have been removed, or you aren’t assigned to teach it."
            title="This session isn’t available to you."
          />
        </div>
      </div>
    );
  }
  const actions = (
    <>
      <Button
        disabled={!selected.length}
        onClick={() => {
          setMessage("");
          setEmailOpen(true);
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Mail aria-hidden="true" className="h-4 w-4" />
        Email selected ({selected.length})
      </Button>
      <Button
        disabled={exporting}
        onClick={async () => {
          setExporting(true);
          setMessage("");
          try {
            await downloadRoster((cursor) =>
              convex.query(api.registrationOperations.exportRoster, {
                sessionId,
                paginationOpts: { numItems: 100, cursor },
              })
            );
            setMessage(
              "Roster CSV downloaded. Use Export agency roster for ARC or AHA uploads."
            );
          } catch (error) {
            setMessage(errorText(error));
          } finally {
            setExporting(false);
          }
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        {exporting ? "Exporting…" : "Download CSV"}
      </Button>
      {session ? <AgencyRosterExport session={session} /> : null}
    </>
  );
  const body = (
    <>
      <ResultNotice message={message} />
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Field className="w-full sm:max-w-sm" label="Search loaded attendees">
            {(props) => (
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400"
                />
                <TextInput
                  {...props}
                  className="pl-9"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or email"
                  type="search"
                  value={search}
                />
              </div>
            )}
          </Field>
          <p className="text-slate-500 text-sm">
            {pluralize(visible.length, "attendee")} shown ·{" "}
            {pluralize(selected.length, "selected", "selected")}
          </p>
        </CardContent>
      </Card>
      {meetingId ? (
        <AttendanceToolbar
          attendanceSeats={attendanceSeats}
          bulkSaving={bulkSaving}
          meetingId={meetingId}
          meetings={meetings}
          onMeetingChange={setChosenMeeting}
          onSavingChange={setBulkSaving}
          sessionId={sessionId}
          timeZone={session?.timeZone}
        />
      ) : null}
      <Card>
        <CardContent className="p-0">
          {roster.status === "LoadingFirstPage" ? (
            <div aria-busy="true" className="space-y-3 p-5" role="status">
              <span className="sr-only">Loading roster…</span>
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : null}
          {roster.status !== "LoadingFirstPage" && !visible.length ? (
            <div className="p-5">
              <EmptyState
                description={emptyRosterDescription}
                title="No attendees"
              />
            </div>
          ) : null}
          {visible.length ? (
            <Table wrapperClassName="rounded-none border-0">
              <THead>
                <TR>
                  <TH className="w-10">
                    <input
                      aria-label="Select all shown attendees"
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded-sm border-slate-300 accent-primary"
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visible.map((s) => s._id),
                                ]),
                              ]
                            : selected.filter(
                                (id) => !visible.some((s) => s._id === id)
                              )
                        )
                      }
                      type="checkbox"
                    />
                  </TH>
                  <TH>Attendee</TH>
                  <TH>State</TH>
                  <TH>Completion</TH>
                  {meetingId ? <TH>Attendance</TH> : null}
                  <TH className="text-right">Record</TH>
                </TR>
              </THead>
              <TBody>
                {visible.map((seat) => (
                  <RosterRow
                    bulkSaving={bulkSaving}
                    key={seat._id}
                    meetingId={meetingId}
                    onSelect={(checked) =>
                      setSelected(
                        checked
                          ? [...selected, seat._id]
                          : selected.filter((id) => id !== seat._id)
                      )
                    }
                    seat={seat}
                    selected={selectedIds.has(seat._id)}
                  />
                ))}
              </TBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
      {["CanLoadMore", "LoadingMore"].includes(roster.status) ? (
        <div className="flex justify-center">
          <Button
            disabled={roster.status === "LoadingMore"}
            onClick={() => roster.loadMore(ROSTER_PAGE_SIZE)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {roster.status === "LoadingMore"
              ? "Loading…"
              : "Load more attendees"}
          </Button>
        </div>
      ) : null}
      <EmailDialog
        onClose={() => setEmailOpen(false)}
        onResult={setMessage}
        open={emailOpen}
        seats={selected}
        sessionId={sessionId}
      />
    </>
  );
  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
        {body}
      </div>
    );
  }
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <Link
          className="font-medium text-primary text-sm underline-offset-2 hover:underline"
          href="/instructor/sessions"
        >
          ← Assigned sessions
        </Link>
        <PageHeader
          actions={actions}
          description={
            session
              ? `${meetings.map((m) => formatMeeting(m, session.timeZone)).join(" · ")} ${shortZone(session.timeZone, session.firstStart)} · ${session.reserved} of ${session.capacity} seats reserved`
              : "Loading session details…"
          }
          eyebrow="Roster"
          title={session?.title ?? "Session roster"}
        />
        {body}
        <section className="space-y-4">
          <h2 className="font-semibold text-slate-900 text-xl">Files</h2>
          <p className="text-slate-500 text-sm">
            Sign-in sheets, handouts, and paperwork shared by administrators for
            this session. You can add files too.
          </p>
          <SessionFiles sessionId={sessionId} />
        </section>
      </div>
    </div>
  );
}
