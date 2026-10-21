"use client";

import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutGrid,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  type Attendee,
  formatMoney,
  MAX_SEATS,
  type Settings,
  WAIVER,
} from "@/shared/registration/domain";
import { SessionCalendar } from "./calendar";
import {
  formatDateTime,
  formatMeeting,
  formatRelative,
  formatTime,
  formatWeekday,
  pluralize,
  shortZone,
} from "./format";
import { InvitationActions } from "./invitation";

type Offering = NonNullable<FunctionReturnType<typeof api.registration.detail>>;
type Material = Settings["materials"][number];
type Question = Settings["questions"][number];
type AttendeeRow = Attendee & { key: string };
type Review = {
  orderId: Id<"registrationOrders">;
  total: number;
  status: string;
  expires: number;
  requestKey: string;
};

const TAX_NOTE =
  "Sales tax is calculated at payment from your billing address.";

const newAttendee = (): AttendeeRow => ({
  key: crypto.randomUUID(),
  name: "",
  email: "",
  selected: [],
  waived: [],
  answers: [],
});

/** Tuition plus every material a default attendee pays for. */
function basePrice(config: Settings) {
  return (
    config.tuition +
    config.materials
      .filter((m) => m.policy !== "optional")
      .reduce((sum, m) => sum + m.cents, 0)
  );
}
/** What one attendee pays before coupons, honoring their material choices. */
function attendeeSubtotal(config: Settings, attendee: Attendee) {
  return config.materials.reduce((sum, m) => {
    if (m.policy === "included") {
      return sum + m.cents;
    }
    if (m.policy === "optional") {
      return attendee.selected.includes(m.id) ? sum + m.cents : sum;
    }
    return attendee.waived.includes(m.id) ? sum : sum + m.cents;
  }, config.tuition);
}
function locationsOf(meetings: { location: string }[]) {
  const unique = [...new Set(meetings.map((m) => m.location).filter(Boolean))];
  return unique.length ? unique.join(" · ") : "Online";
}
function dayKey(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}
function policyLabel(policy: Material["policy"]) {
  if (policy === "included") {
    return "Included";
  }
  if (policy === "optional") {
    return "Optional add-on";
  }
  return "Required, waivable if you already have it";
}
function policyTone(policy: Material["policy"]) {
  if (policy === "included") {
    return "success" as const;
  }
  return policy === "optional" ? ("info" as const) : ("warning" as const);
}

function SeatsBadge({ available }: { available?: number }) {
  if (available === undefined) {
    return <Badge tone="info">Start anytime</Badge>;
  }
  if (available === 0) {
    return <Badge tone="danger">Full · waitlist</Badge>;
  }
  if (available <= 3) {
    return <Badge tone="warning">Few seats left</Badge>;
  }
  return <Badge tone="success">{pluralize(available, "seat")} left</Badge>;
}

function DateBlock({ start, timeZone }: { start?: number; timeZone?: string }) {
  if (!start) {
    return (
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Clock aria-hidden="true" className="h-6 w-6" />
      </div>
    );
  }
  const date = new Date(start);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone,
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone,
  }).format(date);
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-white">
      <span className="font-medium text-xs uppercase tracking-wide">
        {month}
      </span>
      <span className="font-bold text-2xl tabular-nums leading-none">
        {day}
      </span>
    </div>
  );
}

/* ----------------------------- Discovery ----------------------------- */

type DiscoveredSession = FunctionReturnType<
  typeof api.registration.discover
>["page"][number];

function meetingsSummary(s: DiscoveredSession) {
  if (!s.firstStart) {
    return "Self-paced";
  }
  const zone = s.timeZone ? shortZone(s.timeZone, s.firstStart) : "";
  return `${pluralize(s.meetings.length, "meeting")} · starts ${formatWeekday(s.firstStart, s.timeZone)} · ${formatTime(s.firstStart, s.timeZone)} ${zone}`.trim();
}

