"use client";

import { useQuery } from "convex/react";
import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { CourseMatch } from "@/shared/registration/catalog";
import { parsePlace } from "@/shared/registration/catalog";
import { formatMoney } from "@/shared/registration/domain";
import {
  formatMeeting,
  formatTime,
  formatWeekday,
  pluralize,
  shortZone,
} from "./format";

const PREVIEW = 6;

type Session = NonNullable<
  ReturnType<typeof useQuery<typeof api.registration.upcomingClasses>>
>["sessions"][number];

function DateTile({ start, timeZone }: { start: number; timeZone: string }) {
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
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-white">
      <span className="font-medium text-[11px] uppercase tracking-wide">
        {month}
      </span>
      <span className="font-bold text-xl tabular-nums leading-none">{day}</span>
    </div>
  );
}

function SeatsNote({ available }: { available: number }) {
  if (available === 0) {
    return <Badge tone="danger">Full · waitlist</Badge>;
  }
  if (available <= 3) {
    return <Badge tone="warning">{pluralize(available, "seat")} left</Badge>;
  }
  return null;
}

/** One meeting's date and time, with the rest of the schedule summarised. */
function when(session: Session) {
  const [first] = [...session.meetings].sort((a, b) => a.start - b.start);
  const zone = shortZone(session.timeZone, session.firstStart);
  if (!first) {
    return `${formatWeekday(session.firstStart, session.timeZone)} · ${formatTime(session.firstStart, session.timeZone)} ${zone}`;
  }
  const rest = session.meetings.length - 1;
  return `${formatMeeting(first, session.timeZone)} ${zone}${rest > 0 ? ` · +${pluralize(rest, "more session")}` : ""}`;
}

/** Keeps the per-course click signal the old booking button reported. */
function useRegistrationClick(courseName: string) {
  const posthog = usePostHog();
  return (registrationUrl: string, buttonText: string) =>
    posthog.capture("course_registration_clicked", {
      courseName,
      registrationUrl,
      buttonText,
      variant: "primary",
    });
}

function SessionRow({
  session,
  courseName,
}: {
  session: Session;
  courseName: string;
}) {
  const href = `/s/${session.code}`;
  const track = useRegistrationClick(courseName);
  const places = [
    ...new Set(session.meetings.map((m) => parsePlace(m.location).name)),
  ];
  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <DateTile start={session.firstStart} timeZone={session.timeZone} />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold text-base text-slate-900 leading-snug">
          <Link className="hover:text-primary" href={href}>
            {session.title}
          </Link>
        </h3>
        <p className="flex items-start gap-1.5 text-slate-600 text-sm">
          <CalendarDays
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
          />
          {when(session)}
        </p>
        <p className="flex items-start gap-1.5 text-slate-600 text-sm">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
          />
          {places.length ? places.join(" · ") : "Online"}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <span className="font-semibold text-slate-900 text-sm tabular-nums">
            {formatMoney(session.price)}
          </span>
          <SeatsNote available={session.available} />
          <Link
            className="font-medium text-primary text-sm underline-offset-2 hover:underline sm:hidden"
            href={href}
            onClick={() => track(href, "View and register")}
          >
            View and register
          </Link>
        </div>
      </div>
      <Button
        className="hidden sm:inline-flex"
        href={href}
        onClick={() => track(href, "Register")}
        size="sm"
      >
        Register
      </Button>
    </li>
  );
}

function Unavailable({ browseHref }: { browseHref: string }) {
  return (
    <p className="text-slate-600 text-sm">
      Live dates couldn’t be loaded right now.{" "}
      <Link
        className="font-medium text-primary underline-offset-2 hover:underline"
        href={browseHref}
      >
        Browse all classes
      </Link>
    </p>
  );
}

/**
 * A marketing page must never fail because the schedule did; a backend hiccup
 * degrades to a link to the class list instead of the route's error page.
 */
// biome-ignore lint/style/useReactFunctionComponents: React only exposes error boundaries as classes
class ScheduleBoundary extends Component<
  { browseHref: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Unavailable browseHref={this.props.browseHref} />
    ) : (
      this.props.children
    );
  }
}

/**
 * Live upcoming classes for the course a marketing page describes. Reads
 * straight from the registration backend, so dates, prices, and seat counts
 * are never stale.
 */
export function UpcomingClasses({
  match,
  courseName,
  browseHref = "/classes",
}: {
  match: CourseMatch;
  courseName: string;
  browseHref?: string;
}) {
  return (
    <ScheduleBoundary browseHref={browseHref}>
      <Schedule browseHref={browseHref} courseName={courseName} match={match} />
    </ScheduleBoundary>
  );
}

function Schedule({
  match,
  courseName,
  browseHref,
}: {
  match: CourseMatch;
  courseName: string;
  browseHref: string;
}) {
  const track = useRegistrationClick(courseName);
  const data = useQuery(api.registration.upcomingClasses, {
    slugs: [...match.slugs],
    keywords: [...match.keywords],
    exclude: match.exclude ? [...match.exclude] : undefined,
  });
  if (data === undefined) {
    return (
      <div aria-busy="true" className="space-y-3" role="status">
        <span className="sr-only">Loading upcoming classes…</span>
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  const selfPaced = data.courses.filter((c) => c.delivery === "self-paced");
  if (!(data.sessions.length || selfPaced.length)) {
    return (
      <div className="rounded-lg border border-slate-200 border-dashed bg-slate-50/60 px-5 py-6 text-center">
        <p className="font-semibold text-slate-800">
          No dates are scheduled right now.
        </p>
        <p className="mt-1 text-slate-600 text-sm">
          New classes are added regularly. Browse everything that’s open, or ask
          us to host this course for your group.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button href={browseHref} size="sm">
            Browse all classes
          </Button>
          <Button href="/contact" size="sm" variant="secondary">
            Contact us
          </Button>
        </div>
      </div>
    );
  }
  const visible = data.sessions.slice(0, PREVIEW);
  const hidden = data.sessions.length - visible.length;
  return (
    <div className="space-y-4">
      {visible.length ? (
        <ul className="list-none divide-y divide-slate-100 p-0">
          {visible.map((session) => (
            <SessionRow
              courseName={courseName}
              key={session.code}
              session={session}
            />
          ))}
        </ul>
      ) : null}
      {selfPaced.map((course) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3"
          key={course.slug}
        >
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              {course.title}
            </p>
            <p className="text-slate-600 text-sm">
              Self-paced · start anytime ·{" "}
              <span className="tabular-nums">{formatMoney(course.price)}</span>
            </p>
          </div>
          <Button
            href={`/courses/${course.slug}`}
            onClick={() => track(`/courses/${course.slug}`, "Register")}
            size="sm"
          >
            Register
          </Button>
        </div>
      ))}
      {hidden > 0 ? (
        <p className="text-slate-600 text-sm">
          <Link
            className="font-medium text-primary underline-offset-2 hover:underline"
            href={browseHref}
          >
            See {pluralize(hidden, "more date")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
