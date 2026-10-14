"use client";
import {
  useConvex,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { ChevronDown, ChevronUp, Download, Mail, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import {
  formatMeeting,
  formatRelative,
  formatWeekday,
  pluralize,
  shortZone,
} from "./format";

type Seat = Doc<"registrationSeats">;
type Meeting = Doc<"registrationSessions">["meetings"][number];
type AttendanceStatus = "present" | "absent" | "not-recorded";

/* ---------------------------- Session list --------------------------- */

export function InstructorSessions() {
  const sessions = useQuery(api.registrationOperations.assignedSessions);
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
                          {shortZone(s.timeZone)}
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
    return <p className="m-0 text-slate-500 text-sm">No questions asked.</p>;
  }
  return (
    <dl className="m-0 grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {seat.snapshot.questions.map((q) => {
        const value = seat.snapshot.attendee.answers.find(
          (a) => a.id === q.id
        )?.value;
        return (
          <div key={q.id}>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">
              {q.title}
            </dt>
            <dd className="m-0 mt-0.5 text-slate-900 text-sm">
              {value === undefined ? "Not answered" : String(value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function AttendanceControls({
  seat,
  meetings,
  timeZone,
  attendance,
  onError,
}: {
  seat: Seat;
  meetings: Meeting[];
  timeZone?: string;
  attendance: Doc<"registrationAttendance">[] | undefined;
  onError: (message: string) => void;
}) {
  const record = useMutation(api.registrationOperations.attendance);
  if (!meetings.length) {
    return <p className="m-0 text-slate-500 text-sm">No meetings scheduled.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {meetings.map((m) => (
        <Field
          key={m.id}
          label={`${formatMeeting(m, timeZone)}${timeZone ? ` ${shortZone(timeZone)}` : ""}`}
        >
          {(props) => (
            <Select
              {...props}
              onChange={async (e) => {
                try {
                  await record({
                    seatId: seat._id,
                    meetingId: m.id,
                    status: e.target.value as AttendanceStatus,
                  });
                } catch (error) {
                  onError(String(error));
                }
              }}
              value={
                attendance?.find((a) => a.meetingId === m.id)?.status ??
                "not-recorded"
              }
            >
              <option value="not-recorded">Not recorded</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </Select>
          )}
        </Field>
      ))}
    </div>
  );
}

function OutcomeForm({
  seat,
  definition,
  current,
  onResult,
}: {
  seat: Seat;
  definition: Seat["outcomeDefinitions"][number];
  current: string | number | undefined;
  onResult: (message: string) => void;
}) {
  const record = useMutation(api.registrationOperations.recordOutcome);
  const [busy, setBusy] = useState(false);
  const label = `${definition.title} ${definition.required ? "(required)" : "(informational)"}`;
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("value");
        setBusy(true);
        try {
          await record({
            seatId: seat._id,
            fieldId: definition.id,
            value:
              definition.type === "percentage" ? Number(value) : String(value),
          });
          onResult("Outcome saved");
        } catch (error) {
          onResult(String(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        className="min-w-48 flex-1"
        hint={
          definition.type === "percentage" && definition.minimum !== undefined
            ? `Passing score: ${definition.minimum}% or higher`
            : undefined
        }
        label={label}
      >
        {(props) =>
          definition.type === "percentage" ? (
            <TextInput
              {...props}
              defaultValue={current === undefined ? "" : String(current)}
              max={100}
              min={0}
              name="value"
              required
              type="number"
            />
          ) : (
            <Select
              {...props}
              defaultValue={current === undefined ? "" : String(current)}
              name="value"
              required
            >
              <option value="">Choose…</option>
              {definition.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          )
        }
      </Field>
      <Button disabled={busy} size="sm" type="submit" variant="secondary">
        {busy ? "Saving…" : "Save outcome"}
      </Button>
    </form>
  );
}

function SeatDetails({
  seat,
  meetings,
  timeZone,
  data,
}: {
  seat: Seat;
  meetings: Meeting[];
  timeZone?: string;
  data:
    | {
        values: Doc<"registrationOutcomes">[];
        attendance: Doc<"registrationAttendance">[];
        completion: string;
      }
    | undefined;
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-2">
        <h3 className="m-0 font-semibold text-slate-900 text-sm">Answers</h3>
        <AnswerList seat={seat} />
      </section>
      <section className="space-y-2">
        <h3 className="m-0 font-semibold text-slate-900 text-sm">Attendance</h3>
        <AttendanceControls
          attendance={data?.attendance}
          meetings={meetings}
          onError={setMessage}
          seat={seat}
          timeZone={timeZone}
        />
      </section>
      <section className="space-y-3 lg:col-span-2">
        <h3 className="m-0 font-semibold text-slate-900 text-sm">Outcomes</h3>
        {seat.outcomeDefinitions.length ? (
          seat.outcomeDefinitions.map((d) => (
            <OutcomeForm
              current={data?.values.find((v) => v.fieldId === d.id)?.value}
              definition={d}
              key={d.id}
              onResult={setMessage}
              seat={seat}
            />
          ))
        ) : (
          <p className="m-0 text-slate-500 text-sm">
            This course has no outcome fields.
          </p>
        )}
        <p className="m-0 text-slate-500 text-xs">
          Completion overrides are handled by administrators.
        </p>
      </section>
      <div className="lg:col-span-2">
        <ResultNotice message={message} />
      </div>
    </div>
  );
}

function RosterRow({
  seat,
  meetings,
  timeZone,
  selected,
  onSelect,
}: {
  seat: Seat;
  meetings: Meeting[];
  timeZone?: string;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const data = useQuery(api.registrationOperations.outcomeState, {
    seatId: seat._id,
  });
  const [open, setOpen] = useState(false);
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
          <Badge className="capitalize" tone={completionTone(data?.completion)}>
            {completionLabel(data?.completion)}
          </Badge>
        </TD>
        <TD className="text-right">
          <Button
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
          <TD className="bg-slate-50/40 px-6 py-5" colSpan={5}>
            <SeatDetails
              data={data}
              meetings={meetings}
              seat={seat}
              timeZone={timeZone}
            />
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
  async function submit() {
    setBusy(true);
    try {
      await send({
        sessionId,
        seats,
        subject,
        body,
        requestKey: crypto.randomUUID(),
      });
      onResult("Selected-attendee message queued");
      setSubject("");
      setBody("");
      onClose();
    } catch (error) {
      onResult(String(error));
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
  anchor.download = "roster.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function InstructorRoster({
  sessionId,
}: {
  sessionId: Id<"registrationSessions">;
}) {
  const session = useQuery(api.registrationOperations.sessionForStaff, {
    sessionId,
  });
  const roster = usePaginatedQuery(
    api.registrationOperations.roster,
    { sessionId },
    { initialNumItems: 20 }
  );
  const convex = useConvex();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Id<"registrationSeats">[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const needle = search.trim().toLowerCase();
  const visible = roster.results.filter((s) =>
    `${s.name} ${s.email}`.toLowerCase().includes(needle)
  );
  const allVisibleSelected =
    visible.length > 0 && visible.every((s) => selected.includes(s._id));
  const meetings = session?.meetings ?? [];
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
          actions={
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
                    setMessage("Complete roster exported");
                  } catch (error) {
                    setMessage(String(error));
                  } finally {
                    setExporting(false);
                  }
                }}
                size="sm"
                type="button"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </>
          }
          description={
            session
              ? `${meetings.map((m) => formatMeeting(m, session.timeZone)).join(" · ")} ${shortZone(session.timeZone)} · ${session.reserved} of ${session.capacity} seats reserved`
              : "Loading session details…"
          }
          eyebrow="Roster"
          title={session?.title ?? "Session roster"}
        />
        <ResultNotice message={message} />
        <Card>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Field
              className="w-full sm:max-w-sm"
              label="Search loaded attendees"
            >
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
            <p className="m-0 text-slate-500 text-sm">
              {pluralize(visible.length, "attendee")} shown ·{" "}
              {pluralize(selected.length, "selected", "selected")}
            </p>
          </CardContent>
        </Card>
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
                  description={
                    needle
                      ? "No loaded attendees match your search."
                      : "Attendees appear here as registrations are paid."
                  }
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
                    <TH className="text-right">Record</TH>
                  </TR>
                </THead>
                <TBody>
                  {visible.map((seat) => (
                    <RosterRow
                      key={seat._id}
                      meetings={meetings}
                      onSelect={(checked) =>
                        setSelected(
                          checked
                            ? [...selected, seat._id]
                            : selected.filter((id) => id !== seat._id)
                        )
                      }
                      seat={seat}
                      selected={selected.includes(seat._id)}
                      timeZone={session?.timeZone}
                    />
                  ))}
                </TBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
        {roster.status === "CanLoadMore" ? (
          <div className="flex justify-center">
            <Button
              onClick={() => roster.loadMore(20)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Load more attendees
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
      </div>
    </div>
  );
}
