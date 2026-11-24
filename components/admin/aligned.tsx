"use client";
import { usePaginatedQuery } from "convex/react";
import {
  IndependentSessionDetail,
  LoadMore,
  PAGE_SIZE,
  SessionTable,
} from "@/components/registration/independent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
