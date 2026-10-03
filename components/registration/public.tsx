"use client";

import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { type Attendee, quote, WAIVER } from "@/shared/registration/domain";
import { SessionCalendar } from "./calendar";
import { InvitationActions } from "./invitation";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value / 100
  );
const newAttendee = (): Attendee & { key: string } => ({
  key: crypto.randomUUID(),
  name: "",
  email: "",
  selected: [],
  waived: [],
  answers: [],
});
export function ClassDiscovery() {
  const selfPaced = useQuery(api.registration.selfPaced);
  const { results, status, loadMore } = usePaginatedQuery(
    api.registration.discover,
    {},
    { initialNumItems: 20 }
  );
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [calendar, setCalendar] = useState(false);
  const visible = results.filter(
    (s) =>
      `${s.title} ${s.meetings.map((m) => m.location).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!date || new Date(s.firstStart ?? 0).toISOString().startsWith(date))
  );
  return (
    <section className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <h1 className="font-bold text-4xl">Find your next class</h1>
      <p>Choose a course and see the full price before you register.</p>
      <div className="flex flex-wrap gap-4">
        <label>
          Course or location
          <Input onChange={(e) => setSearch(e.target.value)} value={search} />
        </label>
        <label>
          Date
          <Input
            onChange={(e) => setDate(e.target.value)}
            type="date"
            value={date}
          />
        </label>
        <Button onClick={() => setCalendar(!calendar)} type="button">
          {calendar ? "List view" : "Calendar view"}
        </Button>
      </div>
      {calendar ? <SessionCalendar sessions={visible} /> : null}
      <div className={calendar ? "hidden" : "space-y-4"}>
        {visible.map((s) => (
          <article
            className="rounded-lg border border-slate-400 p-6"
            key={s.id}
          >
            <p>
              {s.firstStart
                ? new Date(s.firstStart).toLocaleString("en-US", {
                    timeZone: s.timeZone,
                  })
                : "Self-paced"}{" "}
              {s.timeZone}
            </p>
            <h2 className="font-semibold text-2xl">
              <Link href={`/s/${s.code}`}>{s.title}</Link>
            </h2>
            <p>{s.meetings.map((m) => m.location).join(" · ")}</p>
            <p>
              {money(
                s.config.tuition +
                  s.config.materials
                    .filter((m) => m.policy !== "optional")
                    .reduce((sum, m) => sum + m.cents, 0)
              )}{" "}
              per attendee · {s.available} seats available
            </p>
            <Link className="font-semibold underline" href={`/s/${s.code}`}>
              View class and register
            </Link>
          </article>
        ))}
      </div>
      {status === "LoadingFirstPage" ? (
        <p role="status">Loading classes…</p>
      ) : null}
      {!visible.length && status !== "LoadingFirstPage" ? (
        <p>
          No scheduled classes match. Please contact us for upcoming courses.
        </p>
      ) : null}
      {status === "CanLoadMore" ? (
        <Button onClick={() => loadMore(20)} type="button">
          Load more classes
        </Button>
      ) : null}
      <div className="space-y-3">
        <h2 className="font-semibold text-2xl">Self-paced courses</h2>
        {selfPaced?.map((c) => (
          <p key={c.slug}>
            <Link className="underline" href={`/courses/${c.slug}`}>
              {c.title}
            </Link>{" "}
            · {money(c.tuition)}
          </p>
        ))}
      </div>
      <Link className="underline" href="/registrations">
        Already registered? Open your secure portal
      </Link>
    </section>
  );
}
export function RegistrationDetail({
  code,
  slug,
}: {
  code?: string;
  slug?: string;
}) {
  const offering = useQuery(api.registration.detail, { code, slug });
  const reserve = useMutation(api.registration.reserve);
  const checkout = useAction(api.registrationExternal.checkout);
  const join = useMutation(api.registrationWaitlist.join);
  const [attendees, setAttendees] = useState<(Attendee & { key: string })[]>(
    []
  );
  const [purchaser, setPurchaser] = useState("");
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{
    orderId: Id<"registrationOrders">;
    total: number;
    status: string;
    expires: number;
    requestKey: string;
  } | null>(null);
  const authoritativeReview = useQuery(
    api.registrationPortal.review,
    review ? { orderId: review.orderId, requestKey: review.requestKey } : "skip"
  );
  if (offering === undefined) {
    return (
      <p className="p-12" role="status">
        Loading class…
      </p>
    );
  }
  if (!offering) {
    return <p className="p-12">This offering is unavailable.</p>;
  }
  if (offering.delivery === "scheduled" && !code) {
    return (
      <ScheduledCourse courseId={offering.courseId} title={offering.title} />
    );
  }
  const sessionId = code
    ? (offering.id as Id<"registrationSessions">)
    : undefined;
  function change(index: number, patch: Partial<Attendee>) {
    setAttendees((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }
  async function submit() {
    if (!offering) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const requestKey = crypto.randomUUID();
      const invitation =
        new URLSearchParams(window.location.hash.slice(1)).get("invitation") ??
        undefined;
      const result = await reserve({
        courseId: offering.courseId,
        sessionId,
        purchaser,
        purchaserName: name,
        attendees: attendees.map(({ key: _key, ...a }) => a),
        coupon: coupon || undefined,
        requestKey,
        invitation,
      });
      sessionStorage.setItem(
        "registration-order",
        JSON.stringify({ ...result, requestKey })
      );
      setReview({ ...result, requestKey });
      if (result.status === "settled") {
        window.location.assign("/registration/success");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reserve");
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (!review) {
      return;
    }
    setBusy(true);
    try {
      window.location.assign(
        await checkout({
          orderId: review.orderId,
          requestKey: review.requestKey,
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start payment");
      setBusy(false);
    }
  }
  let estimate = 0;
  try {
    estimate = quote(offering.config, attendees, null, 0).reduce(
      (sum, s) => sum + s.total,
      0
    );
  } catch {
    /* Show the quote after required details are entered. */
  }
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <Link className="underline" href="/classes">
        All classes
      </Link>
      <h1 className="font-bold text-4xl">{offering.title}</h1>
      <InvitationActions />
      <p>{offering.description}</p>
      {offering.delivery === "self-paced" ? (
        <p>
          Buying again creates a new enrollment, even if this attendee has
          previously purchased the course.
        </p>
      ) : null}
      <ul>
        {offering.meetings.map((m) => (
          <li key={m.id}>
            {new Date(m.start).toLocaleString("en-US", {
              timeZone: offering.timeZone,
            })}{" "}
            –{" "}
            {new Date(m.end).toLocaleTimeString("en-US", {
              timeZone: offering.timeZone,
            })}{" "}
            · {m.location || "Online"}
          </li>
        ))}
      </ul>
      <p>
        {offering.timeZone} ·{" "}
        {offering.delivery === "self-paced"
          ? "Self-paced access"
          : `${offering.available} seats available`}
      </p>
      {offering.state === "open" ? (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <fieldset className="space-y-3" disabled={busy || review !== null}>
            <legend className="font-semibold text-xl">Purchaser</legend>
            <label className="block">
              Your name
              <Input
                onChange={(e) => setName(e.target.value)}
                required
                value={name}
              />
            </label>
            <label className="block">
              Your email
              <Input
                onChange={(e) => setPurchaser(e.target.value)}
                required
                type="email"
                value={purchaser}
              />
            </label>
          </fieldset>
          {attendees.map((a, index) => (
            <fieldset
              className="space-y-4 rounded-lg border border-slate-400 p-5"
              disabled={busy || review !== null}
              key={a.key}
            >
              <legend className="px-2 font-semibold">
                Attendee {index + 1}
              </legend>
              <label className="block">
                Full name
                <Input
                  onChange={(e) => change(index, { name: e.target.value })}
                  required
                  value={a.name}
                />
              </label>
              <label className="block">
                Email
                <Input
                  onChange={(e) => change(index, { email: e.target.value })}
                  required
                  type="email"
                  value={a.email}
                />
              </label>
              <p>Tuition: {money(offering.config.tuition)}</p>
              {offering.config.materials.map((m) => (
                <div key={m.id}>
                  <p>
                    {m.title} · {money(m.cents)} ·{" "}
                    {m.policy === "waivable" ? "Required, waivable" : m.policy}
                  </p>
                  {m.policy === "included" ? null : (
                    <label className="flex items-center gap-2">
                      <input
                        checked={
                          m.policy === "optional"
                            ? a.selected.includes(m.id)
                            : a.waived.includes(m.id)
                        }
                        onChange={(e) => {
                          const field =
                            m.policy === "optional" ? "selected" : "waived";
                          change(index, {
                            [field]: e.target.checked
                              ? [...a[field], m.id]
                              : a[field].filter((id) => id !== m.id),
                          });
                        }}
                        type="checkbox"
                      />
                      {m.policy === "optional" ? "Add this material" : WAIVER}
                    </label>
                  )}
                </div>
              ))}
              {offering.config.questions.map((q) => (
                <label
                  className="block"
                  htmlFor={`question-${a.key}-${q.id}`}
                  key={q.id}
                >
                  {q.title}
                  {q.required ? " (required)" : ""}
                  {q.type === "checkbox" ? (
                    <input
                      className="ml-2"
                      id={`question-${a.key}-${q.id}`}
                      onChange={(e) =>
                        change(index, {
                          answers: [
                            ...a.answers.filter((answer) => answer.id !== q.id),
                            { id: q.id, value: e.target.checked },
                          ],
                        })
                      }
                      required={q.required}
                      type="checkbox"
                    />
                  ) : null}
                  {q.type === "choice" ? (
                    <select
                      className="block w-full rounded border p-2"
                      defaultValue=""
                      id={`question-${a.key}-${q.id}`}
                      onChange={(e) =>
                        change(index, {
                          answers: [
                            ...a.answers.filter((answer) => answer.id !== q.id),
                            { id: q.id, value: e.target.value },
                          ],
                        })
                      }
                      required={q.required}
                    >
                      <option value="">Choose…</option>
                      {q.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : null}
                  {q.type === "text" ? (
                    <Input
                      id={`question-${a.key}-${q.id}`}
                      onChange={(e) =>
                        change(index, {
                          answers: [
                            ...a.answers.filter((answer) => answer.id !== q.id),
                            { id: q.id, value: e.target.value },
                          ],
                        })
                      }
                      required={q.required}
                    />
                  ) : null}
                </label>
              ))}
              <Button
                onClick={() =>
                  setAttendees(attendees.filter((row) => row.key !== a.key))
                }
                type="button"
                variant="outline"
              >
                Remove attendee
              </Button>
            </fieldset>
          ))}
          {review ? (
            <div className="rounded border border-blue-700 p-6">
              <h2 className="font-semibold text-2xl">Order review</h2>
              {authoritativeReview?.seats.map((seat) => (
                <div className="my-3 border-b pb-3" key={seat.email}>
                  <h3 className="font-semibold">{seat.name}</h3>
                  {seat.lines.map((line) => (
                    <p key={line.id}>
                      {line.title}: {money(line.cents)} − {money(line.discount)}{" "}
                      discount
                    </p>
                  ))}
                  <p>Attendee total: {money(seat.total)}</p>
                </div>
              ))}
              <p>
                {attendees.length} attendees · Final total {money(review.total)}
              </p>
              <p>
                Your reservation expires at{" "}
                {new Date(review.expires).toLocaleTimeString()}.
              </p>
              <Button disabled={busy} onClick={pay} type="button">
                Continue to secure test payment
              </Button>
            </div>
          ) : (
            <>
              <Button
                disabled={busy || attendees.length >= 20}
                onClick={() => setAttendees([...attendees, newAttendee()])}
                type="button"
              >
                Add attendee
              </Button>
              <label className="block">
                Coupon
                <Input
                  onChange={(e) => setCoupon(e.target.value)}
                  value={coupon}
                />
              </label>
              <p>Estimated total before coupon: {money(estimate)}</p>
              <Button disabled={busy || !attendees.length} type="submit">
                Review final total and reserve seats
              </Button>
            </>
          )}
          {offering.available === 0 && sessionId ? (
            <Button
              disabled={busy || !purchaser || !name}
              onClick={async () => {
                try {
                  await join({ sessionId, name, email: purchaser });
                  setError(
                    "You have joined the waitlist. No payment is required."
                  );
                } catch (e) {
                  setError(String(e));
                }
              }}
              type="button"
              variant="outline"
            >
              Join waitlist using purchaser details
            </Button>
          ) : null}
        </form>
      ) : (
        <p role="status">
          This session is {offering.state}. Please contact us for assistance.
        </p>
      )}
      {error ? (
        <p className="rounded bg-red-50 p-4 text-red-900" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
export function RegistrationSuccess() {
  const [order, setOrder] = useState<{
    orderId: Id<"registrationOrders">;
    requestKey: string;
  } | null>(null);
  const status = useQuery(api.registrationPortal.status, order ?? "skip");
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-12">
      <h1 className="font-bold text-3xl">Registration status</h1>
      <p>
        {status?.status === "settled"
          ? "Your registration is confirmed. Check your email for access instructions."
          : "Payment may still be processing. Confirmation follows verified payment."}
      </p>
      <Button
        onClick={() => {
          const value = sessionStorage.getItem("registration-order");
          if (value) {
            const parsed = JSON.parse(value);
            setOrder({
              orderId: parsed.orderId,
              requestKey: parsed.requestKey,
            });
          }
        }}
        type="button"
      >
        Check this order
      </Button>
      <Link className="block underline" href="/registrations">
        Open secure registration portal
      </Link>
    </section>
  );
}

function ScheduledCourse({
  courseId,
  title,
}: {
  courseId: Id<"registrationCourses">;
  title: string;
}) {
  const sessions = useQuery(api.registration.publicCourseSessions, {
    courseId,
  });
  return (
    <section className="mx-auto max-w-4xl space-y-5 p-12">
      <h1 className="text-3xl">{title}</h1>
      <h2 className="text-2xl">Scheduled availability</h2>
      {sessions?.map((s) => (
        <p key={s.code}>
          <Link className="underline" href={`/s/${s.code}`}>
            {s.title} · {new Date(s.start).toLocaleString()} · {s.available}{" "}
            seats
          </Link>
        </p>
      ))}
      {sessions?.length === 0 ? (
        <p>No public sessions are currently available.</p>
      ) : null}
    </section>
  );
}
