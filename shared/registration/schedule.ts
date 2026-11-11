import { Temporal } from "@js-temporal/polyfill";

export function recurrence(input: {
  startDate: string;
  endDate: string;
  weekdays: number[];
  timeZone: string;
  meetings: {
    dayOffset: number;
    endDayOffset?: number;
    startTime: string;
    endTime: string;
  }[];
}) {
  const end = Temporal.PlainDate.from(input.endDate);
  let day = Temporal.PlainDate.from(input.startDate);
  const sessions: { start: number; end: number }[][] = [];
  let scanned = 0;
  while (Temporal.PlainDate.compare(day, end) <= 0) {
    scanned += 1;
    if (scanned > 366) {
      throw new Error("Preview at most one year at a time");
    }
    if (input.weekdays.includes(day.dayOfWeek)) {
      sessions.push(
        input.meetings.map((meeting) => {
          const date = day.add({ days: meeting.dayOffset });
          const start = date
            .toPlainDateTime(meeting.startTime)
            .toZonedDateTime(input.timeZone, {
              disambiguation: "reject",
            }).epochMilliseconds;
          const endTime = day
            .add({ days: meeting.endDayOffset ?? meeting.dayOffset })
            .toPlainDateTime(meeting.endTime)
            .toZonedDateTime(input.timeZone, {
              disambiguation: "reject",
            }).epochMilliseconds;
          if (endTime <= start) {
            throw new Error("Meeting end must follow start");
          }
          return { start, end: endTime };
        })
      );
    }
    day = day.add({ days: 1 });
  }
  return sessions;
}
const ICS_UNSAFE = /[\r\n]/gu;
function text(value: string) {
  return value
    .replace(ICS_UNSAFE, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}
function stamp(ms: number) {
  return `${new Date(ms)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .slice(0, 15)}Z`;
}
export function calendar(
  session: {
    code: string;
    title: string;
    state: string;
    meetings: {
      id: string;
      start: number;
      end: number;
      location: string;
      sequence: number;
    }[];
  },
  now: number
) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taylored Instruction//Registration//EN",
    `METHOD:${session.state === "canceled" ? "CANCEL" : "PUBLISH"}`,
    ...session.meetings.flatMap((m) => [
      "BEGIN:VEVENT",
      `UID:${text(session.code)}-${text(m.id)}@tayloredinstruction.com`,
      `SEQUENCE:${m.sequence}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(m.start)}`,
      `DTEND:${stamp(m.end)}`,
      `SUMMARY:${text(session.title)}`,
      `LOCATION:${text(m.location)}`,
      `STATUS:${session.state === "canceled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function recurrenceFromMeetings(input: {
  startDate: string;
  endDate: string;
  weekdays: number[];
  timeZone: string;
  meetings: { start: number; end: number }[];
}) {
  const [first] = input.meetings;
  if (!first) {
    throw new Error("Add meetings before previewing recurrence");
  }
  const origin = Temporal.Instant.fromEpochMilliseconds(first.start)
    .toZonedDateTimeISO(input.timeZone)
    .toPlainDate();
  return recurrence({
    ...input,
    meetings: input.meetings.map((meeting) => {
      const start = Temporal.Instant.fromEpochMilliseconds(
        meeting.start
      ).toZonedDateTimeISO(input.timeZone);
      const end = Temporal.Instant.fromEpochMilliseconds(
        meeting.end
      ).toZonedDateTimeISO(input.timeZone);
      return {
        dayOffset: origin.until(start.toPlainDate()).days,
        endDayOffset: origin.until(end.toPlainDate()).days,
        startTime: start.toPlainTime().toString(),
        endTime: end.toPlainTime().toString(),
      };
    }),
  });
}

type ScheduledMeeting = {
  start: number;
  end: number;
  location: string;
  instructions?: string;
};

const INTL_SPACES = /[\u2009\u202f]/gu;

function zoneName(ms: number, timeZone: string) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(ms)
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone
  );
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups: T[][] = [];
  let group: T[] = [];
  let previous: string | undefined;
  for (const item of items) {
    const current = key(item);
    if (group.length === 0 || current !== previous) {
      group = [];
      groups.push(group);
    }
    group.push(item);
    previous = current;
  }
  return groups;
}

function placeLines([head, ...rest]: ScheduledMeeting[]) {
  if (!head) {
    return [];
  }
  const notes = new Set(
    [head, ...rest]
      .map((m) => m.instructions?.trim() ?? "")
      .filter((note) => note.length > 0)
  );
  return [head.location, ...notes];
}

/**
 * A compact, human schedule for emails: one line per class day with the
 * time zone and location stated once instead of on every meeting.
 */
export function formatSchedule(meetings: ScheduledMeeting[], timeZone: string) {
  const sorted = [...meetings].sort((a, b) => a.start - b.start);
  const [first] = sorted;
  if (!first) {
    return "";
  }
  const dayKey = new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "short",
  });
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const zones = new Set(sorted.map((m) => zoneName(m.start, timeZone)));
  const zoneEach = zones.size > 1;
  const zoneLabel = zoneEach ? "" : ` ${[...zones].join("")}`;
  const range = (m: ScheduledMeeting) =>
    `${time.formatRange(m.start, m.end)}${zoneEach ? ` ${zoneName(m.start, timeZone)}` : ""}`;
  const days = groupBy(sorted, (m) => dayKey.format(m.start));
  let lines: string[];
  if (days.length === 1) {
    lines = [
      new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "full" }).format(
        first.start
      ),
      ...groupBy(sorted, (m) => m.location).flatMap((place) => [
        `${place.map(range).join(", ")}${zoneLabel}`,
        ...placeLines(place),
      ]),
    ];
  } else {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const dayLine = (day: ScheduledMeeting[]) =>
      `${weekday.format((day[0] ?? first).start)} · ${day.map(range).join(", ")}`;
    const span = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "long",
      day: "numeric",
      year: "numeric",
    }).formatRange(first.start, Math.max(...sorted.map((m) => m.start)));
    lines = [
      `${span} · ${days.length} days${zoneEach ? "" : ` ·${zoneLabel}`}`,
      ...groupBy(sorted, (m) => m.location).flatMap((place) => [
        ...groupBy(place, (m) => dayKey.format(m.start)).map(dayLine),
        ...placeLines(place),
      ]),
    ];
  }
  return lines.join("\n").replace(INTL_SPACES, " ");
}
