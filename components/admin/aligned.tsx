"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import {
  IndependentSessionDetail,
  LoadMore,
  PAGE_SIZE,
  SessionTable,
} from "@/components/registration/independent";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type CourseId = Id<"registrationCourses">;

function when(ms: number) {
  return new Date(ms).toLocaleDateString("en-US");
}

function CoursePicker({
  courses,
  selected,
  onChange,
  disabled,
}: {
  courses: { id: CourseId; title: string }[];
  selected: CourseId[];
  onChange: (next: CourseId[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium text-slate-700 text-sm">
        Courses they may teach under our alignment
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {courses.map((course) => (
          <label
            className="flex items-center gap-2 text-slate-700 text-sm"
            key={course.id}
          >
            <input
              checked={selected.includes(course.id)}
              className="h-4 w-4 rounded border-slate-300"
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, course.id]
                    : selected.filter((id) => id !== course.id)
                )
              }
              type="checkbox"
            />
            {course.title}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InviteAligned({
  courses,
}: {
  courses: { id: CourseId; title: string }[];
}) {
  const invitations = useQuery(api.instructorInvitations.list)?.filter(
    (row) => row.kind === "aligned" && !(row.acceptedAt || row.revokedAt)
  );
  const invite = useMutation(api.instructorInvitations.inviteAligned);
  const revoke = useMutation(api.instructorInvitations.revoke);
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<CourseId[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const titles = new Map(courses.map((c) => [c.id, c.title]));

  async function send(target: string, courseIds: CourseId[]) {
    setBusy(true);
    setMessage("");
    try {
      await invite({ email: target, courseIds });
      setMessage(`Alignment invitation queued for ${target}.`);
      setEmail("");
      setSelected([]);
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Approve an aligned instructor</CardTitle>
          <CardDescription>
            After you approve an /alignment request, invite the instructor here.
            They sign in with this email and accept on their account page. That
            opens the independent session portal and eCard purchasing, but not
            our sessions, customers, or orders.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await send(email, selected);
          }}
        >
          <Field label="Email address" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="off"
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            )}
          </Field>
          <CoursePicker
            courses={courses}
            disabled={busy}
            onChange={setSelected}
            selected={selected}
          />
          <div className="flex justify-end">
            <Button disabled={busy || !selected.length} size="sm" type="submit">
              {busy ? "Sending…" : "Send alignment invitation"}
            </Button>
          </div>
        </form>
        <ResultNotice message={message} />
        {invitations?.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Pending invitation</TH>
                <TH>Courses</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {invitations.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium text-slate-900">{row.email}</TD>
                  <TD className="text-slate-600 text-sm">
                    {(row.courseIds ?? [])
                      .map((id) => titles.get(id) ?? "Archived course")
                      .join(", ")}
                  </TD>
                  <TD>
                    {row.sendError ? (
                      <Badge tone="danger">Send failed</Badge>
                    ) : (
                      <Badge tone="warning">
                        {row.sentAt
                          ? `Emailed ${when(row.sentAt)}`
                          : "Sending…"}
                      </Badge>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        aria-label={`Resend alignment invitation to ${row.email}`}
                        disabled={busy}
                        onClick={() => send(row.email, row.courseIds ?? [])}
                        size="xs"
                        type="button"
                        variant="secondary"
                      >
                        Resend
                      </Button>
                      <Button
                        aria-label={`Revoke alignment invitation for ${row.email}`}
                        disabled={busy}
                        onClick={async () => {
                          try {
                            await revoke({ id: row.id });
                          } catch (error) {
                            setMessage(errorText(error));
                          }
                        }}
                        size="xs"
                        type="button"
                        variant="danger"
                      >
                        Revoke
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EditCourses({
  userId,
  name,
  current,
  courses,
  onClose,
}: {
  userId: Id<"users">;
  name: string;
  current: CourseId[];
  courses: { id: CourseId; title: string }[];
  onClose: () => void;
}) {
  const update = useMutation(api.aligned.updateCourses);
  const [selected, setSelected] = useState(current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <Modal onClose={onClose} open title={`Courses for ${name}`}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await update({ userId, courseIds: selected });
            onClose();
          } catch (error) {
            setMessage(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <CoursePicker
          courses={courses}
          disabled={busy}
          onChange={setSelected}
          selected={selected}
        />
        <ResultNotice message={message} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
          <Button disabled={busy || !selected.length} type="submit">
            Save courses
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type AlignedRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.aligned.instructors>>
>[number];

function InstructorList({
  rows,
  courses,
  onFilter,
}: {
  rows: AlignedRow[];
  courses: { id: CourseId; title: string }[];
  onFilter: (id: Id<"users">) => void;
}) {
  const setAccess = useMutation(api.aligned.setAccess);
  const [editing, setEditing] = useState<AlignedRow | null>(null);
  const [message, setMessage] = useState("");
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Aligned instructors</CardTitle>
          <CardDescription>
            Revoking access keeps their sessions and rosters here for oversight.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResultNotice message={message} />
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Instructor</TH>
                <TH>Courses</TH>
                <TH>Sessions</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.userId}>
                  <TD>
                    <div className="font-medium text-slate-900">{row.name}</div>
                    {row.name === row.email ? null : (
                      <div className="text-slate-500 text-xs">{row.email}</div>
                    )}
                  </TD>
                  <TD className="text-slate-600 text-sm">
                    {row.courses.map((c) => c.title).join(", ") || "None"}
                  </TD>
                  <TD>
                    <Button
                      onClick={() => onFilter(row.userId)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      {row.sessionCount} sessions
                    </Button>
                  </TD>
                  <TD>
                    {row.revokedAt ? (
                      <Badge tone="neutral">
                        Revoked {when(row.revokedAt)}
                      </Badge>
                    ) : (
                      <Badge tone="success">
                        Active since {when(row.grantedAt)}
                      </Badge>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setEditing(row)}
                        size="xs"
                        type="button"
                        variant="secondary"
                      >
                        Courses
                      </Button>
                      <Button
                        aria-label={`${row.revokedAt ? "Restore" : "Revoke"} access for ${row.name}`}
                        onClick={async () => {
                          setMessage("");
                          try {
                            await setAccess({
                              userId: row.userId,
                              active: Boolean(row.revokedAt),
                            });
                          } catch (error) {
                            setMessage(errorText(error));
                          }
                        }}
                        size="xs"
                        type="button"
                        variant={row.revokedAt ? "secondary" : "danger"}
                      >
                        {row.revokedAt ? "Restore" : "Revoke"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="text-slate-500 text-sm">
            No aligned instructors yet. Invite one above.
          </p>
        )}
      </CardContent>
      {editing ? (
        <EditCourses
          courses={courses}
          current={editing.courses.map((c) => c.id)}
          name={editing.name}
          onClose={() => setEditing(null)}
          userId={editing.userId}
        />
      ) : null}
    </Card>
  );
}

export function AlignedAdmin() {
  const courses = useQuery(api.aligned.courseOptions);
  const instructors = useQuery(api.aligned.instructors);
  const [instructorId, setInstructorId] = useState<Id<"users"> | "">("");
  const {
    results: sessions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.aligned.allSessions,
    { instructorId: instructorId || undefined },
    { initialNumItems: PAGE_SIZE }
  );
  if (courses === undefined || instructors === undefined) {
    return <Skeleton className="h-96" />;
  }
  return (
    <div className="space-y-6">
      <PageHeader
        description="Independent instructors aligned with our Training Site run their own classes and buy eCards from us. We oversee their sessions and rosters here."
        title="Aligned instructors"
      />
      <InviteAligned courses={courses} />
      <InstructorList
        courses={courses}
        onFilter={setInstructorId}
        rows={instructors}
      />
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Independent sessions</CardTitle>
            <CardDescription>
              Private classes. They never appear on the public schedule, orders,
              revenue, or emails.
            </CardDescription>
          </div>
          <Field className="sm:w-72" label="Instructor">
            {(props) => (
              <Select
                {...props}
                onChange={(event) =>
                  setInstructorId(event.target.value as Id<"users"> | "")
                }
                value={instructorId}
              >
                <option value="">All aligned instructors</option>
                {instructors.map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </CardHeader>
        <CardContent>
          {status === "LoadingFirstPage" ? <Skeleton className="h-32" /> : null}
          {status !== "LoadingFirstPage" && sessions.length === 0 ? (
            <EmptyState title="No independent sessions" />
          ) : null}
          {sessions.length ? (
            <SessionTable hrefBase="/admin/aligned" sessions={sessions} />
          ) : null}
          <LoadMore loadMore={loadMore} status={status} />
        </CardContent>
      </Card>
    </div>
  );
}

export function AlignedSessionAdmin({
  sessionId,
}: {
  sessionId: Id<"independentSessions">;
}) {
  return (
    <IndependentSessionDetail
      backHref="/admin/aligned"
      oversight
      sessionId={sessionId}
    />
  );
}
