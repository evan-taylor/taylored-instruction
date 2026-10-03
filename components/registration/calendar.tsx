"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
export function SessionCalendar({
  sessions,
}: {
  sessions: {
    code: string;
    title: string;
    firstStart?: number;
    timeZone: string;
  }[];
}) {
  const [offset, setOffset] = useState(0);
  const today = new Date();
  const month = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1)
  );
  const count = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const cells = Array.from(
    { length: month.getUTCDay() + count },
    (_, i) => i - month.getUTCDay() + 1
  );
  return (
    <section aria-label="Monthly class calendar" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => setOffset(offset - 1)} type="button">
          Previous month
        </Button>
        <h2>
          {month.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        <Button onClick={() => setOffset(offset + 1)} type="button">
          Next month
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <p key={day}>{day}</p>
        ))}
        {cells.map((day) => (
          <div
            className="min-h-24 overflow-hidden rounded border p-1"
            key={day}
          >
            {day > 0 ? (
              <>
                <span>{day}</span>
                {sessions
                  .filter((s) => {
                    if (!s.firstStart) {
                      return false;
                    }
                    const date = new Intl.DateTimeFormat("en-CA", {
                      timeZone: s.timeZone,
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(s.firstStart));
                    return (
                      date ===
                      `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    );
                  })
                  .map((s) => (
                    <Link
                      className="block break-words text-xs underline"
                      href={`/s/${s.code}`}
                      key={s.code}
                    >
                      {s.title}
                    </Link>
                  ))}
              </>
            ) : null}
          </div>
        ))}
      </div>
      <p>
        Dates use each class’s local time zone. Load more classes below to
        include additional results.
      </p>
    </section>
  );
}
