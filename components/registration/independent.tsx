"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { CreditCard, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/useProfile";
import { parseStudents } from "@/shared/registration/independent";
import { AgencyExport } from "./agency-roster-export";
import { errorText } from "./errors";
import {
  formatDateTime,
  formatTime,
  formatWeekday,
  fromLocalInput,
  pluralize,
  shortZone,
  toLocalInput,
} from "./format";

type Session = Doc<"independentSessions">;
type Student = Doc<"independentStudents"> & { completion: string };
type Attendance = Student["attendance"];
type Definition = Session["outcomeDefinitions"][number];

const TIME_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
];
const ATTENDANCE: { status: Attendance; label: string }[] = [
  { status: "present", label: "Present" },
  { status: "absent", label: "Absent" },
  { status: "not-recorded", label: "Not recorded" },
];
const ACTION_LABELS: Record<string, string> = {
  "session-created": "Created session",
  "session-edited": "Edited session",
  "session-canceled": "Cancelled session",
  "session-restored": "Restored session",
  "students-added": "Added students",
  "student-edited": "Edited student",
  "student-removed": "Removed student",
  attendance: "Attendance",
  "outcome-edited": "Recorded result",
  "results-cleared": "Cleared results",
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        {children}
      </div>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="space-y-3" role="status">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-14" />
      <Skeleton className="h-40" />
    </div>
  );
}

/** Holds the independent portal until the signed-in account is known to be aligned. */
export function AlignedGate({ children }: { children: ReactNode }) {
  const { loading, session, isAligned } = useProfile();
  if (loading) {
    return (
      <Shell>
        <Loading label="Checking your sign-in…" />
      </Shell>
    );
  }
  if (!(session && isAligned)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-bold text-2xl text-slate-900">
          {session ? "Aligned instructor access required" : "Sign in required"}
        </h1>
        <p className="mt-2 text-slate-600">
          The independent instructor portal is for instructors aligned with our
          Training Site. Apply on the alignment page; once approved you’ll get
          an invitation to accept on your account page.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button href={session ? "/my-account" : "/login"}>
            {session ? "My account" : "Sign in"}
          </Button>
          <Button href="/alignment" variant="secondary">
            Alignment
          </Button>
        </div>
      </div>
    );
  }
  return children;
}

function StateBadge({ state }: { state: Session["state"] }) {
  return state === "canceled" ? (
    <Badge tone="danger">Cancelled</Badge>
  ) : (
    <Badge tone="primary">Independent</Badge>
  );
}

function when(session: Pick<Session, "start" | "end" | "timeZone">) {
  return `${formatDateTime(session.start, session.timeZone)} – ${formatTime(session.end, session.timeZone)} ${shortZone(session.timeZone, session.start)}`;
}

/* --------------------------- Session form ---------------------------- */

type FormState = {
  courseId: string;
  start: string;
  end: string;
  timeZone: string;
  location: string;
  instructorNames: string;
};

function emptyForm(): FormState {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    courseId: "",
    start: "",
    end: "",
    timeZone: TIME_ZONES.includes(zone) ? zone : "America/Los_Angeles",
    location: "",
    instructorNames: "",
  };
}

function formFor(session: Session): FormState {
  return {
    courseId: session.courseId,
    start: toLocalInput(session.start, session.timeZone),
    end: toLocalInput(session.end, session.timeZone),
    timeZone: session.timeZone,
    location: session.location,
    instructorNames: session.instructorNames.join("\n"),
  };
}

