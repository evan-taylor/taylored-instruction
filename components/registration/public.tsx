"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
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
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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
import {
  registrationAnalyticsContext,
  trackRegistration,
} from "@/lib/registration-analytics";
import { cn } from "@/lib/utils";
import {
  type Attendee,
  CHECKOUT_HOLD_MINUTES,
  formatMoney,
  MAX_SEATS,
  type Settings,
  WAIVER,
} from "@/shared/registration/domain";
import { SessionCalendar } from "./calendar";
import { errorText } from "./errors";
import {
  formatDateTime,
  formatMeeting,
  formatTime,
  formatWeekday,
  pluralize,
  shortZone,
} from "./format";
import { InvitationActions } from "./invitation";
import { PaymentStep } from "./payment-step";

type Offering = NonNullable<FunctionReturnType<typeof api.registration.detail>>;
type Material = Offering["config"]["materials"][number];
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

const fullName = (first?: string, last?: string) =>
  `${first?.trim() ?? ""} ${last?.trim() ?? ""}`.trim();

const newAttendee = (): AttendeeRow => ({
  key: crypto.randomUUID(),
  name: "",
  firstName: "",
  lastName: "",
  phone: "",
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
const KIND_HINT: Record<NonNullable<Material["kind"]>, string> = {
  physical: "Physical item",
  pdf: "Digital download",
  link: "Online access",
  keycode: "Online access",
};
/** The one-line blurb under a material: its catalog summary, else what form it takes. */
function materialBlurb(material: Material) {
  return material.summary ?? (material.kind ? KIND_HINT[material.kind] : "");
}
/** Everything a default attendee gets, then what they can add. */
function groupMaterials(materials: Material[]) {
  return {
    base: materials.filter((m) => m.policy !== "optional"),
    optional: materials.filter((m) => m.policy === "optional"),
  };
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
          <h2 className="font-semibold text-lg text-slate-900 leading-snug">
            <Link className="hover:text-primary" href={href}>
              {session.title}
            </Link>
          </h2>
          <p className="flex items-start gap-1.5 text-slate-600 text-sm">
            <CalendarDays
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            />
            {meetingsSummary(session)}
          </p>
          <p className="flex items-start gap-1.5 text-slate-600 text-sm">
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
          <p className="font-semibold text-slate-900">
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
      "inline-flex min-h-10 items-center gap-1.5 px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset",
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
                enterKeyHint="search"
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
        <h2 className="font-bold text-2xl text-slate-900">
          Self-paced courses
        </h2>
        <p className="mt-1 text-slate-500 text-sm">
          Online coursework you can start today and finish on your schedule.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Card className="flex flex-col" key={c.slug}>
            <CardContent className="flex grow gap-4 p-5">
              <DateBlock />
              <div className="min-w-0 flex-1 space-y-1.5">
                <h3 className="font-semibold text-lg text-slate-900 leading-snug">
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
              <p className="font-semibold text-slate-900">
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
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="font-bold text-slate-900 text-xl">
            Training for your team?
          </h2>
          <p className="max-w-xl text-slate-600 text-sm">
            {TEAM_BENEFITS.join(". ")}.
          </p>
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
  onLoadMore,
}: {
  sessions: DiscoveredSession[];
  loading: boolean;
  onLoadMore?: () => void;
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
          <div className="flex flex-wrap justify-center gap-3">
            {onLoadMore ? (
              <Button onClick={onLoadMore} size="sm" type="button">
                Load more classes
              </Button>
            ) : null}
            <Button href="/contact" size="sm" variant="secondary">
              Contact us
            </Button>
          </div>
        }
        description={
          onLoadMore
            ? "More classes are available. Load more, clear your filters, or contact us about upcoming dates."
            : "Try clearing your filters, or contact us about upcoming dates."
        }
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

/** A window wide enough to hold the chosen calendar day in any US time zone. */
function dayWindow(date: string) {
  if (!date) {
    return {};
  }
  const [y, m, d] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  return {
    dayStart: utcMidnight - 14 * 3_600_000,
    dayEnd: utcMidnight + 38 * 3_600_000,
  };
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ClassDiscovery() {
  const selfPaced = useQuery(api.registration.selfPaced);
  const params = useSearchParams();
  const preset = params.get("q") ?? "";
  const [search, setSearch] = useState(preset);
  // Header links change ?q= while this page stays mounted.
  useEffect(() => {
    setSearch(preset);
  }, [preset]);
  const [date, setDate] = useState("");
  const [calendar, setCalendar] = useState(false);
  const needle = useDebounced(search.trim().toLowerCase(), 300);
  const previousNeedle = useRef(needle);
  useEffect(() => {
    if (previousNeedle.current === needle) {
      return;
    }
    previousNeedle.current = needle;
    trackRegistration("registration_discovery_filtered", {
      has_search: Boolean(needle),
    });
  }, [needle]);
  const { results, status, loadMore } = usePaginatedQuery(
    api.registration.discover,
    { search: needle || undefined, ...dayWindow(date) },
    { initialNumItems: 20 }
  );
  const visible = results.filter(
    (s) =>
      !date || (s.firstStart ? dayKey(s.firstStart, s.timeZone) : "") === date
  );
  return (
    <div className="bg-slate-50">
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="mb-2 font-medium text-white/80 text-xs uppercase tracking-wide">
            Classes
          </p>
          <h1 className="font-bold text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Find your next class
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
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
            onDate={(value) => {
              setDate(value);
              trackRegistration("registration_discovery_filtered", {
                has_date: Boolean(value),
                has_search: Boolean(needle),
              });
            }}
            onSearch={setSearch}
            onView={(value) => {
              setCalendar(value);
              trackRegistration("registration_discovery_view_changed", {
                view: value ? "calendar" : "list",
              });
            }}
            search={search}
          />
        </div>
        {calendar && status !== "LoadingFirstPage" ? (
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
            onLoadMore={
              status === "CanLoadMore" ? () => loadMore(20) : undefined
            }
            sessions={visible}
          />
        )}
        {status === "CanLoadMore" ? (
          <div className="flex justify-center">
            <Button
              onClick={() => {
                trackRegistration("registration_discovery_more_requested");
                loadMore(20);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Load more classes
            </Button>
          </div>
        ) : null}
        {status === "LoadingMore" ? (
          <p className="text-center text-slate-500 text-sm" role="status">
            Loading more classes…
          </p>
        ) : null}
        <SelfPacedSection courses={selfPaced} />
        <TeamTrainingCard />
        <p className="text-center text-slate-600 text-sm">
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
  const [registeringSelf, setRegisteringSelf] = useState(true);
  const [self, setSelf] = useState<AttendeeRow>(newAttendee);
  const [otherAttendees, setAttendees] = useState<AttendeeRow[]>(() => [
    newAttendee(),
  ]);
  const attempt = useRef({ signature: "", key: "" });
  const submitting = useRef(false);
  const started = useRef(false);
  const [purchaser, setPurchaser] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const name = fullName(firstName, lastName);
  const attendees = (
    registeringSelf
      ? [{ ...self, firstName, lastName, phone, email: purchaser }]
      : otherAttendees
  ).map((row) => ({ ...row, name: fullName(row.firstName, row.lastName) }));
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const authoritativeReview = useQuery(
    api.registrationPortal.review,
    review ? { orderId: review.orderId, requestKey: review.requestKey } : "skip"
  );
  const change = useCallback(
    (key: string, patch: Partial<Attendee>) => {
      if (patch.selected) {
        trackRegistration("registration_material_selection_changed", {
          selected_count: patch.selected.length,
        });
      }
      if (patch.waived) {
        trackRegistration("registration_material_waiver_changed", {
          waived_count: patch.waived.length,
        });
      }
      if (registeringSelf) {
        setSelf((current) => ({ ...current, ...patch }));
        return;
      }
      setAttendees((rows) =>
        rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
      );
    },
    [registeringSelf]
  );
  const remove = useCallback((key: string) => {
    trackRegistration("registration_attendee_removed");
    setAttendees((rows) => rows.filter((row) => row.key !== key));
  }, []);
  const add = useCallback(() => {
    trackRegistration("registration_attendee_added");
    setAttendees((rows) =>
      rows.length >= MAX_SEATS ? rows : [...rows, newAttendee()]
    );
  }, []);
  async function submit() {
    if (submitting.current || review) {
      return;
    }
    trackRegistration("registration_submitted", {
      course_id: offering.courseId,
      class_session_id: sessionId,
      attendee_count: attendees.length,
      registering_self: registeringSelf,
      has_coupon: Boolean(coupon),
    });
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const signature = JSON.stringify({
        purchaser,
        name,
        phone,
        attendees,
        coupon,
      });
      if (attempt.current.signature !== signature) {
        attempt.current = { signature, key: crypto.randomUUID() };
      }
      const requestKey = attempt.current.key;
      const invitation =
        new URLSearchParams(window.location.hash.slice(1)).get("invitation") ??
        undefined;
      const result = await reserve({
        analytics: registrationAnalyticsContext(),
        courseId: offering.courseId,
        sessionId,
        purchaser,
        purchaserName: name,
        purchaserPhone: phone || undefined,
        attendees: attendees.map(({ key: _key, ...a }) => ({
          ...a,
          phone: a.phone || undefined,
        })),
        coupon: coupon || undefined,
        requestKey,
        invitation,
      });
      trackRegistration("registration_reservation_succeeded", {
        order_id: result.orderId,
        total_cents: result.total,
        status: result.status,
        attendee_count: attendees.length,
      });
      sessionStorage.setItem(
        "registration-order",
        JSON.stringify({ ...result, requestKey })
      );
      const order = { ...result, requestKey };
      if (order.status === "settled") {
        // Nothing to pay: the browser is navigating away, so busy stays on.
        window.location.assign("/registration/success");
        return;
      }
      trackRegistration("registration_review_opened", {
        order_id: order.orderId,
        total_cents: order.total,
      });
      setReview(order);
    } catch (e) {
      trackRegistration("registration_reservation_failed", {
        course_id: offering.courseId,
        has_coupon: Boolean(coupon),
        attendee_count: attendees.length,
        error_stage: "reserve",
      });
      setError(errorText(e, "Unable to reserve seats. Please try again."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  /** Drops an expired reservation so the next submit reserves fresh seats. */
  function reset() {
    trackRegistration("registration_restarted", {
      course_id: offering.courseId,
    });
    attempt.current = { signature: "", key: "" };
    setReview(null);
    setError("");
  }
  const estimate = attendees.reduce(
    (sum, a) => sum + attendeeSubtotal(offering.config, a),
    0
  );
  return {
    attendees,
    registeringSelf,
    setRegisteringSelf: (value: boolean) => {
      trackRegistration("registration_mode_changed", {
        registering_self: value,
      });
      setRegisteringSelf(value);
    },
    add,
    remove,
    change,
    purchaser,
    setPurchaser,
    name,
    firstName,
    setFirstName: (value: string) => {
      if (!started.current) {
        started.current = true;
        trackRegistration("registration_form_started", {
          course_id: offering.courseId,
          class_session_id: sessionId,
        });
      }
      setFirstName(value);
    },
    lastName,
    setLastName,
    phone,
    setPhone,
    coupon,
    setCoupon,
    error,
    setError,
    busy,
    review,
    authoritativeReview,
    submit,
    reset,
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

/** Title, blurb, and price for one line of the per-attendee breakdown. */
function LineItem({
  title,
  blurb,
  trailing,
  leading,
  titleId,
  blurbId,
  muted,
}: {
  title: string;
  blurb?: string;
  trailing: ReactNode;
  leading?: ReactNode;
  titleId?: string;
  blurbId?: string;
  muted?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      {leading}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm",
            muted ? "text-slate-500" : "font-medium text-slate-900"
          )}
          id={titleId}
        >
          {title}
        </span>
        {blurb ? (
          <span
            className="mt-0.5 block text-slate-500 text-xs leading-relaxed"
            id={blurbId}
          >
            {blurb}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "shrink-0 whitespace-nowrap text-sm tabular-nums",
          muted ? "text-slate-400" : "text-slate-700"
        )}
      >
        {trailing}
      </span>
    </span>
  );
}

function IncludedItem({ material }: { material: Material }) {
  return (
    <li className="flex px-3 py-3 sm:px-4">
      <LineItem
        blurb={materialBlurb(material)}
        leading={
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          />
        }
        title={material.title}
        trailing={material.cents ? formatMoney(material.cents) : "Included"}
      />
    </li>
  );
}

/** A required material the attendee can drop if they already own it. */
function WaivableItem({
  material,
  attendee,
  onChange,
}: {
  material: Material;
  attendee: AttendeeRow;
  onChange: (patch: Partial<Attendee>) => void;
}) {
  const id = useId();
  const waived = attendee.waived.includes(material.id);
  return (
    <li className="space-y-2.5 px-3 py-3 sm:px-4">
      <LineItem
        blurb={materialBlurb(material)}
        leading={
          <CheckCircle2
            aria-hidden="true"
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              waived ? "text-slate-300" : "text-primary"
            )}
          />
        }
        muted={waived}
        title={material.title}
        titleId={`${id}-title`}
        trailing={
          waived ? (
            <s>{formatMoney(material.cents)}</s>
          ) : (
            formatMoney(material.cents)
          )
        }
      />
      <label
        className="flex cursor-pointer items-center gap-2.5 pl-7 text-slate-700 text-sm"
        htmlFor={id}
      >
        <input
          aria-describedby={`${id}-title`}
          checked={waived}
          className="h-4 w-4 shrink-0 rounded-sm border-slate-300 text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          id={id}
          onChange={(e) =>
            onChange({
              waived: e.target.checked
                ? [...attendee.waived, material.id]
                : attendee.waived.filter((v) => v !== material.id),
            })
          }
          type="checkbox"
        />
        <span className="flex-1">{WAIVER}</span>
        <span className="whitespace-nowrap text-slate-500 tabular-nums">
          − {formatMoney(material.cents)}
        </span>
      </label>
    </li>
  );
}

/** A whole-row toggle: tap anywhere on the card to add the material. */
function OptionalItem({
  material,
  attendee,
  onChange,
}: {
  material: Material;
  attendee: AttendeeRow;
  onChange: (patch: Partial<Attendee>) => void;
}) {
  const id = useId();
  const blurb = materialBlurb(material);
  const checked = attendee.selected.includes(material.id);
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors duration-150",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30 has-[:focus-visible]:ring-offset-1",
          checked
            ? "border-primary/60 bg-primary/5"
            : "border-slate-200 hover:border-slate-300"
        )}
        htmlFor={id}
      >
        <input
          aria-describedby={blurb ? `${id}-blurb` : undefined}
          aria-labelledby={`${id}-title`}
          checked={checked}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-slate-300 text-primary accent-primary focus-visible:outline-hidden"
          id={id}
          onChange={(e) =>
            onChange({
              selected: e.target.checked
                ? [...attendee.selected, material.id]
                : attendee.selected.filter((v) => v !== material.id),
            })
          }
          type="checkbox"
        />
        <LineItem
          blurb={blurb}
          blurbId={`${id}-blurb`}
          title={material.title}
          titleId={`${id}-title`}
          trailing={
            <span
              className={cn(
                "font-medium",
                checked ? "text-slate-900" : "text-slate-700"
              )}
            >
              + {formatMoney(material.cents)}
            </span>
          }
        />
      </label>
    </li>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
      {children}
    </p>
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
        {hint ? <p className="pl-7 text-xs">{hint}</p> : null}
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

function AttendeeOptions({
  attendee,
  config,
  onChange,
}: {
  attendee: AttendeeRow;
  config: Offering["config"];
  onChange: (patch: Partial<Attendee>) => void;
}) {
  const { base, optional } = groupMaterials(config.materials);
  return (
    <>
      <div className="space-y-4 rounded-lg bg-slate-50 p-3 sm:p-4">
        <div className="space-y-2">
          <GroupLabel>Your registration</GroupLabel>
          <ul className="list-none divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white p-0">
            <li className="flex px-3 py-3 sm:px-4">
              <LineItem
                title="Tuition"
                trailing={formatMoney(config.tuition)}
              />
            </li>
            {base.map((m) =>
              m.policy === "included" ? (
                <IncludedItem key={m.id} material={m} />
              ) : (
                <WaivableItem
                  attendee={attendee}
                  key={m.id}
                  material={m}
                  onChange={onChange}
                />
              )
            )}
          </ul>
        </div>
        {optional.length ? (
          <div className="space-y-2">
            <GroupLabel>Optional add-ons</GroupLabel>
            <ul className="list-none space-y-2 p-0">
              {optional.map((m) => (
                <OptionalItem
                  attendee={attendee}
                  key={m.id}
                  material={m}
                  onChange={onChange}
                />
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-slate-200 border-t pt-3 text-sm">
          <span className="font-semibold text-slate-900">Subtotal</span>
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
    </>
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
  config: Offering["config"];
  disabled: boolean;
  onChange: (patch: Partial<Attendee>) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <fieldset className="min-w-0 border-0 p-0" disabled={disabled}>
        <legend className="sr-only">Attendee {index + 1}</legend>
        <CardHeader className="sm:items-center">
          <CardTitle>Attendee {index + 1}</CardTitle>
          <Button
            aria-label={`Remove attendee ${index + 1}`}
            disabled={disabled}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Remove
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="off"
                  onChange={(e) => onChange({ firstName: e.target.value })}
                  required
                  value={attendee.firstName ?? ""}
                />
              )}
            </Field>
            <Field label="Last name" required>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="off"
                  onChange={(e) => onChange({ lastName: e.target.value })}
                  required
                  value={attendee.lastName ?? ""}
                />
              )}
            </Field>
            <Field label="Email" required>
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
            <Field hint="Optional" label="Phone">
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="off"
                  inputMode="tel"
                  onChange={(e) => onChange({ phone: e.target.value })}
                  type="tel"
                  value={attendee.phone ?? ""}
                />
              )}
            </Field>
          </div>
          <AttendeeOptions
            attendee={attendee}
            config={config}
            onChange={onChange}
          />
        </CardContent>
      </fieldset>
    </Card>
  );
}

function RegistrationMode({ form }: { form: RegistrationForm }) {
  return (
    <fieldset
      className="space-y-3"
      disabled={form.busy || form.review !== null}
    >
      <legend className="font-semibold text-slate-900">
        Who are you registering?
      </legend>
      <div className="flex flex-wrap gap-3">
        <Button
          aria-pressed={form.registeringSelf}
          onClick={() => form.setRegisteringSelf(true)}
          type="button"
          variant={form.registeringSelf ? "primary" : "secondary"}
        >
          I am registering myself
        </Button>
        <Button
          aria-pressed={!form.registeringSelf}
          onClick={() => form.setRegisteringSelf(false)}
          type="button"
          variant={form.registeringSelf ? "secondary" : "primary"}
        >
          I am registering others
        </Button>
      </div>
    </fieldset>
  );
}

function PurchaserCard({
  form,
  config,
}: {
  form: RegistrationForm;
  config: Offering["config"];
}) {
  const disabled = form.busy || form.review !== null;
  return (
    <Card>
      <fieldset className="min-w-0 border-0 p-0" disabled={disabled}>
        <legend className="sr-only">
          {form.registeringSelf ? "Your details" : "Purchaser details"}
        </legend>
        <CardHeader>
          <div>
            <CardTitle>
              {form.registeringSelf ? "Your details" : "Purchaser details"}
            </CardTitle>
            <CardDescription>
              {form.registeringSelf
                ? "Your registration, receipt, and course access will use these details."
                : "We’ll send the receipt to you and course access to each attendee."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Your first name" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="given-name"
                onChange={(e) => form.setFirstName(e.target.value)}
                required
                value={form.firstName}
              />
            )}
          </Field>
          <Field label="Your last name" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="family-name"
                onChange={(e) => form.setLastName(e.target.value)}
                required
                value={form.lastName}
              />
            )}
          </Field>
          <Field label="Your email" required>
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
          <Field hint="Optional, for class-day questions." label="Phone">
            {(props) => (
              <TextInput
                {...props}
                autoComplete="tel"
                inputMode="tel"
                onChange={(e) => form.setPhone(e.target.value)}
                type="tel"
                value={form.phone}
              />
            )}
          </Field>
          {form.registeringSelf
            ? form.attendees.map((attendee) => (
                <div className="space-y-5 sm:col-span-2" key={attendee.key}>
                  <AttendeeOptions
                    attendee={attendee}
                    config={config}
                    onChange={(patch) => form.change(attendee.key, patch)}
                  />
                </div>
              ))
            : null}
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
  config: Offering["config"];
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
          hint="Discounts are applied per attendee at checkout."
          label="Coupon code"
        >
          {(props) => (
            <TextInput
              {...props}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              disabled={form.busy}
              onChange={(e) => form.setCoupon(e.target.value)}
              placeholder="Optional"
              spellCheck={false}
              value={form.coupon}
            />
          )}
        </Field>
      </CardContent>
    </Card>
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
          <p className="font-medium text-slate-900">{seat.name}</p>
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
      <p className="text-slate-500 text-xs">
        Sales tax is added once you enter a billing address.
      </p>
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
  const [joined, setJoined] = useState(false);
  const ready = Boolean(form.purchaser && form.name);
  if (joined) {
    return (
      <Notice tone="success">
        You’re on the waitlist. We’ll email {form.purchaser} if a seat opens. No
        payment is required.
      </Notice>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="font-medium text-amber-900 text-sm">This class is full</p>
      <p className="text-amber-900/80 text-xs">
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
            trackRegistration("registration_waitlist_submitted", {
              class_session_id: sessionId,
            });
            await join({ sessionId, name: form.name, email: form.purchaser });
            trackRegistration("registration_waitlist_joined", {
              class_session_id: sessionId,
            });
            setJoined(true);
          } catch (e) {
            trackRegistration("registration_waitlist_failed", {
              class_session_id: sessionId,
            });
            form.setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        {busy ? "Joining…" : "Join the waitlist"}
      </Button>
      {ready ? null : (
        <p className="text-amber-900/80 text-xs">
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
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            {form.review ? "Order review" : "Order summary"}
          </CardTitle>
          <CardDescription>
            {form.review
              ? "Final total, confirmed before payment."
              : "Prices shown per attendee, before any coupon."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {form.review ? (
          <ReviewSummary form={form} />
        ) : (
          <>
            {form.attendees.length ? (
              <ul className="list-none space-y-2 p-0 text-sm">
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
              <p className="text-slate-500 text-sm">
                {`${formatMoney(basePrice(offering.config))} per attendee. Add at least one attendee to continue.`}
              </p>
            )}
            <div className="border-slate-200 border-t pt-4">
              <p className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-slate-900">
                  Estimated total
                </span>
                <span className="font-bold text-slate-900 text-xl tabular-nums">
                  {formatMoney(form.estimate)}
                </span>
              </p>
              <p className="mt-1 text-slate-500 text-sm">
                Before any coupon. {TAX_NOTE}
              </p>
            </div>
            <ResultNotice message={form.error} tone="danger" />
            {open ? (
              <Button
                className="mt-2 w-full"
                disabled={form.busy || !form.attendees.length}
                type="submit"
              >
                {form.busy ? "Reserving seats…" : "Continue to payment"}
              </Button>
            ) : null}
            {open && offering.available === 0 && sessionId ? (
              <WaitlistAction form={form} sessionId={sessionId} />
            ) : null}
          </>
        )}
        <p className="flex items-start gap-2 text-slate-500 text-sm leading-relaxed">
          <ShieldCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
          Seats are held for {CHECKOUT_HOLD_MINUTES} minutes while you pay.
          Payments are processed securely by Stripe.
        </p>
      </CardContent>
    </Card>
  );
}

/** Keeps the total and the submit reachable while scrolling a long form on a phone. */
function MobileCheckoutBar({ form }: { form: RegistrationForm }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-slate-200 border-t bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          <span className="block text-slate-500 text-xs">Estimated total</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatMoney(form.estimate)}
          </span>
        </p>
        <Button
          disabled={form.busy || !form.attendees.length}
          size="sm"
          type="submit"
        >
          {form.busy ? "Reserving seats…" : "Continue to payment"}
        </Button>
      </div>
    </div>
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
          <h1 className="font-bold text-3xl text-slate-900 leading-tight lg:text-4xl">
            {offering.title}
          </h1>
          {offering.description ? (
            <p className="whitespace-pre-line text-slate-700">
              {offering.description}
            </p>
          ) : null}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold text-slate-900 text-sm uppercase tracking-wide">
              Schedule
            </h2>
            {offering.meetings.length ? (
              <ul className="list-none space-y-2 p-0">
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
              <p className="flex items-start gap-2 text-slate-700 text-sm">
                <Clock
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                Start anytime. Access instructions arrive by email after
                payment.
              </p>
            )}
            {cutoff ? (
              <p className="mt-2 text-slate-500 text-xs">
                Registration closes {formatDateTime(cutoff, zone)}{" "}
                {abbreviation}.
              </p>
            ) : null}
          </div>
          <IncludedSummary config={offering.config} />
        </div>
        {offering.delivery === "self-paced" ? (
          <Notice tone="info">
            Buying again creates a new registration, even if this attendee has
            previously purchased the course.
          </Notice>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** The class-page price breakdown: what every seat gets, then what can be added. */
function IncludedSummary({ config }: { config: Offering["config"] }) {
  const { base, optional } = groupMaterials(config.materials);
  const waivable = base.some((m) => m.policy === "waivable");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 font-semibold text-slate-900 text-sm uppercase tracking-wide">
          What’s included
        </h2>
        <ul className="list-none divide-y divide-slate-100 p-0">
          <li className="flex py-2">
            <LineItem title="Tuition" trailing={formatMoney(config.tuition)} />
          </li>
          {base.map((m) => (
            <li className="flex py-2" key={m.id}>
              <LineItem
                blurb={materialBlurb(m)}
                leading={
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                }
                title={m.title}
                trailing={m.cents ? formatMoney(m.cents) : "Included"}
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 font-semibold text-slate-900 text-sm">
          <span className="flex items-baseline justify-between gap-3">
            <span>Per attendee</span>
            <span className="tabular-nums">
              {formatMoney(basePrice(config))}
            </span>
          </span>
        </p>
        {waivable ? (
          <p className="mt-2 text-slate-500 text-xs">
            Already own one of these? Skip it at checkout and pay less.
          </p>
        ) : null}
      </div>
      {optional.length ? (
        <div>
          <h2 className="mb-2 font-semibold text-slate-900 text-sm uppercase tracking-wide">
            Optional add-ons
          </h2>
          <ul className="list-none divide-y divide-slate-100 p-0">
            {optional.map((m) => (
              <li className="flex py-2" key={m.id}>
                <LineItem
                  blurb={materialBlurb(m)}
                  title={m.title}
                  trailing={`+ ${formatMoney(m.cents)}`}
                />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-slate-500 text-xs">
            Add any of these for each attendee at checkout.
          </p>
        </div>
      ) : null}
    </div>
  );
}

const CLOSED_COPY: Record<string, string> = {
  finished: "This class has already taken place.",
  canceled: "This class has been canceled.",
  draft: "This class isn’t open for registration yet.",
  archived: "This class is no longer offered.",
};

function ClosedState({ state }: { state: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="font-semibold text-slate-900" role="status">
          {CLOSED_COPY[state] ?? "Registration for this class is closed."}
        </p>
        <p className="text-slate-600 text-sm">
          We can help you find another date or arrange training for your group.
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
  const viewed = useRef("");
  useEffect(() => {
    const key = `${offering.courseId}:${sessionId ?? ""}`;
    if (viewed.current === key) {
      return;
    }
    viewed.current = key;
    trackRegistration("registration_offering_viewed", {
      course_id: offering.courseId,
      class_session_id: sessionId,
      offering_state: offering.state,
      delivery_mode: sessionId ? "scheduled" : "self_paced",
    });
  }, [offering.courseId, offering.state, sessionId]);
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
        {form.review ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <PaymentStep
                    expires={form.review.expires}
                    onStartOver={form.reset}
                    orderId={form.review.orderId}
                    releaseOnLeave
                    requestKey={form.review.requestKey}
                  />
                </CardContent>
              </Card>
              <OfferingDetails offering={offering} />
            </div>
            <aside className="min-w-0 lg:sticky lg:top-24">
              <OrderSummary
                form={form}
                offering={offering}
                sessionId={sessionId}
              />
            </aside>
          </div>
        ) : (
          <form
            className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
            onInvalid={() =>
              trackRegistration("registration_validation_failed", {
                course_id: offering.courseId,
                error_stage: "browser_validation",
              })
            }
            onSubmit={(e) => {
              e.preventDefault();
              form.submit();
            }}
          >
            <div className="min-w-0 space-y-6">
              <OfferingDetails offering={offering} />
              {open ? (
                <>
                  <RegistrationMode form={form} />
                  <PurchaserCard config={offering.config} form={form} />
                  {form.registeringSelf ? null : (
                    <AttendeesSection config={offering.config} form={form} />
                  )}
                  {form.review ? null : <CouponCard form={form} />}
                </>
              ) : (
                <ClosedState state={offering.state} />
              )}
            </div>
            <aside className="min-w-0 lg:sticky lg:top-24">
              <OrderSummary
                form={form}
                offering={offering}
                sessionId={sessionId}
              />
            </aside>
            {open ? <MobileCheckoutBar form={form} /> : null}
          </form>
        )}
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
          description="It may have been removed or isn’t published yet."
          title="This class isn’t available."
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
  useEffect(() => {
    try {
      const value = sessionStorage.getItem("registration-order");
      const parsed = value ? JSON.parse(value) : null;
      if (parsed?.orderId && parsed?.requestKey) {
        setOrder({ orderId: parsed.orderId, requestKey: parsed.requestKey });
        return;
      }
    } catch {
      /* corrupt storage; treated as missing */
    }
    setMissing(true);
  }, []);
  const status = useQuery(api.registrationPortal.status, order ?? "skip");
  const settled = status?.status === "settled";
  const checking = order !== null && status === undefined;
  const reported = useRef("");
  useEffect(() => {
    if (
      !(order && status) ||
      reported.current === `${order.orderId}:${status.status}`
    ) {
      return;
    }
    reported.current = `${order.orderId}:${status.status}`;
    trackRegistration("registration_success_viewed", {
      order_id: order.orderId,
      status: status.status,
    });
  }, [order, status]);
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
              <h1 className="font-bold text-2xl text-slate-900 lg:text-3xl">
                Registration status
              </h1>
              {status ? (
                <Badge tone={settled ? "success" : "warning"}>
                  {settled ? "Paid" : "Payment processing"}
                </Badge>
              ) : null}
              {checking ? (
                <p className="text-slate-500 text-sm" role="status">
                  Checking your order…
                </p>
              ) : null}
              <p className="text-slate-700">
                {settled
                  ? "Your registration is confirmed. Check your email for access instructions."
                  : "Payment may still be processing. Confirmation follows verified payment."}
              </p>
              {status ? (
                <p className="text-slate-500 text-sm">
                  Total charged {formatMoney(status.total + (status.tax ?? 0))}
                  {status.tax
                    ? ` (includes ${formatMoney(status.tax)} sales tax)`
                    : ""}
                  {settled ? "." : ". Check again in a moment."}
                </p>
              ) : null}
            </div>
            {status === null ? (
              <Notice tone="warning">
                We couldn’t find that order. If you were charged, open the
                secure portal or contact us.
              </Notice>
            ) : null}
            {missing ? (
              <Notice tone="warning">
                We couldn’t find a recent order in this browser. Use the secure
                portal to view your registrations.
              </Notice>
            ) : null}
            <div className="rounded-lg bg-slate-50 p-4 text-left">
              <p className="mb-2 font-semibold text-slate-900 text-sm">
                What happens next
              </p>
              <ul className="list-none space-y-1.5 p-0 text-slate-600 text-sm">
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
          <p className="mb-1 font-medium text-primary text-xs uppercase tracking-wide">
            Course
          </p>
          <h1 className="font-bold text-3xl text-slate-900 leading-tight lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl whitespace-pre-line text-slate-700">
              {description}
            </p>
          ) : null}
        </div>
        <h2 className="font-semibold text-slate-900 text-xl">
          Upcoming classes
        </h2>
        {sessions === undefined ? (
          <div
            aria-busy="true"
            className="grid gap-4 md:grid-cols-2"
            role="status"
          >
            <span className="sr-only">Loading classes…</span>
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
            title="No upcoming dates are scheduled."
          />
        ) : null}
        {sessions?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((s) => (
              <Card className="flex flex-col" key={s.code}>
                <CardContent className="flex grow gap-4 p-5">
                  <DateBlock start={s.start} timeZone={s.timeZone} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="font-semibold text-lg text-slate-900 leading-snug">
                      <Link
                        className="hover:text-primary"
                        href={`/s/${s.code}`}
                      >
                        {s.title}
                      </Link>
                    </h3>
                    <p className="text-slate-600 text-sm">
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
