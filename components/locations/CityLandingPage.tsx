import type { FunctionReturnType } from "convex/server";
import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { ClassPageSection } from "@/components/ClassPageLayout";
import {
  formatMeeting,
  pluralize,
  shortZone,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import type { api } from "@/convex/_generated/api";
import {
  type CityPage,
  COLAB_ADDRESS,
  CONTACT,
  locationName,
  locationPath,
  sessionPlace,
} from "@/lib/locations";
import { parsePlace } from "@/shared/registration/catalog";
import { formatMoney } from "@/shared/registration/domain";

type Session = FunctionReturnType<
  typeof api.registration.upcomingClasses
>["sessions"][number];

const LINK = "font-medium text-primary underline-offset-2 hover:underline";

function DateTile({ start, timeZone }: { start: number; timeZone: string }) {
  const date = new Date(start);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date);
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-white">
      <span className="font-medium text-[11px] uppercase tracking-wide">
        {format({ month: "short" })}
      </span>
      <span className="font-bold text-xl tabular-nums leading-none">
        {format({ day: "numeric" })}
      </span>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const meetings = [...session.meetings].sort((a, b) => a.start - b.start);
  const first = meetings.at(0);
  const place = sessionPlace(meetings);
  const venue = first ? parsePlace(first.location).name : "Online";
  const extra = meetings.length - 1;
  const href = `/s/${session.code}`;
  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <DateTile start={session.firstStart} timeZone={session.timeZone} />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold text-base text-slate-900 leading-snug">
          <Link className="hover:text-primary" href={href}>
            {session.title}
          </Link>
        </h3>
        {first ? (
          <p className="flex items-start gap-1.5 text-slate-600 text-sm">
            <CalendarDays
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-slate-400"
            />
            {formatMeeting(first, session.timeZone)}{" "}
            {shortZone(session.timeZone, session.firstStart)}
            {extra > 0 ? ` · +${pluralize(extra, "more session")}` : ""}
          </p>
        ) : null}
        <p className="flex items-start gap-1.5 text-slate-600 text-sm">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-slate-400"
          />
          {place ? `${venue}, ${place.city}, ${place.state}` : venue}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <span className="font-semibold text-slate-900 text-sm tabular-nums">
            {formatMoney(session.price)}
          </span>
          {session.available === 0 ? (
            <Badge tone="danger">Full · waitlist</Badge>
          ) : null}
          <Link className={`${LINK} text-sm`} href={href}>
            View and register
          </Link>
        </div>
      </div>
    </li>
  );
}

function SessionList({ sessions }: { sessions: Session[] }) {
  return (
    <ul className="divide-y divide-slate-200">
      {sessions.map((session) => (
        <SessionRow key={session.code} session={session} />
      ))}
    </ul>
  );
}

function Schedule({
  location,
  nearby,
  sessions,
}: {
  location: CityPage;
  nearby: Session[];
  sessions: Session[] | null;
}) {
  const name = locationName(location);
  if (sessions === null) {
    return (
      <p>
        Live dates couldn't be loaded right now. See every upcoming date on the{" "}
        <Link className={LINK} href="/classes">
          class schedule
        </Link>
        .
      </p>
    );
  }
  if (sessions.length > 0) {
    return <SessionList sessions={sessions} />;
  }
  return (
    <>
      <p>
        No public classes are posted in {name} right now. New dates go on the{" "}
        <Link className={LINK} href="/classes">
          class schedule
        </Link>{" "}
        first, or{" "}
        <Link className={LINK} href="/group-training">
          book a private class
        </Link>{" "}
        for your group on a date you choose.
      </p>
      {nearby.length > 0 ? (
        <>
          <h3 className="font-semibold text-lg text-slate-900">
            Closest upcoming classes
          </h3>
          <SessionList sessions={nearby} />
        </>
      ) : null}
    </>
  );
}

export default function CityLandingPage({
  location,
  nearby,
  others,
  sessions,
}: {
  location: CityPage;
  nearby: Session[];
  others: CityPage[];
  sessions: Session[] | null;
}) {
  const name = locationName(location);
  return (
    <div className="bg-white">
      <section className="border-slate-200 border-b bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-slate-600 text-sm">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link className="hover:text-primary" href="/">
                  Home
                </Link>
                <span aria-hidden="true" className="ml-2">
                  /
                </span>
              </li>
              <li>
                <Link className="hover:text-primary" href="/classes">
                  Classes
                </Link>
                <span aria-hidden="true" className="ml-2">
                  /
                </span>
              </li>
              <li aria-current="page" className="text-slate-900">
                {name}
              </li>
            </ol>
          </nav>
          <h1 className="mb-0 text-balance font-bold text-4xl text-slate-950 leading-tight md:text-5xl">
            {location.heading}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-700 leading-8">
            {location.lede}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/classes" size="lg">
              See all upcoming classes
            </Button>
            <Button href="/group-training" size="lg" variant="outline">
              Book group training
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <ClassPageSection title={`Upcoming classes in ${name}`}>
          <Schedule location={location} nearby={nearby} sessions={sessions} />
        </ClassPageSection>

        <ClassPageSection title={`Training in ${location.city}`}>
          {location.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </ClassPageSection>

        <ClassPageSection title={`Courses offered in ${name}`}>
          <ul className="space-y-3">
            {location.courses.map((course) => (
              <li key={course.href}>
                <Link className={LINK} href={course.href}>
                  {course.name}
                </Link>
                <span className="text-slate-700"> · {course.summary}</span>
              </li>
            ))}
          </ul>
        </ClassPageSection>

        <ClassPageSection title="Contact">
          {location.schema === "localBusiness" ? (
            <address className="not-italic">
              Taylored Instruction
              <br />
              {COLAB_ADDRESS.name}, {COLAB_ADDRESS.streetAddress}
              <br />
              {COLAB_ADDRESS.addressLocality}, {COLAB_ADDRESS.addressRegion}{" "}
              {COLAB_ADDRESS.postalCode}
            </address>
          ) : (
            <p>
              Taylored Instruction is based in downtown Vancouver, WA and
              teaches in {name} and the surrounding area.
            </p>
          )}
          <p>
            Phone:{" "}
            <a className={LINK} href={CONTACT.phoneHref}>
              {CONTACT.phone}
            </a>
            <br />
            Email:{" "}
            <a className={LINK} href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </a>
            <br />
            Hours: {CONTACT.hours}
          </p>
        </ClassPageSection>

        <ClassPageSection title={`Questions about classes in ${name}`}>
          {location.faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="mb-1 font-semibold text-lg text-slate-900">
                {faq.question}
              </h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </ClassPageSection>

        <ClassPageSection title="Other locations">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {others.map((other) => (
              <li key={other.slug}>
                <Link className={LINK} href={locationPath(other)}>
                  Classes in {locationName(other)}
                </Link>
              </li>
            ))}
          </ul>
        </ClassPageSection>
      </div>
    </div>
  );
}
