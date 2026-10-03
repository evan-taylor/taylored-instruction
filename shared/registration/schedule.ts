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
