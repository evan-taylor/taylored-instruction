"use client";
import {
  useConvex,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
export function InstructorSessions() {
  const sessions = useQuery(api.registrationOperations.assignedSessions);
  return (
    <section className="space-y-4 p-12">
      <h1 className="font-bold text-3xl">Assigned sessions</h1>
      {sessions?.map((s) => (
        <Link
          className="block underline"
          href={`/instructor/sessions/${s._id}`}
          key={s._id}
        >
          {s.title} · {new Date(s.firstStart).toLocaleString()}
        </Link>
      ))}
    </section>
  );
}
function StudentRecord({
  seat,
  meetings,
}: {
  seat: Doc<"registrationSeats">;
  meetings: Doc<"registrationSessions">["meetings"];
}) {
  const data = useQuery(api.registrationOperations.outcomeState, {
    seatId: seat._id,
  });
  const record = useMutation(api.registrationOperations.recordOutcome);
  const attendance = useMutation(api.registrationOperations.attendance);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <p>Completion: {data?.completion ?? "Loading…"}</p>
      {seat.snapshot.questions.map((q) => (
        <p key={q.id}>
          {q.title}:{" "}
          {String(
            seat.snapshot.attendee.answers.find((a) => a.id === q.id)?.value ??
              "Not answered"
          )}
        </p>
      ))}
      {meetings.map((m) => (
        <label className="block" key={m.id}>
          {new Date(m.start).toLocaleString()} attendance
          <select
            className="ml-3 rounded border p-2"
            onChange={async (e) => {
              try {
                await attendance({
                  seatId: seat._id,
                  meetingId: m.id,
                  status: e.target.value as
                    | "present"
                    | "absent"
                    | "not-recorded",
                });
              } catch (error) {
                setMessage(String(error));
              }
            }}
            value={
              data?.attendance.find((a) => a.meetingId === m.id)?.status ??
              "not-recorded"
            }
          >
            <option value="not-recorded">Not recorded</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </label>
      ))}
      {seat.outcomeDefinitions.map((d) => (
        <form
          className="flex flex-wrap items-end gap-3"
          key={d.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("value");
            try {
              await record({
                seatId: seat._id,
                fieldId: d.id,
                value: d.type === "percentage" ? Number(value) : String(value),
              });
              setMessage("Outcome saved");
            } catch (error) {
              setMessage(String(error));
            }
          }}
        >
          <label htmlFor={`outcome-${seat._id}-${d.id}`}>
            {d.title} {d.required ? "(required)" : "(informational)"}
            {d.type === "percentage" ? (
              <Input
                defaultValue={String(
                  data?.values.find((v) => v.fieldId === d.id)?.value ?? ""
                )}
                id={`outcome-${seat._id}-${d.id}`}
                max={100}
                min={0}
                name="value"
                required
                type="number"
              />
            ) : (
              <select
                className="block rounded border p-2"
                defaultValue={String(
                  data?.values.find((v) => v.fieldId === d.id)?.value ?? ""
                )}
                id={`outcome-${seat._id}-${d.id}`}
                name="value"
                required
              >
                <option value="">Choose…</option>
                {d.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            )}
          </label>
          <Button type="submit">Save outcome</Button>
        </form>
      ))}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
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
  const send = useMutation(api.registrationOperations.selectedEmail);
  const convex = useConvex();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Id<"registrationSeats">[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">
        {session?.title ?? "Session roster"}
      </h1>
      <label>
        Search loaded attendees
        <Input onChange={(e) => setSearch(e.target.value)} value={search} />
      </label>
      <Button
        onClick={async () => {
          try {
            const pages: string[] = [];
            async function nextPage(cursor: string | null): Promise<void> {
              const page = await convex.query(
                api.registrationOperations.exportRoster,
                { sessionId, paginationOpts: { numItems: 100, cursor } }
              );
              pages.push(
                cursor ? page.csv.slice(page.csv.indexOf("\n") + 1) : page.csv
              );
              if (!page.isDone) {
                await nextPage(page.continueCursor);
              }
            }
            await nextPage(null);
            const url = URL.createObjectURL(
              new Blob([pages.join("\n")], { type: "text/csv" })
            );
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "roster.csv";
            anchor.click();
            URL.revokeObjectURL(url);
            setMessage("Complete roster exported");
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
      >
        Export roster CSV
      </Button>
      {roster.results
        .filter((s) =>
          `${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase())
        )
        .map((seat) => (
          <article
            className="space-y-4 rounded border border-slate-400 p-5"
            key={seat._id}
          >
            <label className="font-semibold">
              <input
                checked={selected.includes(seat._id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, seat._id]
                      : selected.filter((id) => id !== seat._id)
                  )
                }
                type="checkbox"
              />{" "}
              {seat.name} · {seat.email} · {seat.state}
            </label>
            <StudentRecord meetings={session?.meetings ?? []} seat={seat} />
          </article>
        ))}
      {roster.status === "CanLoadMore" ? (
        <Button onClick={() => roster.loadMore(20)} type="button">
          Load more attendees
        </Button>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await send({
              sessionId,
              seats: selected,
              subject,
              body,
              requestKey: crypto.randomUUID(),
            });
            setMessage("Selected-attendee message queued");
          } catch (error) {
            setMessage(String(error));
          }
        }}
      >
        <h2 className="text-2xl">Email selected attendees</h2>
        <label className="block">
          Subject
          <Input
            onChange={(e) => setSubject(e.target.value)}
            required
            value={subject}
          />
        </label>
        <label className="block">
          Message
          <textarea
            className="block w-full rounded border p-3"
            onChange={(e) => setBody(e.target.value)}
            required
            value={body}
          />
        </label>
        <Button disabled={!selected.length} type="submit">
          Send to {selected.length} selected attendees
        </Button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