function SessionForm({
  open,
  onClose,
  courses,
  initial,
  onSubmit,
  title,
}: {
  open: boolean;
  onClose: () => void;
  courses: { id: Id<"registrationCourses">; title: string }[];
  initial: FormState;
  onSubmit: (input: {
    courseId: Id<"registrationCourses">;
    start: number;
    end: number;
    timeZone: string;
    location: string;
    instructorNames: string[];
  }) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const set = (key: keyof FormState) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    const start = fromLocalInput(form.start, form.timeZone);
    const end = fromLocalInput(form.end, form.timeZone);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setMessage("Enter a valid start and end time.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onSubmit({
        courseId: form.courseId as Id<"registrationCourses">,
        start,
        end,
        timeZone: form.timeZone,
        location: form.location,
        instructorNames: form.instructorNames.split("\n"),
      });
      onClose();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      description="Independent sessions are private to you and our Training Site. They are never listed, priced, or opened for registration."
      onClose={onClose}
      open={open}
      size="lg"
      title={title}
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await submit();
        }}
      >
        <Field label="Course" required>
          {(props) => (
            <Select
              {...props}
              disabled={busy}
              onChange={(event) => set("courseId")(event.target.value)}
              required
              value={form.courseId}
            >
              <option disabled value="">
                Choose a course…
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" required>
            {(props) => (
              <TextInput
                {...props}
                disabled={busy}
                onChange={(event) => {
                  const { value } = event.target;
                  setForm((current) => ({
                    ...current,
                    start: value,
                    end:
                      current.end || !value
                        ? current.end
                        : `${value.split("T")[0]}T${current.end.split("T")[1] ?? "17:00"}`,
                  }));
                }}
                required
                type="datetime-local"
                value={form.start}
              />
            )}
          </Field>
          <Field label="Ends" required>
            {(props) => (
              <TextInput
                {...props}
                disabled={busy}
                onChange={(event) => set("end")(event.target.value)}
                required
                type="datetime-local"
                value={form.end}
              />
            )}
          </Field>
        </div>
        <Field label="Time zone">
          {(props) => (
            <Select
              {...props}
              disabled={busy}
              onChange={(event) => set("timeZone")(event.target.value)}
              value={form.timeZone}
            >
              {TIME_ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace("_", " ")}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          hint="Where you are teaching: venue name and address."
          label="Location"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              disabled={busy}
              onChange={(event) => set("location")(event.target.value)}
              required
              value={form.location}
            />
          )}
        </Field>
        <Field
          hint="One per line. Leave blank to list just you."
          label="Instructors"
        >
          {(props) => (
            <TextArea
              {...props}
              disabled={busy}
              onChange={(event) => set("instructorNames")(event.target.value)}
              rows={3}
              value={form.instructorNames}
            />
          )}
        </Field>
        <ResultNotice message={message} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Save session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------- Session list --------------------------- */

export const PAGE_SIZE = 50;

export function LoadMore({
  status,
  loadMore,
}: {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (count: number) => void;
}) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") {
    return null;
  }
  return (
    <div className="flex justify-center pt-3">
      <Button
        disabled={status === "LoadingMore"}
        onClick={() => loadMore(PAGE_SIZE)}
        size="sm"
        type="button"
        variant="secondary"
      >
        {status === "LoadingMore" ? "Loading…" : "Load older"}
      </Button>
    </div>
  );
}

export function IndependentSessions() {
  const {
    results: sessions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.aligned.mySessions,
    {},
    { initialNumItems: PAGE_SIZE }
  );
  const portal = useQuery(api.aligned.portal);
  const create = useMutation(api.aligned.createSession);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const courses = portal?.courses ?? [];
  return (
    <Shell>
      <PageHeader
        actions={
          <>
            <Button href="/ecards" size="sm" variant="secondary">
              <CreditCard aria-hidden="true" className="h-4 w-4" />
              Purchase eCards
            </Button>
            <Button
              disabled={!courses.length}
              onClick={() => {
                setFormKey((key) => key + 1);
                setOpen(true);
              }}
              size="sm"
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              New session
            </Button>
          </>
        }
        description="Classes you teach independently under our Training Site alignment. Keep each roster and its results here, then export it to issue cards."
        eyebrow="Aligned instructor"
        title="Independent sessions"
      />
      {portal && !courses.length ? (
        <Notice tone="warning">
          No courses are on your alignment yet. Contact us to add the courses
          you teach.
        </Notice>
      ) : null}
      {status === "LoadingFirstPage" ? (
        <Loading label="Loading sessions…" />
      ) : null}
      {status !== "LoadingFirstPage" && sessions.length === 0 ? (
        <EmptyState
          description="Create a session for each class you teach, then add your students."
          title="No independent sessions yet"
        />
      ) : null}
      {sessions.length ? <SessionTable sessions={sessions} /> : null}
      <LoadMore loadMore={loadMore} status={status} />
      <SessionForm
        courses={courses}
        initial={emptyForm()}
        key={formKey}
        onClose={() => setOpen(false)}
        onSubmit={async (input) => {
          const id = await create(input);
          window.location.assign(`/instructor/independent/${id}`);
        }}
        open={open}
        title="New independent session"
      />
    </Shell>
  );
}

