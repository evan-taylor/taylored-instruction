"use client";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import {
  IndependentSessionDetail,
  LoadMore,
  PAGE_SIZE,
  SessionTable,
} from "@/components/registration/independent";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import {
  EmptyState,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type CourseId = Id<"registrationCourses">;
export type CourseOption = { id: CourseId; title: string };

export function CoursePicker({
  courses,
  selected,
  onChange,
  disabled,
}: {
  courses: CourseOption[];
  selected: CourseId[];
  onChange: (next: CourseId[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium text-slate-700 text-sm">
        Courses aligned with our Training Site
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

/**
 * Quick edit for the "aligned with our Training Site" part of an instructor
 * record. A new alignment starts from the courses chosen last time, so marking
 * several instructors in a row is one click each.
 */
export function AlignmentEditor({
  userId,
  name,
  current,
  courses,
  suggested,
  onClose,
  onSaved,
}: {
  userId: Id<"users">;
  name: string;
  current: CourseId[] | null;
  courses: CourseOption[];
  suggested: CourseId[];
  onClose: () => void;
  onSaved: (courseIds: CourseId[]) => void;
}) {
  const save = useMutation(api.aligned.setAlignment);
  const available = (ids: CourseId[]) =>
    ids.filter((id) => courses.some((c) => c.id === id));
  const kept = current ? available(current) : [];
  const dropped = (current?.length ?? 0) - kept.length;
  const [selected, setSelected] = useState(
    current ? kept : available(suggested)
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(courseIds: CourseId[] | null) {
    setBusy(true);
    setMessage("");
    try {
      await save({ userId, courseIds });
      onSaved(courseIds ?? []);
      onClose();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={onClose} open title={`Alignment for ${name}`}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await submit(selected);
        }}
      >
        <p className="text-slate-600 text-sm">
          Aligned instructors can run private independent sessions for these
          courses, keep their rosters here, and export them to issue cards.
        </p>
        <CoursePicker
          courses={courses}
          disabled={busy}
          onChange={setSelected}
          selected={selected}
        />
        {dropped ? (
          <p className="text-slate-600 text-sm">
            {dropped === 1
              ? "One aligned course is archived and will be removed when you save."
              : `${dropped} aligned courses are archived and will be removed when you save.`}
          </p>
        ) : null}
        <ResultNotice message={message} />
        <div className="flex flex-wrap justify-between gap-2">
          {current ? (
            <Button
              disabled={busy}
              onClick={() => submit(null)}
              type="button"
              variant="danger"
            >
              Remove alignment
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy || !selected.length} type="submit">
              {current ? "Save courses" : "Mark aligned"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Staff oversight of every independent session, filterable by instructor. */
export function IndependentOversight({
  instructors,
  instructorId,
  onInstructor,
}: {
  instructors: { userId: Id<"users">; name: string }[];
  instructorId: Id<"users"> | "";
  onInstructor: (id: Id<"users"> | "") => void;
}) {
  const {
    results: sessions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.aligned.allSessions,
    { instructorId: instructorId || undefined },
    { initialNumItems: PAGE_SIZE }
  );
  return (
    <Card id="independent-sessions">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Independent sessions</CardTitle>
          <CardDescription>
            Private classes aligned instructors run on their own. They never
            appear on the public schedule, orders, revenue, or emails.
          </CardDescription>
        </div>
        <Field className="sm:w-72" label="Instructor">
          {(props) => (
            <Select
              {...props}
              onChange={(event) =>
                onInstructor(event.target.value as Id<"users"> | "")
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
          <SessionTable
            hrefBase="/admin/instructors/independent"
            sessions={sessions}
          />
        ) : null}
        <LoadMore loadMore={loadMore} status={status} />
      </CardContent>
    </Card>
  );
}

export function AlignedSessionAdmin({
  sessionId,
}: {
  sessionId: Id<"independentSessions">;
}) {
  return (
    <IndependentSessionDetail
      backHref="/admin/instructors#independent-sessions"
      oversight
      sessionId={sessionId}
    />
  );
}
