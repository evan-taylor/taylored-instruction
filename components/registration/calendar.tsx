"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "./format";

type CalendarSession = {
  code: string;
  title: string;
  firstStart?: number;
  timeZone: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "YYYY-MM-DD" for an instant in the given zone. */
function dayKey(ms: number, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function monthKey(month: Date, day: number) {
  return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function DayCell({
  day,
  sessions,
  today,
}: {
  day: number;
  sessions: CalendarSession[];
  today: boolean;
}) {
  return (
    <div
      className={cn(
        "min-h-24 border-slate-100 border-t border-l p-1.5 sm:min-h-28",
        today && "bg-primary/5"
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs",
          today ? "bg-primary text-white" : "text-slate-600"
        )}
      >
        {day}
      </span>
      <ul className="m-0 mt-1 list-none space-y-1 p-0">
        {sessions.map((s) => (
          <li key={s.code}>
            <Link
              className="block truncate rounded-md bg-primary/10 px-1.5 py-1 font-medium text-primary text-xs leading-tight hover:bg-primary/20"
              href={`/s/${s.code}`}
              title={s.title}
            >
              {s.firstStart ? (
                <span className="mr-1 text-primary/70 tabular-nums">
                  {formatTime(s.firstStart, s.timeZone)}
                </span>
              ) : null}
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SessionCalendar({ sessions }: { sessions: CalendarSession[] }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const month = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)
  );
  const count = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const leading = month.getUTCDay();
  const total = Math.ceil((leading + count) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => i - leading + 1);
  const todayKey = dayKey(now.getTime());
  const byDay = new Map<string, CalendarSession[]>();
  for (const s of sessions) {
    if (!s.firstStart) {
      continue;
    }
    const key = dayKey(s.firstStart, s.timeZone);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  return (
    <section
      aria-label="Monthly class calendar"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <NavButton label="Previous month" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </NavButton>
        <h2 className="m-0 font-semibold text-base text-slate-900">
          {month.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        <NavButton label="Next month" onClick={() => setOffset(offset + 1)}>
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </NavButton>
      </div>
      <div className="grid grid-cols-7 border-slate-200 border-t bg-slate-50 text-center">
        {WEEKDAYS.map((day) => (
          <p
            className="m-0 py-2 font-medium text-slate-500 text-xs uppercase tracking-wide"
            key={day}
          >
            {day}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 border-slate-100 border-r border-b">
        {cells.map((day) => {
          if (day < 1 || day > count) {
            return (
              <div
                className="min-h-24 border-slate-100 border-t border-l bg-slate-50/50 sm:min-h-28"
                key={`pad-${day}`}
              />
            );
          }
          const key = monthKey(month, day);
          return (
            <DayCell
              day={day}
              key={key}
              sessions={byDay.get(key) ?? []}
              today={key === todayKey}
            />
          );
        })}
      </div>
      <p className="m-0 px-4 py-3 text-slate-500 text-xs">
        Dates use each class’s local time zone. Load more classes below to
        include additional results.
      </p>
    </section>
  );
}