function SessionCard({ session }: { session: DiscoveredSession }) {
  const href = `/s/${session.code}`;
  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex grow gap-4 p-5">
        <DateBlock start={session.firstStart} timeZone={session.timeZone} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="m-0 font-semibold text-lg text-slate-900 leading-snug">
            <Link className="hover:text-primary" href={href}>
              {session.title}
            </Link>
          </h2>
          <p className="m-0 flex items-start gap-1.5 text-slate-600 text-sm">
            <CalendarDays
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            />
            {meetingsSummary(session)}
          </p>
          <p className="m-0 flex items-start gap-1.5 text-slate-600 text-sm">
            <MapPin
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            />
            {locationsOf(session.meetings)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <div className="space-y-1">
          <p className="m-0 font-semibold text-slate-900">
            {`${formatMoney(basePrice(session.config))} per attendee`}
          </p>
          <SeatsBadge available={session.available} />
        </div>
        <Button href={href} size="sm">
          View class and register
        </Button>
      </CardFooter>
    </Card>
  );
}

function ViewToggle({
  calendar,
  onChange,
}: {
  calendar: boolean;
  onChange: (calendar: boolean) => void;
}) {
  const option = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
      active
        ? "bg-primary text-white"
        : "bg-white text-slate-700 hover:bg-slate-50"
    );
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 shadow-xs">
      <button
        aria-pressed={!calendar}
        className={option(!calendar)}
        onClick={() => onChange(false)}
        type="button"
      >
        <LayoutGrid aria-hidden="true" className="h-4 w-4" />
        List view
      </button>
      <button
        aria-pressed={calendar}
        className={cn(option(calendar), "border-slate-300 border-l")}
        onClick={() => onChange(true)}
        type="button"
      >
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        Calendar view
      </button>
    </div>
  );
}

function FilterBar({
  search,
  date,
  calendar,
  onSearch,
  onDate,
  onView,
}: {
  search: string;
  date: string;
  calendar: boolean;
  onSearch: (value: string) => void;
  onDate: (value: string) => void;
  onView: (calendar: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <Field label="Course or location">
          {(props) => (
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400"
              />
              <TextInput
                {...props}
                className="pl-9"
                onChange={(e) => onSearch(e.target.value)}
                placeholder="BLS, Heartsaver, Vancouver…"
                type="search"
                value={search}
              />
            </div>
          )}
        </Field>
        <Field label="Date">
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onDate(e.target.value)}
              type="date"
              value={date}
            />
          )}
        </Field>
        <ViewToggle calendar={calendar} onChange={onView} />
      </CardContent>
    </Card>
  );
}