export function SessionTable({
  sessions,
  hrefBase = "/instructor/independent",
}: {
  sessions: (Session & { owner?: { name: string; email: string } })[];
  hrefBase?: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table wrapperClassName="rounded-none border-0">
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Course</TH>
              {sessions.some((s) => s.owner) ? <TH>Instructor</TH> : null}
              <TH>Students</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {sessions.map((s) => (
              <TR key={s._id}>
                <TD className="whitespace-nowrap">
                  <div className="font-medium text-slate-900">
                    {formatWeekday(s.start, s.timeZone)}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {formatTime(s.start, s.timeZone)} –{" "}
                    {formatTime(s.end, s.timeZone)}{" "}
                    {shortZone(s.timeZone, s.start)}
                  </div>
                </TD>
                <TD>
                  <Link
                    className="font-medium text-slate-900 hover:text-primary"
                    href={`${hrefBase}/${s._id}`}
                  >
                    {s.title}
                  </Link>
                  <div className="flex items-start gap-1 text-slate-500 text-xs">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 h-3 w-3 shrink-0"
                    />
                    {s.location}
                  </div>
                </TD>
                {s.owner ? (
                  <TD>
                    <div className="text-slate-900">{s.owner.name}</div>
                    <div className="text-slate-500 text-xs">
                      {s.owner.email}
                    </div>
                  </TD>
                ) : null}
                <TD>{pluralize(s.studentCount, "student")}</TD>
                <TD>
                  <StateBadge state={s.state} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* --------------------------- Session detail -------------------------- */

export function IndependentSessionDetail({
  sessionId,
  backHref,
  oversight = false,
}: {
  sessionId: Id<"independentSessions">;
  backHref: string;
  oversight?: boolean;
}) {
  const data = useQuery(api.aligned.sessionDetail, { sessionId });
  if (data === undefined) {
    return <Loading label="Loading session…" />;
  }
  const { session, students, owner } = data;
  const canceled = session.state === "canceled";
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <SessionActions
            oversight={oversight}
            session={session}
            students={students}
          />
        }
        description={
          <>
            {when(session)} · {session.location}
            <br />
            Instructors: {session.instructorNames.join(", ")}
            {owner ? (
              <>
                <br />
                Owner: {owner.name}
                {owner.name === owner.email ? null : ` (${owner.email})`}
              </>
            ) : null}
          </>
        }
        eyebrow={
          <Link className="hover:underline" href={backHref}>
            ← Independent sessions
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {session.title} <StateBadge state={session.state} />
          </span>
        }
      />
      {canceled ? (
        <Notice tone="warning">
          This session is cancelled. Restore it to change the roster.
        </Notice>
      ) : null}
      <Roster canceled={canceled} session={session} students={students} />
      <ActivityLog sessionId={session._id} />
    </div>
  );
}

function SessionActions({
  session,
  students,
  oversight,
}: {
  session: Session;
  students: Student[];
  oversight: boolean;
}) {
  const portal = useQuery(api.aligned.portal, oversight ? "skip" : {});
  const allCourses = useQuery(
    api.aligned.courseOptions,
    oversight ? {} : "skip"
  );
  const update = useMutation(api.aligned.updateSession);
  const setCanceled = useMutation(api.aligned.setCanceled);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const courses = oversight ? (allCourses ?? []) : (portal?.courses ?? []);
  const canceled = session.state === "canceled";
  return (
    <>
      <AgencyExport
        courseEnd={session.end}
        description="Includes every student on this roster with the phone and ARC results you recorded. Edits here apply only to this download."
        fileId={session._id}
        load={async () =>
          await Promise.resolve(
            students.map((student) => ({
              id: student._id,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              phone: student.phone,
              evaluation: student.evaluation,
              reason: student.reason,
              additionalInformation: student.additionalInformation,
            }))
          )
        }
        timeZone={session.timeZone}
      />
      {canceled ? null : (
        <Button
          onClick={() => setEditing(true)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Edit session
        </Button>
      )}
      <Button
        onClick={async () => {
          if (canceled) {
            await setCanceled({ sessionId: session._id, canceled: false });
          } else {
            setConfirming(true);
          }
        }}
        size="sm"
        type="button"
        variant={canceled ? "secondary" : "danger"}
      >
        {canceled ? "Restore session" : "Cancel session"}
      </Button>
      {editing ? (
        <SessionForm
          courses={
            courses.some((c) => c.id === session.courseId)
              ? courses
              : [{ id: session.courseId, title: session.title }, ...courses]
          }
          initial={formFor(session)}
          onClose={() => setEditing(false)}
          onSubmit={async (input) => {
            await update({ sessionId: session._id, ...input });
          }}
          open={editing}
          title="Edit session"
        />
      ) : null}
      <ConfirmDialog
        cancelLabel="Keep session"
        confirmLabel="Cancel session"
        danger
        description="The session and its roster are kept for our records. You can restore it later."
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await setCanceled({ sessionId: session._id, canceled: true });
          setConfirming(false);
        }}
        open={confirming}
        title={`Cancel ${session.title}?`}
      />
    </>
  );
}

/* ------------------------------- Roster ------------------------------ */

function completionBadge(completion: string) {
  if (completion === "complete") {
    return <Badge tone="success">Complete</Badge>;
  }
  if (completion === "incomplete") {
    return <Badge tone="warning">Incomplete</Badge>;
  }
  return <Badge tone="neutral">Not evaluated</Badge>;
}

function Roster({
  session,
  students,
  canceled,
}: {
  session: Session;
  students: Student[];
  canceled: boolean;
}) {
  const setAttendance = useMutation(api.aligned.setAttendance);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Roster</CardTitle>
          <CardDescription>
            {pluralize(students.length, "student")}. Students are never emailed
            from independent sessions.
          </CardDescription>
        </div>
        {canceled ? null : (
          <div className="flex flex-wrap gap-2">
            {students.length ? (
              <Button
                onClick={async () => {
                  setMessage("");
                  try {
                    await setAttendance({
                      sessionId: session._id,
                      studentIds: students.map((s) => s._id),
                      status: "present",
                    });
                  } catch (error) {
                    setMessage(errorText(error));
                  }
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Mark all present
              </Button>
            ) : null}
            <Button onClick={() => setAdding(true)} size="sm" type="button">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add students
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ResultNotice message={message} />
        {students.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Attendance</TH>
                {session.outcomeDefinitions.map((d) => (
                  <TH key={d.id}>{d.title}</TH>
                ))}
                <TH>Completion</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {students.map((student) => (
                <StudentRow
                  canceled={canceled}
                  definitions={session.outcomeDefinitions}
                  key={student._id}
                  sessionId={session._id}
                  student={student}
                />
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            description="Add students one at a time or paste a list."
            title="No students yet"
          />
        )}
      </CardContent>
      {adding ? (
        <AddStudents
          existing={students.map((s) => s.email)}
          onClose={() => setAdding(false)}
          sessionId={session._id}
        />
      ) : null}
    </Card>
  );
}

function StudentRow({
  student,
  definitions,
  sessionId,
  canceled,
}: {
  student: Student;
  definitions: Definition[];
  sessionId: Id<"independentSessions">;
  canceled: boolean;
}) {
  const setAttendance = useMutation(api.aligned.setAttendance);
  const remove = useMutation(api.aligned.removeStudent);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const name = `${student.firstName} ${student.lastName}`;
  return (
    <TR>
      <TD>
        <div className="font-medium text-slate-900">{name}</div>
        <div className="text-slate-500 text-xs">{student.email}</div>
        {student.phone ? (
          <div className="text-slate-500 text-xs">{student.phone}</div>
        ) : null}
        {error ? <p className="text-rose-700 text-xs">{error}</p> : null}
      </TD>
      <TD>
        <Select
          aria-label={`Attendance for ${name}`}
          className="min-w-40"
          disabled={canceled}
          onChange={async (event) => {
            setError("");
            try {
              await setAttendance({
                sessionId,
                studentIds: [student._id],
                status: event.target.value as Attendance,
              });
            } catch (failure) {
              setError(errorText(failure));
            }
          }}
          value={student.attendance}
        >
          {ATTENDANCE.map((choice) => (
            <option key={choice.status} value={choice.status}>
              {choice.label}
            </option>
          ))}
        </Select>
      </TD>
      {definitions.map((definition) => (
        <TD key={definition.id}>
          <OutcomeInput
            definition={definition}
            disabled={canceled}
            name={name}
            onError={setError}
            student={student}
          />
        </TD>
      ))}
      <TD>
        {completionBadge(student.completion)}
        {student.evaluation ? (
          <div className="mt-1 text-slate-500 text-xs">
            ARC: {student.evaluation}
          </div>
        ) : null}
      </TD>
      <TD className="whitespace-nowrap text-right">
        {canceled ? null : (
          <div className="flex justify-end gap-2">
            <Button
              aria-label={`Edit ${name}`}
              onClick={() => setEditing(true)}
              size="xs"
              type="button"
              variant="secondary"
            >
              Edit
            </Button>
            <Button
              aria-label={`Remove ${name}`}
              onClick={() => setRemoving(true)}
              size="xs"
              type="button"
              variant="danger"
            >
              Remove
            </Button>
          </div>
        )}
        {editing ? (
          <EditStudent onClose={() => setEditing(false)} student={student} />
        ) : null}
        <ConfirmDialog
          cancelLabel="Keep"
          confirmLabel="Remove student"
          danger
          description="Their attendance and results are removed with them. The change is kept in the activity log."
          onClose={() => setRemoving(false)}
          onConfirm={async () => {
            await remove({ studentId: student._id });
            setRemoving(false);
          }}
          open={removing}
          title={`Remove ${name}?`}
        />
      </TD>
    </TR>
  );
}

function OutcomeInput({
  student,
  definition,
  name,
  disabled,
  onError,
}: {
  student: Student;
  definition: Definition;
  name: string;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const record = useMutation(api.aligned.recordOutcome);
  const current = student.outcomes.find(
    (o) => o.fieldId === definition.id && o.version === definition.version
  )?.value;
  const [draft, setDraft] = useState<string>();
  async function save(value: string | number, submitted: string) {
    onError("");
    try {
      await record({ studentId: student._id, fieldId: definition.id, value });
      setDraft((latest) => (latest === submitted ? undefined : latest));
    } catch (failure) {
      onError(errorText(failure));
      if (definition.type !== "percentage") {
        setDraft(undefined);
      }
    }
  }
  if (definition.type === "percentage") {
    return (
      <TextInput
        aria-label={`${definition.title} for ${name}`}
        className="w-24"
        disabled={disabled}
        max={100}
        min={0}
        onBlur={async (event) => {
          const input = event.currentTarget;
          if (draft === undefined || !input.value) {
            setDraft(undefined);
            return;
          }
          if (!input.validity.valid) {
            onError("Enter a score from 0 to 100.");
            return;
          }
          await save(input.valueAsNumber, input.value);
        }}
        onChange={(event) => setDraft(event.target.value)}
        step="any"
        type="number"
        value={draft ?? String(current ?? "")}
      />
    );
  }
  return (
    <Select
      aria-label={`${definition.title} for ${name}`}
      className="min-w-32"
      disabled={disabled}
      onChange={async (event) => {
        setDraft(event.target.value);
        await save(event.target.value, event.target.value);
      }}
      value={draft ?? String(current ?? "")}
    >
      <option disabled value="">
        Choose…
      </option>
      {definition.options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </Select>
  );
}

const STUDENT_FIELDS = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Last name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "Phone", type: "tel", required: false },
] as const;
const ARC_FIELDS = [
  { key: "evaluation", label: "ARC evaluation" },
  { key: "reason", label: "Reason if unsuccessful or not evaluated" },
  { key: "additionalInformation", label: "Additional information" },
] as const;

function EditStudent({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const update = useMutation(api.aligned.updateStudent);
  const [form, setForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    evaluation: student.evaluation,
    reason: student.reason,
    additionalInformation: student.additionalInformation,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <Modal onClose={onClose} open size="lg" title="Edit student">
      <form
        className="space-y-4 text-left"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await update({ studentId: student._id, ...form });
            onClose();
          } catch (error) {
            setMessage(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {STUDENT_FIELDS.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              required={field.required}
            >
              {(props) => (
                <TextInput
                  {...props}
                  disabled={busy}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  required={field.required}
                  type={field.type}
                  value={form[field.key]}
                />
              )}
            </Field>
          ))}
        </div>
        <p className="text-slate-600 text-sm">
          The ARC roster asks for an evaluation and, when unsuccessful or not
          evaluated, a reason. Use the exact values from ARC’s upload
          instructions; they prefill the ARC export.
        </p>
        {ARC_FIELDS.map((field) => (
          <Field key={field.key} label={field.label}>
            {(props) => (
              <TextInput
                {...props}
                disabled={busy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                value={form[field.key]}
              />
            )}
          </Field>
        ))}
        <ResultNotice message={message} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Save student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddStudents({
  sessionId,
  existing,
  onClose,
}: {
  sessionId: Id<"independentSessions">;
  existing: string[];
  onClose: () => void;
}) {
  const add = useMutation(api.aligned.addStudents);
  const [single, setSingle] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const parsed = parseStudents(paste, existing);
  const ready = parsed.filter((row) => !row.issue);

  async function submit(
    students: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    }[]
  ) {
    setBusy(true);
    setMessage("");
    try {
      return await add({ sessionId, students });
    } catch (error) {
      setMessage(errorText(error));
      return 0;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      description="Students are added without any email or account. Phone is optional and appears on both agency exports."
      onClose={onClose}
      open
      size="xl"
      title="Add students"
    >
      <div className="space-y-6">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await submit([single])) {
              setSingle({ firstName: "", lastName: "", email: "", phone: "" });
              setMessage(`Added ${single.firstName} ${single.lastName}.`);
            }
          }}
        >
          <h3 className="font-semibold text-slate-900">One student</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {STUDENT_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
              >
                {(props) => (
                  <TextInput
                    {...props}
                    disabled={busy}
                    onChange={(event) =>
                      setSingle((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    required={field.required}
                    type={field.type}
                    value={single[field.key]}
                  />
                )}
              </Field>
            ))}
          </div>
          <div className="flex justify-end">
            <Button disabled={busy} size="sm" type="submit">
              Add student
            </Button>
          </div>
        </form>
        <form
          className="space-y-3 border-slate-200 border-t pt-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const added = await submit(ready);
            if (added) {
              setPaste("");
              setMessage(`Added ${pluralize(added, "student")}.`);
            }
          }}
        >
          <h3 className="font-semibold text-slate-900">Paste a list</h3>
          <Field
            hint="One student per line: name, email, and optional phone, separated by commas or tabs. Spreadsheet rows paste as-is."
            label="Students"
          >
            {(props) => (
              <TextArea
                {...props}
                disabled={busy}
                onChange={(event) => setPaste(event.target.value)}
                placeholder={
                  "Jane Doe, jane@example.com, 555-123-4567\nSam Lee, sam@example.com"
                }
                rows={6}
                value={paste}
              />
            )}
          </Field>
          {parsed.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>First</TH>
                  <TH>Last</TH>
                  <TH>Email</TH>
                  <TH>Phone</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {parsed.map((row) => (
                  <TR key={`${row.email}-${row.firstName}-${row.lastName}`}>
                    <TD>{row.firstName}</TD>
                    <TD>{row.lastName}</TD>
                    <TD>{row.email}</TD>
                    <TD>{row.phone}</TD>
                    <TD>
                      {row.issue ? (
                        <Badge tone="warning">{row.issue}</Badge>
                      ) : (
                        <Badge tone="success">Ready</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : null}
          <div className="flex justify-end">
            <Button disabled={busy || !ready.length} size="sm" type="submit">
              Add {pluralize(ready.length, "student")}
            </Button>
          </div>
        </form>
        <ResultNotice message={message} />
        <div className="flex justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------- Activity ------------------------------ */

function activityDetail(action: string, detail: string) {
  if (!detail.startsWith("{")) {
    return detail;
  }
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    if (action === "outcome-edited") {
      return `${parsed.student}: ${parsed.field} ${parsed.previous ?? "—"} → ${parsed.value}`;
    }
    if (action === "student-edited") {
      const changed = Object.entries(parsed.changed as Record<string, string>)
        .map(([key, value]) => `${key} → ${value || "—"}`)
        .join(", ");
      return `${parsed.student}: ${changed}`;
    }
    const session = parsed as {
      course?: string;
      start?: number;
      end?: number;
      timeZone?: string;
      location?: string;
      instructors?: string[];
    };
    return [
      session.course,
      session.start && session.end && session.timeZone
        ? when({
            start: session.start,
            end: session.end,
            timeZone: session.timeZone,
          })
        : "",
      session.location,
      session.instructors?.length
        ? `Instructors: ${session.instructors.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  } catch {
    return detail;
  }
}

function ActivityLog({ sessionId }: { sessionId: Id<"independentSessions"> }) {
  const {
    results: rows,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.aligned.sessionActivity,
    { sessionId },
    { initialNumItems: PAGE_SIZE }
  );
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            Every change to this session and roster, newest first. Our Training
            Site reviews this log.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <ol className="divide-y divide-slate-100 text-sm">
            {rows.map((row) => (
              <li className="flex flex-col gap-0.5 py-2" key={row._id}>
                <span className="text-slate-900">
                  <strong>{ACTION_LABELS[row.action] ?? row.action}</strong> by{" "}
                  {row.actor}
                </span>
                <span className="break-words text-slate-600">
                  {activityDetail(row.action, row.detail)}
                </span>
                <span className="text-slate-500 text-xs">
                  {new Date(row.at).toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-slate-500 text-sm">
            {status === "LoadingFirstPage" ? "Loading…" : "No activity yet."}
          </p>
        )}
        <LoadMore loadMore={loadMore} status={status} />
      </CardContent>
    </Card>
  );
}

export function IndependentSessionPage({
  sessionId,
}: {
  sessionId: Id<"independentSessions">;
}) {
  return (
    <Shell>
      <IndependentSessionDetail
        backHref="/instructor/independent"
        sessionId={sessionId}
      />
    </Shell>
  );
}