function SelfPacedSection({
  courses,
}: {
  courses: FunctionReturnType<typeof api.registration.selfPaced> | undefined;
}) {
  if (!courses?.length) {
    return null;
  }
  return (
    <section className="space-y-4">
      <div>
        <h2 className="m-0 font-bold text-2xl text-slate-900">
          Self-paced courses
        </h2>
        <p className="m-0 mt-1 text-slate-500 text-sm">
          Online coursework you can start today and finish on your schedule.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Card className="flex flex-col" key={c.slug}>
            <CardContent className="flex grow gap-4 p-5">
              <DateBlock />
              <div className="min-w-0 flex-1 space-y-1.5">
                <h3 className="m-0 font-semibold text-lg text-slate-900 leading-snug">
                  <Link
                    className="hover:text-primary"
                    href={`/courses/${c.slug}`}
                  >
                    {c.title}
                  </Link>
                </h3>
                <Badge tone="info">Start anytime</Badge>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <p className="m-0 font-semibold text-slate-900">
                {`${formatMoney(c.tuition)} per learner`}
              </p>
              <Button href={`/courses/${c.slug}`} size="sm" variant="secondary">
                View course
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

const TEAM_BENEFITS = [
  "On-site at your workplace or at our Vancouver, WA facility",
  "Volume pricing for groups of any size",
  "Invoice and purchase-order billing with a dedicated coordinator",
];

function TeamTrainingCard() {
  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-white">
      <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="m-0 font-bold text-slate-900 text-xl">
              Training for your team?
            </h2>
          </div>
          <ul className="m-0 list-none space-y-1.5 p-0">
            {TEAM_BENEFITS.map((benefit) => (
              <li
                className="flex items-start gap-2 text-slate-700 text-sm"
                key={benefit}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <Button className="shrink-0" href="/group-training">
          Request group training
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionGrid({
  sessions,
  loading,
}: {
  sessions: DiscoveredSession[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div aria-busy="true" className="grid gap-4 md:grid-cols-2" role="status">
        <span className="sr-only">Loading classes…</span>
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton className="h-44" key={k} />
        ))}
      </div>
    );
  }
  if (!sessions.length) {
    return (
      <EmptyState
        action={
          <Button href="/contact" size="sm" variant="secondary">
            Contact us
          </Button>
        }
        description="Try clearing your filters, or contact us for upcoming courses."
        title="No scheduled classes match"
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}
    </div>
  );
}

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
  const needle = search.trim().toLowerCase();
  const visible = results.filter(
    (s) =>
      `${s.title} ${s.meetings.map((m) => m.location).join(" ")}`
        .toLowerCase()
        .includes(needle) &&
      (!date || (s.firstStart ? dayKey(s.firstStart, s.timeZone) : "") === date)
  );
  return (
    <div className="bg-slate-50">
      <section className="bg-linear-to-br from-primary to-primary-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="m-0 mb-2 font-medium text-white/80 text-xs uppercase tracking-wide">
            Classes
          </p>
          <h1 className="m-0 font-bold text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Find your next class
          </h1>
          <p className="m-0 mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
            See every date, location, and the full price before you register. No
            account required.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl space-y-8 px-4 pb-16 sm:px-6">
        <div className="-mt-8">
          <FilterBar
            calendar={calendar}
            date={date}
            onDate={setDate}
            onSearch={setSearch}
            onView={setCalendar}
            search={search}
          />
        </div>
        {calendar ? (
          <SessionCalendar
            sessions={visible.map((s) => ({
              code: s.code ?? "",
              title: s.title,
              firstStart: s.firstStart,
              timeZone: s.timeZone ?? "UTC",
            }))}
          />
        ) : (
          <SessionGrid
            loading={status === "LoadingFirstPage"}
            sessions={visible}
          />
        )}
        {status === "CanLoadMore" ? (
          <div className="flex justify-center">
            <Button
              onClick={() => loadMore(20)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Load more classes
            </Button>
          </div>
        ) : null}
        {status === "LoadingMore" ? (
          <p className="m-0 text-center text-slate-500 text-sm" role="status">
            Loading more classes…
          </p>
        ) : null}
        <SelfPacedSection courses={selfPaced} />
        <TeamTrainingCard />
        <p className="m-0 text-center text-slate-600 text-sm">
          Already registered?{" "}
          <Link
            className="font-medium text-primary underline-offset-2 hover:underline"
            href="/registrations"
          >
            Open your secure portal
          </Link>
        </p>
      </section>
    </div>
  );
}

/* ------------------------------- Detail ------------------------------ */

function useRegistrationForm(
  offering: Offering,
  sessionId: Id<"registrationSessions"> | undefined
) {
  const reserve = useMutation(api.registration.reserve);
  const checkout = useAction(api.registrationExternal.checkout);
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [purchaser, setPurchaser] = useState("");
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const authoritativeReview = useQuery(
    api.registrationPortal.review,
    review ? { orderId: review.orderId, requestKey: review.requestKey } : "skip"
  );
  const change = useCallback((key: string, patch: Partial<Attendee>) => {
    setAttendees((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }, []);
  const remove = useCallback((key: string) => {
    setAttendees((rows) => rows.filter((row) => row.key !== key));
  }, []);
  const add = useCallback(() => {
    setAttendees((rows) =>
      rows.length >= MAX_SEATS ? rows : [...rows, newAttendee()]
    );
  }, []);
  async function submit() {
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
    setError("");
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
  const estimate = attendees.reduce(
    (sum, a) => sum + attendeeSubtotal(offering.config, a),
    0
  );
  return {
    attendees,
    add,
    remove,
    change,
    purchaser,
    setPurchaser,
    name,
    setName,
    coupon,
    setCoupon,
    error,
    setError,
    busy,
    review,
    authoritativeReview,
    submit,
    pay,
    estimate,
  };
}
type RegistrationForm = ReturnType<typeof useRegistrationForm>;

function DetailSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6"
      role="status"
    >
      <span className="sr-only">Loading class…</span>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-72" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  trailing,
  required,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  trailing?: ReactNode;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        checked={checked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-slate-300 text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        disabled={disabled}
        id={id}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        type="checkbox"
      />
      <label className="font-medium text-slate-800 text-sm" htmlFor={id}>
        {label}
      </label>
      {trailing ? (
        <span className="ml-auto whitespace-nowrap text-slate-600 text-sm tabular-nums">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

function MaterialChoice({
  material,
  attendee,
  onChange,
}: {
  material: Material;
  attendee: AttendeeRow;
  onChange: (patch: Partial<Attendee>) => void;
}) {
  if (material.policy === "included") {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-700">{material.title}</span>
        <span className="text-slate-500">
          {material.cents ? formatMoney(material.cents) : "Included"}
        </span>
      </div>
    );
  }
  const optional = material.policy === "optional";
  const field = optional ? "selected" : "waived";
  const checked = attendee[field].includes(material.id);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-700">{material.title}</span>
        <span className="text-slate-500">
          {optional ? "Optional" : formatMoney(material.cents)}
        </span>
      </div>
      <CheckRow
        checked={checked}
        label={optional ? "Add this material" : WAIVER}
        onChange={(next) =>
          onChange({
            [field]: next
              ? [...attendee[field], material.id]
              : attendee[field].filter((id) => id !== material.id),
          })
        }
        trailing={`${optional ? "+" : "−"} ${formatMoney(material.cents)}`}
      />
    </div>
  );
}

function QuestionField({
  question,
  attendee,
  onChange,
}: {
  question: Question;
  attendee: AttendeeRow;
  onChange: (patch: Partial<Attendee>) => void;
}) {
  const label = `${question.title}${question.required ? " (required)" : ""}`;
  const current = attendee.answers.find((a) => a.id === question.id)?.value;
  const answer = (value: string | boolean) =>
    onChange({
      answers: [
        ...attendee.answers.filter((a) => a.id !== question.id),
        { id: question.id, value },
      ],
    });
  const hint = question.policyUrl ? (
    <a
      className="text-primary underline-offset-2 hover:underline"
      href={question.policyUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      Read the policy
    </a>
  ) : undefined;
  if (question.type === "checkbox") {
    return (
      <div className="space-y-1">
        <CheckRow
          checked={current === true}
          label={label}
          onChange={answer}
          required={question.required}
        />
        {hint ? <p className="m-0 pl-7 text-xs">{hint}</p> : null}
      </div>
    );
  }
  if (question.type === "choice") {
    return (
      <Field hint={hint} label={label}>
        {(props) => (
          <Select
            {...props}
            onChange={(e) => answer(e.target.value)}
            required={question.required}
            value={typeof current === "string" ? current : ""}
          >
            <option value="">Choose…</option>
            {question.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        )}
      </Field>
    );
  }
  return (
    <Field hint={hint} label={label}>
      {(props) => (
        <TextInput
          {...props}
          onChange={(e) => answer(e.target.value)}
          required={question.required}
          value={typeof current === "string" ? current : ""}
        />
      )}
    </Field>
  );
}

function AttendeeCard({
  attendee,
  index,
  config,
  disabled,
  onChange,
  onRemove,
}: {
  attendee: AttendeeRow;
  index: number;
  config: Settings;
  disabled: boolean;
  onChange: (patch: Partial<Attendee>) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}>
        <CardHeader className="sm:items-center">
          <CardTitle>Attendee {index + 1}</CardTitle>
          <Button
            disabled={disabled}
            onClick={onRemove}
            size="xs"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Remove
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="off"
                  onChange={(e) => onChange({ name: e.target.value })}
                  required
                  value={attendee.name}
                />
              )}
            </Field>
            <Field label="Email">
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="off"
                  onChange={(e) => onChange({ email: e.target.value })}
                  required
                  type="email"
                  value={attendee.email}
                />
              )}
            </Field>
          </div>
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-800">Tuition</span>
              <span className="text-slate-700 tabular-nums">
                {formatMoney(config.tuition)}
              </span>
            </div>
            {config.materials.map((m) => (
              <MaterialChoice
                attendee={attendee}
                key={m.id}
                material={m}
                onChange={onChange}
              />
            ))}
            <div className="flex items-center justify-between gap-3 border-slate-200 border-t pt-3 text-sm">
              <span className="font-semibold text-slate-900">
                Attendee subtotal
              </span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatMoney(attendeeSubtotal(config, attendee))}
              </span>
            </div>
          </div>
          {config.questions.length ? (
            <div className="space-y-4">
              {config.questions.map((q) => (
                <QuestionField
                  attendee={attendee}
                  key={q.id}
                  onChange={onChange}
                  question={q}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </fieldset>
    </Card>
  );
}

function PurchaserCard({ form }: { form: RegistrationForm }) {
  const disabled = form.busy || form.review !== null;
  return (
    <Card>
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}>
        <CardHeader>
          <div>
            <CardTitle>Purchaser</CardTitle>
            <CardDescription>
              Receipts and access links are sent to this address. You can
              register yourself or others.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            {(props) => (
              <TextInput
                {...props}
                autoComplete="name"
                onChange={(e) => form.setName(e.target.value)}
                required
                value={form.name}
              />
            )}
          </Field>
          <Field label="Your email">
            {(props) => (
              <TextInput
                {...props}
                autoComplete="email"
                onChange={(e) => form.setPurchaser(e.target.value)}
                required
                type="email"
                value={form.purchaser}
              />
            )}
          </Field>
        </CardContent>
      </fieldset>
    </Card>
  );
}

function AttendeesSection({
  form,
  config,
}: {
  form: RegistrationForm;
  config: Settings;
}) {
  const disabled = form.busy || form.review !== null;
  const atMax = form.attendees.length >= MAX_SEATS;
  return (
    <div className="space-y-4">
      {form.attendees.map((a, index) => (
        <AttendeeCard
          attendee={a}
          config={config}
          disabled={disabled}
          index={index}
          key={a.key}
          onChange={(patch) => form.change(a.key, patch)}
          onRemove={() => form.remove(a.key)}
        />
      ))}
      {form.review ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={disabled || atMax}
            onClick={form.add}
            size="sm"
            type="button"
            variant={form.attendees.length ? "secondary" : "primary"}
          >
            Add attendee
          </Button>
          <span className="text-slate-500 text-xs">
            {atMax
              ? `Up to ${MAX_SEATS} attendees per order. For larger groups, request group training.`
              : `Register up to ${MAX_SEATS} attendees in one order.`}
          </span>
        </div>
      )}
    </div>
  );
}

function CouponCard({ form }: { form: RegistrationForm }) {
  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field
          hint="Discounts are applied per attendee when you review your total."
          label="Coupon code"
        >
          {(props) => (
            <TextInput
              {...props}
              autoComplete="off"
              disabled={form.busy}
              onChange={(e) => form.setCoupon(e.target.value)}
              placeholder="Optional"
              value={form.coupon}
            />
          )}
        </Field>
      </CardContent>
    </Card>
  );
}

function HoldCountdown({ expires }: { expires: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const expired = expires <= now;
  return (
    <p
      className={cn(
        "m-0 flex items-center gap-1.5 text-xs",
        expired ? "text-rose-700" : "text-slate-500"
      )}
    >
      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
      {expired
        ? "Your reservation has expired. Reload to start again."
        : `Seats held until ${formatTime(expires)} (${formatRelative(expires, now)}).`}
    </p>
  );
}

function ReviewSummary({ form }: { form: RegistrationForm }) {
  const { review, authoritativeReview: quoteResult } = form;
  if (!review) {
    return null;
  }
  return (
    <div className="space-y-4">
      {quoteResult === undefined ? <Skeleton className="h-20" /> : null}
      {quoteResult === null ? (
        <Notice tone="warning">
          We couldn’t load the itemized quote. The total below is from your
          reservation.
        </Notice>
      ) : null}
      {quoteResult?.seats.map((seat) => (
        <div className="space-y-1 text-sm" key={seat.email}>
          <p className="m-0 font-medium text-slate-900">{seat.name}</p>
          {seat.lines.map((line) => (
            <div
              className="flex items-center justify-between gap-3 text-slate-600"
              key={line.id}
            >
              <span>{line.title}</span>
              <span className="tabular-nums">
                {line.discount > 0 ? (
                  <span className="mr-2 text-emerald-700">
                    − {formatMoney(line.discount)}
                  </span>
                ) : null}
                {formatMoney(line.cents)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-slate-100 border-t pt-1 text-slate-800">
            <span>Attendee total</span>
            <span className="tabular-nums">{formatMoney(seat.total)}</span>
          </div>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 border-slate-200 border-t pt-3">
        <span className="font-semibold text-slate-900">
          Final total · {pluralize(form.attendees.length, "attendee")}
        </span>
        <span className="font-bold text-slate-900 text-xl tabular-nums">
          {formatMoney(quoteResult?.total ?? review.total)}
        </span>
      </div>
      <p className="m-0 text-slate-500 text-xs">{TAX_NOTE}</p>
      <HoldCountdown expires={review.expires} />
      <Button
        className="w-full"
        disabled={form.busy}
        onClick={form.pay}
        type="button"
      >
        {form.busy ? "Working…" : "Continue to secure payment"}
      </Button>
    </div>
  );
}

function WaitlistAction({
  sessionId,
  form,
}: {
  sessionId: Id<"registrationSessions">;
  form: RegistrationForm;
}) {
  const join = useMutation(api.registrationWaitlist.join);
  const [busy, setBusy] = useState(false);
  const ready = Boolean(form.purchaser && form.name);
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="m-0 font-medium text-amber-900 text-sm">
        This class is full
      </p>
      <p className="m-0 text-amber-900/80 text-xs">
        Join the waitlist with your purchaser details and we’ll email you if a
        seat opens. No payment is required.
      </p>
      <Button
        className="w-full"
        disabled={busy || form.busy || !ready}
        onClick={async () => {
          setBusy(true);
          form.setError("");
          try {
            await join({ sessionId, name: form.name, email: form.purchaser });
            form.setError(
              "You have joined the waitlist. No payment is required."
            );
          } catch (e) {
            form.setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        {busy ? "Working…" : "Join waitlist using purchaser details"}
      </Button>
      {ready ? null : (
        <p className="m-0 text-amber-900/80 text-xs">
          Enter your name and email above first.
        </p>
      )}
    </div>
  );
}

function OrderSummary({
  offering,
  sessionId,
  form,
}: {
  offering: Offering;
  sessionId?: Id<"registrationSessions">;
  form: RegistrationForm;
}) {
  const open = offering.state === "open";
  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <div>
          <CardTitle>
            {form.review ? "Order review" : "Order summary"}
          </CardTitle>
          <CardDescription>
            {form.review
              ? "Final total confirmed by our system."
              : "Prices shown per attendee, before any coupon."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.review ? (
          <ReviewSummary form={form} />
        ) : (
          <>
            {form.attendees.length ? (
              <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
                {form.attendees.map((a, index) => (
                  <li
                    className="flex items-center justify-between gap-3 text-slate-700"
                    key={a.key}
                  >
                    <span className="truncate">
                      {a.name.trim() || `Attendee ${index + 1}`}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(attendeeSubtotal(offering.config, a))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-slate-500 text-sm">
                {`${formatMoney(basePrice(offering.config))} per attendee. Add at least one attendee to continue.`}
              </p>
            )}
            <p className="m-0 border-slate-200 border-t pt-3 font-semibold text-slate-900">
              {`Estimated total before coupon: ${formatMoney(form.estimate)}`}
            </p>
            <p className="m-0 text-slate-500 text-xs">{TAX_NOTE}</p>
            {open ? (
              <Button
                className="w-full"
                disabled={form.busy || !form.attendees.length}
                type="submit"
              >
                {form.busy
                  ? "Working…"
                  : "Review final total and reserve seats"}
              </Button>
            ) : null}
            {open && offering.available === 0 && sessionId ? (
              <WaitlistAction form={form} sessionId={sessionId} />
            ) : null}
          </>
        )}
        <p className="m-0 flex items-start gap-1.5 text-slate-500 text-xs">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          Seats are held for a short time while you pay. Payments are processed
          securely by Stripe.
        </p>
      </CardContent>
    </Card>
  );
}

function OfferingDetails({ offering }: { offering: Offering }) {
  const zone = offering.timeZone;
  const abbreviation = zone ? shortZone(zone, offering.firstStart) : "";
  const cutoff =
    offering.firstStart && offering.config.cutoffMinutes > 0
      ? offering.firstStart - offering.config.cutoffMinutes * 60_000
      : null;
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">
              {offering.delivery === "self-paced"
                ? "Self-paced course"
                : "Scheduled class"}
            </Badge>
            {offering.state === "open" ? (
              <SeatsBadge available={offering.available} />
            ) : (
              <Badge className="capitalize" tone="neutral">
                {offering.state}
              </Badge>
            )}
          </div>
          <h1 className="m-0 font-bold text-3xl text-slate-900 leading-tight lg:text-4xl">
            {offering.title}
          </h1>
          {offering.description ? (
            <p className="m-0 whitespace-pre-line text-slate-700">
              {offering.description}
            </p>
          ) : null}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h2 className="m-0 mb-2 font-semibold text-slate-900 text-sm uppercase tracking-wide">
              Schedule
            </h2>
            {offering.meetings.length ? (
              <ul className="m-0 list-none space-y-2 p-0">
                {offering.meetings.map((m) => (
                  <li className="flex items-start gap-2 text-sm" key={m.id}>
                    <CalendarDays
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    />
                    <span>
                      <span className="block text-slate-900">
                        {formatMeeting(m, zone)} {abbreviation}
                      </span>
                      <span className="block text-slate-500 text-xs">
                        {m.location || "Online"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 flex items-start gap-2 text-slate-700 text-sm">
                <Clock
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                Start anytime. Access instructions arrive by email after
                payment.
              </p>
            )}
            {cutoff ? (
              <p className="m-0 mt-2 text-slate-500 text-xs">
                Registration closes {formatDateTime(cutoff, zone)}{" "}
                {abbreviation}.
              </p>
            ) : null}
          </div>
          <div>
            <h2 className="m-0 mb-2 font-semibold text-slate-900 text-sm uppercase tracking-wide">
              What’s included
            </h2>
            <ul className="m-0 list-none space-y-2 p-0">
              <li className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-900">Tuition</span>
                <span className="text-slate-700 tabular-nums">
                  {formatMoney(offering.config.tuition)}
                </span>
              </li>
              {offering.config.materials.map((m) => (
                <li className="text-sm" key={m.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-900">{m.title}</span>
                    <span className="text-slate-700 tabular-nums">
                      {formatMoney(m.cents)}
                    </span>
                  </div>
                  <Badge className="mt-1" tone={policyTone(m.policy)}>
                    {policyLabel(m.policy)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {offering.delivery === "self-paced" ? (
          <Notice tone="info">
            Buying again creates a new enrollment, even if this attendee has
            previously purchased the course.
          </Notice>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ClosedState({ state }: { state: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="m-0 font-semibold text-slate-900" role="status">
          This session is {state}. Please contact us for assistance.
        </p>
        <p className="m-0 text-slate-600 text-sm">
          Registration isn’t available for this offering right now. We can help
          you find another date or arrange training for your group.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/contact" size="sm">
            Contact us
          </Button>
          <Button href="/classes" size="sm" variant="secondary">
            Browse other classes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OfferingPage({
  offering,
  sessionId,
}: {
  offering: Offering;
  sessionId?: Id<"registrationSessions">;
}) {
  const form = useRegistrationForm(offering, sessionId);
  const open = offering.state === "open";
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-primary text-sm underline-offset-2 hover:underline"
          href="/classes"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          All classes
        </Link>
        <InvitationActions />
        <form
          className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
          onSubmit={(e) => {
            e.preventDefault();
            form.submit();
          }}
        >
          <div className="min-w-0 space-y-6">
            <OfferingDetails offering={offering} />
            {open ? (
              <>
                <PurchaserCard form={form} />
                <AttendeesSection config={offering.config} form={form} />
                {form.review ? null : <CouponCard form={form} />}
              </>
            ) : (
              <ClosedState state={offering.state} />
            )}
            <ResultNotice message={form.error} />
          </div>
          <aside className="min-w-0">
            <OrderSummary
              form={form}
              offering={offering}
              sessionId={sessionId}
            />
          </aside>
        </form>
      </div>
    </div>
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
  if (offering === undefined) {
    return <DetailSkeleton />;
  }
  if (!offering) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          action={
            <Button href="/classes" size="sm">
              Browse classes
            </Button>
          }
          description="It may have been removed or is not yet published."
          title="This offering is unavailable."
        />
      </div>
    );
  }
  if (offering.delivery === "scheduled" && !code) {
    return (
      <ScheduledCourse
        courseId={offering.courseId}
        description={offering.description}
        title={offering.title}
      />
    );
  }
  return (
    <OfferingPage
      offering={offering}
      sessionId={code ? (offering.id as Id<"registrationSessions">) : undefined}
    />
  );
}

/* ------------------------------- Success ----------------------------- */

export function RegistrationSuccess() {
  const [order, setOrder] = useState<{
    orderId: Id<"registrationOrders">;
    requestKey: string;
  } | null>(null);
  const [missing, setMissing] = useState(false);
  const status = useQuery(api.registrationPortal.status, order ?? "skip");
  const settled = status?.status === "settled";
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
        <Card>
          <CardContent className="space-y-6 p-8 text-center">
            <div
              className={cn(
                "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                settled
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-primary/10 text-primary"
              )}
            >
              {settled ? (
                <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
              ) : (
                <Clock aria-hidden="true" className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="m-0 font-bold text-2xl text-slate-900 lg:text-3xl">
                Registration status
              </h1>
              {status ? (
                <Badge tone={settled ? "success" : "warning"}>
                  {settled ? "Paid" : status.status}
                </Badge>
              ) : null}
              <p className="m-0 text-slate-700">
                {settled
                  ? "Your registration is confirmed. Check your email for access instructions."
                  : "Payment may still be processing. Confirmation follows verified payment."}
              </p>
              {status ? (
                <p className="m-0 text-slate-500 text-sm">
                  Total charged {formatMoney(status.total + (status.tax ?? 0))}
                  {status.tax
                    ? ` (includes ${formatMoney(status.tax)} sales tax)`
                    : ""}
                  {settled ? "." : ". Check again in a moment."}
                </p>
              ) : null}
            </div>
            <Button
              onClick={() => {
                const value = sessionStorage.getItem("registration-order");
                if (value) {
                  const parsed = JSON.parse(value);
                  setMissing(false);
                  setOrder({
                    orderId: parsed.orderId,
                    requestKey: parsed.requestKey,
                  });
                } else {
                  setMissing(true);
                }
              }}
              type="button"
            >
              Check this order
            </Button>
            {missing ? (
              <Notice tone="warning">
                We couldn’t find a recent order in this browser. Use the secure
                portal to view your registrations.
              </Notice>
            ) : null}
            <div className="rounded-lg bg-slate-50 p-4 text-left">
              <p className="m-0 mb-2 font-semibold text-slate-900 text-sm">
                What happens next
              </p>
              <ul className="m-0 list-none space-y-1.5 p-0 text-slate-600 text-sm">
                {[
                  "Each attendee receives a confirmation email with class details.",
                  "Course materials and access links appear in the secure portal.",
                  "Need a change? Reply to your confirmation or contact us.",
                ].map((step) => (
                  <li className="flex items-start gap-2" key={step}>
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              className="block font-medium text-primary text-sm underline-offset-2 hover:underline"
              href="/registrations"
            >
              Open secure registration portal
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------- Course listing ------------------------- */

function ScheduledCourse({
  courseId,
  title,
  description,
}: {
  courseId: Id<"registrationCourses">;
  title: string;
  description: string;
}) {
  const sessions = useQuery(api.registration.publicCourseSessions, {
    courseId,
  });
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-primary text-sm underline-offset-2 hover:underline"
          href="/classes"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          All classes
        </Link>
        <div>
          <p className="m-0 mb-1 font-medium text-primary text-xs uppercase tracking-wide">
            Scheduled course
          </p>
          <h1 className="m-0 font-bold text-3xl text-slate-900 leading-tight lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="m-0 mt-2 max-w-3xl whitespace-pre-line text-slate-700">
              {description}
            </p>
          ) : null}
        </div>
        <h2 className="m-0 font-semibold text-slate-900 text-xl">
          Upcoming sessions
        </h2>
        {sessions === undefined ? (
          <div
            aria-busy="true"
            className="grid gap-4 md:grid-cols-2"
            role="status"
          >
            <span className="sr-only">Loading sessions…</span>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : null}
        {sessions?.length === 0 ? (
          <EmptyState
            action={
              <Button href="/contact" size="sm" variant="secondary">
                Contact us
              </Button>
            }
            description="Contact us to be notified when the next date is scheduled."
            title="No public sessions are currently available."
          />
        ) : null}
        {sessions?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((s) => (
              <Card className="flex flex-col" key={s.code}>
                <CardContent className="flex grow gap-4 p-5">
                  <DateBlock start={s.start} timeZone={s.timeZone} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="m-0 font-semibold text-lg text-slate-900 leading-snug">
                      <Link
                        className="hover:text-primary"
                        href={`/s/${s.code}`}
                      >
                        {s.title}
                      </Link>
                    </h3>
                    <p className="m-0 text-slate-600 text-sm">
                      {formatWeekday(s.start, s.timeZone)} ·{" "}
                      {formatTime(s.start, s.timeZone)}{" "}
                      {shortZone(s.timeZone, s.start)}
                    </p>
                    <SeatsBadge available={s.available} />
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button href={`/s/${s.code}`} size="sm">
                    View class and register
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
