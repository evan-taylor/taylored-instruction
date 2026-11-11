"use client";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  CopyPlus,
  Files,
  Link2,
  Plus,
  Repeat,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useCourses, useSessions } from "@/components/registration/catalog";
import {
  formatRelative,
  formatTime,
  formatWeekday,
  fromLocalInput,
  pluralize,
  shortZone,
  toLocalInput,
} from "@/components/registration/format";
import { LocationsPanel } from "@/components/registration/locations";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, Money, Select, TextInput, Toggle } from "@/components/ui/field";
import { MenuItem, MenuSeparator, RowMenu } from "@/components/ui/menu";
import {
  DescriptionList,
  EmptyState,
  Notice,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Meter } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Settings } from "@/shared/registration/domain";
import { recurrenceFromMeetings } from "@/shared/registration/schedule";
import { ConfigEditor } from "./config-editor";
import {
  InstructorPicker,
  type StaffMember,
  staffLabel,
} from "./instructor-picker";
import { emptySettings, patchById, US_TIME_ZONES } from "./shared";

type Session = Doc<"registrationSessions">;
type Course = Doc<"registrationCourses">;
type Location = Doc<"registrationLocations">;
type Meeting = Session["meetings"][number];
type SessionDraft = {
  id?: Id<"registrationSessions">;
  code?: string;
  courseId?: Id<"registrationCourses">;
  title: string;
  timeZone: string;
  capacity: number;
  visibility: Session["visibility"];
  publication: Session["publication"];
  meetings: Meeting[];
  instructors: Id<"users">[];
  override: boolean;
  settings: Settings;
};
type TimeFilter = "upcoming" | "past" | "canceled" | "all";
type PageTab = "sessions" | "locations";
type EditorTab = "schedule" | "access" | "instructors" | "settings";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const OFFER_MINUTES = 1440;
const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: "schedule", label: "Schedule" },
  { id: "access", label: "Access" },
  { id: "instructors", label: "Instructors" },
  { id: "settings", label: "Settings" },
];
const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];
const VISIBILITY_HELP: Record<Session["visibility"], string> = {
  public: "Public — listed on the course page and open to anyone.",
  private: "Unlisted — reachable only by people who have the share link.",
  admin: "Admin-only — staff enroll attendees; no self-registration.",
};

function blankDraft(): SessionDraft {
  return {
    title: "",
    timeZone: "America/Los_Angeles",
    capacity: 12,
    visibility: "public",
    publication: "draft",
    meetings: [],
    instructors: [],
    override: false,
    settings: emptySettings,
  };
}
function draftFrom(
  session: Session,
  courses: Course[],
  duplicate: boolean
): SessionDraft {
  const course = courses.find((c) => c._id === session.courseId);
  return {
    id: duplicate ? undefined : session._id,
    code: duplicate ? undefined : session.code,
    courseId: session.courseId,
    title: session.title,
    timeZone: session.timeZone,
    capacity: session.capacity,
    visibility: session.visibility,
    publication: duplicate ? "draft" : session.publication,
    meetings: duplicate
      ? session.meetings.map((m) => ({ ...m, id: crypto.randomUUID() }))
      : session.meetings,
    instructors: session.instructors,
    override: Object.keys(session.overrides).length > 0,
    settings: { ...(course?.settings ?? emptySettings), ...session.overrides },
  };
}
function zoneLabel(zone: string) {
  const city = zone.split("/").at(-1)?.replaceAll("_", " ") ?? zone;
  return `${city} (${shortZone(zone)})`;
}
function matchesTime(session: Session, filter: TimeFilter, now: number) {
  switch (filter) {
    case "upcoming":
      return session.state !== "canceled" && session.lastEnd >= now;
    case "past":
      return session.state !== "canceled" && session.lastEnd < now;
    case "canceled":
      return session.state === "canceled";
    default:
      return true;
  }
}
function filterSessions(
  sessions: Session[],
  courses: Course[],
  filters: { search: string; courseId: string; time: TimeFilter },
  now: number
) {
  const needle = filters.search.trim().toLowerCase();
  return sessions.filter((s) => {
    if (filters.courseId && s.courseId !== filters.courseId) {
      return false;
    }
    if (!matchesTime(s, filters.time, now)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const courseTitle =
      courses.find((c) => c._id === s.courseId)?.title.toLowerCase() ?? "";
    return (
      s.title.toLowerCase().includes(needle) ||
      courseTitle.includes(needle) ||
      s.code.toLowerCase().includes(needle)
    );
  });
}

/* ------------------------------------ List ------------------------------------ */

/** One badge for where the session stands, plus who can see it when that isn't everyone. */
function SessionStatus({ session }: { session: Session }) {
  const hidden =
    session.state !== "canceled" && session.publication !== "published";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge status={hidden ? session.publication : session.state} />
      {session.visibility === "public" ? null : (
        <StatusBadge status={session.visibility} />
      )}
    </div>
  );
}

function SessionRow({
  session,
  course,
  instructors,
  upcoming,
  onEdit,
  onDuplicate,
  onRepeat,
  onCopyLink,
  onCancel,
}: {
  session: Session;
  course: Course | undefined;
  instructors: string[] | undefined;
  upcoming: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRepeat: () => void;
  onCopyLink: () => void;
  onCancel: () => void;
}) {
  const zone = session.timeZone;
  const router = useRouter();
  const href = `/admin/sessions/${session._id}`;
  // The title link is the keyboard path; clicking anywhere on the row is a mouse shortcut.
  return (
    <TR className="cursor-pointer" onClick={() => router.push(href)}>
      <TD className="whitespace-nowrap">
        <div className="font-medium text-slate-900">
          {formatWeekday(session.firstStart, zone)}
        </div>
        <div className="text-slate-500 text-xs">
          {formatTime(session.firstStart, zone)}{" "}
          {shortZone(zone, session.firstStart)} ·{" "}
          {formatRelative(session.firstStart)}
        </div>
      </TD>
      <TD>
        <Link
          className="font-medium text-slate-900 underline-offset-2 hover:text-primary hover:underline"
          href={href}
          onClick={(e) => e.stopPropagation()}
        >
          {session.title}
        </Link>
        <div className="text-slate-500 text-xs">
          {course?.title ?? "Unknown course"} ·{" "}
          {pluralize(session.meetings.length, "meeting")}
        </div>
      </TD>
      <TD className="max-w-48">
        {instructors?.length ? (
          <span className="line-clamp-2" title={instructors.join(", ")}>
            {instructors.join(", ")}
          </span>
        ) : null}
        {instructors?.length === 0 ? (
          <span className={upcoming ? "text-amber-700" : "text-slate-400"}>
            Unassigned
          </span>
        ) : null}
      </TD>
      <TD>
        <Meter
          label={`${session.reserved} of ${session.capacity} seats reserved`}
          max={session.capacity}
          value={session.reserved}
        />
      </TD>
      <TD>
        <SessionStatus session={session} />
      </TD>
      <TD className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            aria-label={`Edit ${session.title}`}
            onClick={onEdit}
            size="xs"
            type="button"
            variant="secondary"
          >
            Edit
          </Button>
          <RowMenu label={`More actions for ${session.title}`}>
            <MenuItem href={`${href}?tab=roster`} icon={Users}>
              Roster
            </MenuItem>
            <MenuItem href={`${href}?tab=files`} icon={Files}>
              Files
            </MenuItem>
            <MenuItem icon={Link2} onSelect={onCopyLink}>
              Copy share link
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={CopyPlus} onSelect={onDuplicate}>
              Duplicate
            </MenuItem>
            <MenuItem icon={Repeat} onSelect={onRepeat}>
              Repeat on more dates
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              danger
              disabled={session.state === "canceled"}
              icon={Ban}
              onSelect={onCancel}
            >
              Cancel session
            </MenuItem>
          </RowMenu>
        </div>
      </TD>
    </TR>
  );
}

type RowHandlers = {
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onRepeat: (session: Session) => void;
  onCopyLink: (session: Session) => void;
  onCancel: (session: Session) => void;
};

function SessionTable({
  sessions,
  courses,
  directory,
  handlers,
}: {
  sessions: Session[];
  courses: Course[];
  directory: StaffMember[] | undefined;
  handlers: RowHandlers;
}) {
  const now = Date.now();
  return (
    <Table className="min-w-[880px]" wrapperClassName="rounded-none border-0">
      <THead>
        <TR>
          <TH>Starts</TH>
          <TH>Session</TH>
          <TH>Instructor</TH>
          <TH>Seats</TH>
          <TH>Status</TH>
          <TH className="text-right">
            <span className="sr-only">Actions</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {sessions.map((s) => (
          <SessionRow
            course={courses.find((c) => c._id === s.courseId)}
            instructors={
              directory &&
              s.instructors.map((id) => {
                const person = directory.find((entry) => entry.id === id);
                return person ? staffLabel(person) : "Inactive instructor";
              })
            }
            key={s._id}
            onCancel={() => handlers.onCancel(s)}
            onCopyLink={() => handlers.onCopyLink(s)}
            onDuplicate={() => handlers.onDuplicate(s)}
            onEdit={() => handlers.onEdit(s)}
            onRepeat={() => handlers.onRepeat(s)}
            session={s}
            upcoming={s.state !== "canceled" && s.lastEnd >= now}
          />
        ))}
      </TBody>
    </Table>
  );
}

function SessionFilters({
  search,
  onSearch,
  courseId,
  onCourse,
  time,
  onTime,
  courses,
}: {
  search: string;
  onSearch: (value: string) => void;
  courseId: string;
  onCourse: (value: string) => void;
  time: TimeFilter;
  onTime: (value: TimeFilter) => void;
  courses: Course[];
}) {
  return (
    <div className="grid gap-3 border-slate-100 border-b p-4 sm:grid-cols-3">
      <Field label={<span className="sr-only">Search sessions</span>}>
        {(props) => (
          <TextInput
            {...props}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search title, course, or code"
            type="search"
            value={search}
          />
        )}
      </Field>
      <Field label={<span className="sr-only">Course</span>}>
        {(props) => (
          <Select
            {...props}
            onChange={(e) => onCourse(e.target.value)}
            value={courseId}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={<span className="sr-only">Time range</span>}>
        {(props) => (
          <Select
            {...props}
            onChange={(e) => onTime(e.target.value as TimeFilter)}
            value={time}
          >
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="canceled">Canceled</option>
            <option value="all">All</option>
          </Select>
        )}
      </Field>
    </div>
  );
}

/* ------------------------------- Cancel dialog ------------------------------- */

function CancelSessionDialog({
  session,
  onClose,
  onConfirm,
  busy,
  message,
}: {
  session: Session;
  onClose: () => void;
  onConfirm: (reason: string, notify: boolean) => void;
  busy: boolean;
  message: string;
}) {
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [touched, setTouched] = useState(false);
  const missing = touched && !reason.trim();
  return (
    <ConfirmDialog
      busy={busy}
      confirmLabel="Cancel session"
      danger
      description={`${session.title} · ${formatWeekday(session.firstStart, session.timeZone)}. Reserved seats are released and the share link stops accepting registrations.`}
      onClose={onClose}
      onConfirm={() => {
        setTouched(true);
        if (reason.trim()) {
          onConfirm(reason.trim(), notify);
        }
      }}
      open
      title="Cancel this session?"
    >
      <div className="space-y-4">
        <Field
          error={
            missing ? "A reason is required for the audit log." : undefined
          }
          hint="Recorded in the activity log and included in attendee notices."
          label="Reason"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              onBlur={() => setTouched(true)}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Instructor unavailable"
              value={reason}
            />
          )}
        </Field>
        <Toggle
          checked={notify}
          description="Sends cancellation emails and updated calendar invites."
          label="Notify attendees and instructors"
          onChange={setNotify}
        />
        <ResultNotice message={message} />
      </div>
    </ConfirmDialog>
  );
}

/* --------------------------------- Editor tabs --------------------------------- */

function MeetingCard({
  meeting,
  index,
  timeZone,
  locations,
  onChange,
  onRemove,
}: {
  meeting: Meeting;
  index: number;
  timeZone: string;
  locations: Location[];
  onChange: (patch: Partial<Meeting>) => void;
  onRemove: () => void;
}) {
  const zone = shortZone(timeZone, meeting.start);
  const setTime = (key: "start" | "end", value: string) => {
    const ms = fromLocalInput(value, timeZone);
    if (!Number.isNaN(ms)) {
      onChange({ [key]: ms });
    }
  };
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold text-slate-900 text-sm">
          Meeting {index + 1}
        </h4>
        <Button
          aria-label={`Remove meeting ${index + 1}`}
          onClick={onRemove}
          size="xs"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4 text-slate-500" />
        </Button>
      </div>
      <Field
        hint="Fills in the public venue and private instructions below."
        label="Saved location"
      >
        {(props) => (
          <Select
            {...props}
            onChange={(e) => {
              const location = locations.find((l) => l._id === e.target.value);
              if (location) {
                onChange({
                  locationId: location._id,
                  location: `${location.name}: ${location.address}`,
                  instructions: location.instructions,
                });
              } else {
                onChange({ locationId: undefined });
              }
            }}
            value={meeting.locationId ?? ""}
          >
            <option value="">Custom venue</option>
            {locations
              .filter((l) => !l.archived || l._id === meeting.locationId)
              .map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Starts (${zone})`} required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => setTime("start", e.target.value)}
              type="datetime-local"
              value={toLocalInput(meeting.start, timeZone)}
            />
          )}
        </Field>
        <Field label={`Ends (${zone})`} required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => setTime("end", e.target.value)}
              type="datetime-local"
              value={toLocalInput(meeting.end, timeZone)}
            />
          )}
        </Field>
      </div>
      <Field
        hint="Shown publicly and on calendar invites."
        label="Public venue"
        required
      >
        {(props) => (
          <TextInput
            {...props}
            onChange={(e) => onChange({ location: e.target.value })}
            value={meeting.location}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          hint="Sent only to registered attendees."
          label="Private online link"
        >
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) =>
                onChange({ onlineUrl: e.target.value || undefined })
              }
              placeholder="https://"
              type="url"
              value={meeting.onlineUrl ?? ""}
            />
          )}
        </Field>
        <Field
          hint="Parking, room, or check-in details for attendees."
          label="Private instructions"
        >
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onChange({ instructions: e.target.value })}
              value={meeting.instructions}
            />
          )}
        </Field>
      </div>
    </div>
  );
}

function nextMeeting(meetings: Meeting[]): Meeting {
  const last = meetings.at(-1);
  const start = last ? last.start + DAY_MS : Date.now() + DAY_MS;
  const end = last ? last.end + DAY_MS : start + 4 * HOUR_MS;
  return {
    id: crypto.randomUUID(),
    start,
    end,
    location: last?.location ?? "",
    locationId: last?.locationId,
    onlineUrl: last?.onlineUrl,
    instructions: last?.instructions ?? "",
    sequence: 0,
  };
}

function MeetingsList({
  draft,
  onChange,
  locations,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  locations: Location[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Meetings</h3>
          <p className="text-slate-500 text-sm">
            Times are entered in {zoneLabel(draft.timeZone)}.
          </p>
        </div>
        <Button
          onClick={() =>
            onChange({
              ...draft,
              meetings: [...draft.meetings, nextMeeting(draft.meetings)],
            })
          }
          size="xs"
          type="button"
          variant="secondary"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add meeting
        </Button>
      </div>
      {draft.meetings.length === 0 ? (
        <EmptyState
          className="py-8"
          description="Every session needs at least one meeting. Multi-day classes can have several."
          title="No meetings scheduled"
        />
      ) : null}
      {draft.meetings.map((m, index) => (
        <MeetingCard
          index={index}
          key={m.id}
          locations={locations}
          meeting={m}
          onChange={(patch) =>
            onChange({
              ...draft,
              meetings: patchById(draft.meetings, m.id, patch),
            })
          }
          onRemove={() =>
            onChange({
              ...draft,
              meetings: draft.meetings.filter((entry) => entry.id !== m.id),
            })
          }
          timeZone={draft.timeZone}
        />
      ))}
    </div>
  );
}

function ScheduleSection({
  draft,
  onChange,
  courses,
  locations,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  courses: Course[];
  locations: Location[];
}) {
  const zones = US_TIME_ZONES.includes(
    draft.timeZone as (typeof US_TIME_ZONES)[number]
  )
    ? [...US_TIME_ZONES]
    : [...US_TIME_ZONES, draft.timeZone];
  const currentCourse = courses.find((c) => c._id === draft.courseId);
  const chooseCourse = (id: string) => {
    const course = courses.find((c) => c._id === id);
    if (!course) {
      return;
    }
    const keepTitle = draft.title && draft.title !== currentCourse?.title;
    onChange({
      ...draft,
      courseId: course._id,
      settings: course.settings,
      title: keepTitle ? draft.title : course.title,
    });
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {draft.id ? (
          <Field
            hint="A session's course cannot change after it is created."
            label="Course"
          >
            {(props) => (
              <TextInput
                {...props}
                disabled
                readOnly
                value={currentCourse?.title ?? ""}
              />
            )}
          </Field>
        ) : (
          <Field
            hint="Only scheduled templates can have sessions."
            label="Course"
            required
          >
            {(props) => (
              <Select
                {...props}
                onChange={(e) => chooseCourse(e.target.value)}
                value={draft.courseId ?? ""}
              >
                <option value="">Choose a course</option>
                {courses
                  .filter((c) => c.delivery === "scheduled")
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Session title" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              value={draft.title}
            />
          )}
        </Field>
        <Field
          hint="Meeting times and attendee emails use this zone."
          label="Time zone"
        >
          {(props) => (
            <Select
              {...props}
              onChange={(e) => onChange({ ...draft, timeZone: e.target.value })}
              value={draft.timeZone}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zoneLabel(zone)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          hint="Cannot be lowered below the seats already reserved."
          label="Capacity"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              min={1}
              onChange={(e) =>
                onChange({ ...draft, capacity: Number(e.target.value) })
              }
              type="number"
              value={draft.capacity}
            />
          )}
        </Field>
      </div>
      <MeetingsList draft={draft} locations={locations} onChange={onChange} />
    </div>
  );
}

function AccessSection({
  draft,
  onChange,
  origin,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  origin: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field hint={VISIBILITY_HELP[draft.visibility]} label="Visibility">
          {(props) => (
            <Select
              {...props}
              onChange={(e) =>
                onChange({
                  ...draft,
                  visibility: e.target.value as Session["visibility"],
                })
              }
              value={draft.visibility}
            >
              <option value="public">Public — listed</option>
              <option value="private">Unlisted — share link only</option>
              <option value="admin">Admin-only enrollment</option>
            </Select>
          )}
        </Field>
        <Field
          hint="Drafts are hidden everywhere, including the share link."
          label="Publication"
        >
          {(props) => (
            <Select
              {...props}
              onChange={(e) =>
                onChange({
                  ...draft,
                  publication: e.target.value as Session["publication"],
                })
              }
              value={draft.publication}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          )}
        </Field>
      </div>
      <ul className="list-none space-y-1 p-0 text-slate-600 text-sm">
        {Object.entries(VISIBILITY_HELP).map(([key, text]) => (
          <li className="flex items-center gap-2" key={key}>
            <StatusBadge status={key} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {draft.code ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-medium text-slate-800 text-sm">Share link</p>
          <p className="mt-0.5 text-slate-500 text-xs">
            Stable for the life of the session, even after edits.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-slate-800 text-xs ring-1 ring-slate-200">
              {origin}/s/{draft.code}
            </code>
            <CopyButton value={`${origin}/s/${draft.code}`} />
          </div>
        </div>
      ) : (
        <Notice tone="info">
          A share link is generated when the session is first saved.
        </Notice>
      )}
    </div>
  );
}

function InstructorsSection({
  draft,
  onChange,
  directory,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  directory: StaffMember[] | undefined;
}) {
  if (directory === undefined) {
    return <Skeleton className="h-24" />;
  }
  if (directory.length === 0) {
    return (
      <Notice tone="info">
        No approved instructors yet. Invite them from the{" "}
        <Link className="font-medium underline" href="/admin/instructors">
          Instructors page
        </Link>
        ; they appear here once they accept.
      </Notice>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm">
        Assigned instructors can open the roster and record outcomes for this
        session.
      </p>
      <InstructorPicker
        directory={directory}
        onChange={(instructors) => onChange({ ...draft, instructors })}
        value={draft.instructors}
      />
    </div>
  );
}

function InheritedSummary({ settings }: { settings: Settings }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 font-medium text-slate-800 text-sm">
        Inherited from the course template
      </p>
      <DescriptionList
        className="sm:grid-cols-3"
        items={[
          { label: "Tuition", value: <Money cents={settings.tuition} /> },
          {
            label: "Tax code",
            value: settings.taxCode ?? "Stripe account default",
          },
          {
            label: "Materials",
            value: pluralize(settings.materials.length, "material"),
          },
          {
            label: "Questions",
            value: pluralize(settings.questions.length, "question"),
          },
          {
            label: "Outcomes",
            value: pluralize(settings.outcomes.length, "rule"),
          },
          {
            label: "Email steps",
            value: pluralize(settings.emails.length, "step"),
          },
          {
            label: "Registration cutoff",
            value: settings.cutoffMinutes
              ? `${pluralize(settings.cutoffMinutes / 60, "hour")} before`
              : "Open until start",
          },
        ]}
      />
    </div>
  );
}

function SettingsSection({
  draft,
  onChange,
  course,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  course: Course | undefined;
}) {
  const template = course?.settings ?? emptySettings;
  return (
    <div className="space-y-5">
      <Toggle
        checked={draft.override}
        description="Overrides freeze pricing, materials, questions, outcomes, and emails for this session only. Without an override, later template edits flow through automatically."
        label="Override template settings for this session"
        onChange={(override) => onChange({ ...draft, override })}
      />
      {draft.override ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
            <span>Editing session-specific settings.</span>
            <Button
              disabled={!course}
              onClick={() => onChange({ ...draft, settings: template })}
              size="xs"
              type="button"
              variant="secondary"
            >
              Reset to template
            </Button>
          </div>
          <ConfigEditor
            inheritedTaxCode={course?.settings.taxCode}
            onChange={(settings) => onChange({ ...draft, settings })}
            value={draft.settings}
          />
        </div>
      ) : (
        <InheritedSummary settings={template} />
      )}
    </div>
  );
}

function SessionEditorModal({
  draft,
  onChange,
  onClose,
  onSubmit,
  busy,
  message,
  notify,
  onNotify,
  courses,
  locations,
  directory,
  origin,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  onClose: () => void;
  onSubmit: (publication?: Session["publication"]) => void;
  busy: boolean;
  message: string;
  notify: boolean;
  onNotify: (value: boolean) => void;
  courses: Course[];
  locations: Location[];
  directory: StaffMember[] | undefined;
  origin: string;
}) {
  const [tab, setTab] = useState<EditorTab>("schedule");
  const course = courses.find((c) => c._id === draft.courseId);
  const publish = !draft.id || draft.publication === "draft";
  const saveLabel = publish ? "Save and publish" : "Save session";
  const formId = useId();
  return (
    <Modal
      description={
        course
          ? `${course.title} · ${pluralize(draft.meetings.length, "meeting")}`
          : "Choose a course template, then schedule meetings."
      }
      footer={
        <>
          {draft.id ? (
            <Toggle
              checked={notify}
              className="mr-auto"
              description="Emails updated details and calendar invites to registered attendees."
              label="Notify attendees about schedule changes"
              onChange={onNotify}
            />
          ) : null}
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          {publish ? (
            <Button
              disabled={busy}
              onClick={() => onSubmit("draft")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Save draft
            </Button>
          ) : null}
          <Button disabled={busy} form={formId} size="sm" type="submit">
            {busy ? "Working…" : saveLabel}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="xl"
      title={draft.id ? `Edit ${draft.title || "session"}` : "New session"}
    >
      <form
        className="space-y-4"
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(publish ? "published" : draft.publication);
        }}
      >
        <ResultNotice message={message} />
        {course && course.publication !== "published" ? (
          <Notice tone="warning">
            This course template is not published. Publish the course template
            before its sessions can accept public registrations.
          </Notice>
        ) : null}
        <Tabs
          label="Session sections"
          onChange={setTab}
          tabs={EDITOR_TABS.map((entry) =>
            entry.id === "instructors"
              ? { ...entry, count: draft.instructors.length }
              : entry
          )}
          value={tab}
        />
        <TabPanel active={tab === "schedule"} id="schedule">
          <ScheduleSection
            courses={courses}
            draft={draft}
            locations={locations}
            onChange={onChange}
          />
        </TabPanel>
        <TabPanel active={tab === "access"} id="access">
          <AccessSection draft={draft} onChange={onChange} origin={origin} />
        </TabPanel>
        <TabPanel active={tab === "instructors"} id="instructors">
          <InstructorsSection
            directory={directory}
            draft={draft}
            onChange={onChange}
          />
        </TabPanel>
        <TabPanel active={tab === "settings"} id="settings">
          <SettingsSection course={course} draft={draft} onChange={onChange} />
        </TabPanel>
      </form>
    </Modal>
  );
}

function saveArgs(
  draft: SessionDraft,
  courseId: Id<"registrationCourses">,
  publication: Session["publication"],
  notify: boolean
) {
  return {
    id: draft.id,
    courseId,
    title: draft.title,
    timeZone: draft.timeZone,
    capacity: draft.capacity,
    visibility: draft.visibility,
    publication,
    meetings: draft.meetings,
    overrides: draft.override ? draft.settings : {},
    instructors: draft.instructors,
    offerMinutes: OFFER_MINUTES,
    notify,
  };
}

function LoadedSessionEditDialog({
  session,
  courses,
  onClose,
}: {
  session: Session;
  courses: Course[];
  onClose: () => void;
}) {
  const locations = useQuery(api.registrationOperations.locations);
  const directory = useQuery(api.registrationOperations.staffDirectory);
  const save = useMutation(api.registration.saveSession);
  const [draft, setDraft] = useState(() => draftFrom(session, courses, false));
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (publication?: Session["publication"]) => {
    setError("");
    setBusy(true);
    try {
      await save(
        saveArgs(
          draft,
          session.courseId,
          publication ?? draft.publication,
          notify
        )
      );
      onClose();
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SessionEditorModal
      busy={busy}
      courses={courses}
      directory={directory}
      draft={draft}
      locations={locations ?? []}
      message={error}
      notify={notify}
      onChange={setDraft}
      onClose={onClose}
      onNotify={setNotify}
      onSubmit={submit}
      origin={typeof window === "undefined" ? "" : window.location.origin}
    />
  );
}

/** Edits one existing session in place, for pages outside the sessions list. */
export function SessionEditDialog({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const courses = useCourses();
  return courses ? (
    <LoadedSessionEditDialog
      courses={courses}
      onClose={onClose}
      session={session}
    />
  ) : null;
}

/* --------------------------------- Recurrence --------------------------------- */

type Occurrence = { start: number; end: number }[];

function WeekdayChips({
  value,
  onChange,
}: {
  value: number[];
  onChange: (value: number[]) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-1.5 font-medium text-slate-700 text-sm">
        Weekdays
      </legend>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const active = value.includes(day.value);
          return (
            <button
              aria-pressed={active}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 font-medium text-white text-xs"
                  : "rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 text-xs hover:bg-slate-200"
              }
              key={day.value}
              onClick={() =>
                onChange(
                  active
                    ? value.filter((d) => d !== day.value)
                    : [...value, day.value].sort((a, b) => a - b)
                )
              }
              type="button"
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RecurrenceModal({
  sessions,
  courses,
  initialId,
  onClose,
  onCreate,
  busy,
  message,
}: {
  sessions: Session[];
  courses: Course[];
  initialId: string;
  onClose: () => void;
  onCreate: (
    pattern: SessionDraft,
    occurrences: Occurrence[]
  ) => Promise<Occurrence[]>;
  busy: boolean;
  message: string;
}) {
  const [patternId, setPatternId] = useState(initialId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [previewed, setPreview] = useState<Occurrence[]>([]);
  const [previewKey, setPreviewKey] = useState("");
  const [error, setError] = useState("");
  const pattern = sessions.find((entry) => entry._id === patternId);
  const draft = pattern ? draftFrom(pattern, courses, true) : undefined;
  const course = courses.find((c) => c._id === draft?.courseId);
  const patternKey = pattern
    ? `${pattern._id}|${pattern.timeZone}|${JSON.stringify(pattern.meetings)}`
    : "";
  // A preview only counts for the schedule it was computed from.
  const preview = previewKey === patternKey ? previewed : [];
  const candidates = sessions
    .filter((entry) => entry.state !== "canceled" || entry._id === patternId)
    .sort((a, b) => b.firstStart - a.firstStart);
  const runPreview = () => {
    setError("");
    if (!draft) {
      return;
    }
    try {
      setPreviewKey(patternKey);
      setPreview(
        recurrenceFromMeetings({
          startDate,
          endDate,
          weekdays,
          timeZone: draft.timeZone,
          meetings: draft.meetings,
        })
      );
    } catch (caught) {
      setPreview([]);
      setError(String(caught));
    }
  };
  return (
    <Modal
      description="Copies one session onto more dates. Each copy is an independent draft with the same times, venue, capacity, instructors, and settings."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Close
          </Button>
          <Button
            disabled={busy || preview.length === 0 || !draft}
            onClick={async () => {
              if (draft) {
                setPreview(await onCreate(draft, preview));
              }
            }}
            size="sm"
            type="button"
          >
            {busy
              ? "Working…"
              : `Create ${pluralize(preview.length, "draft session")}`}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title="Repeat a session"
    >
      <div className="space-y-5">
        <Field
          hint="Start from any existing session. To repeat a new class, create it once first."
          label="Session to repeat"
          required
        >
          {(props) => (
            <Select
              {...props}
              onChange={(e) => {
                setPatternId(e.target.value);
                setPreview([]);
              }}
              value={patternId}
            >
              <option value="">Choose a session</option>
              {candidates.map((entry) => (
                <option key={entry._id} value={entry._id}>
                  {entry.title} ·{" "}
                  {formatWeekday(entry.firstStart, entry.timeZone)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {draft ? (
          <DescriptionList
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"
            items={[
              { label: "Course", value: course?.title ?? "—" },
              { label: "Time zone", value: zoneLabel(draft.timeZone) },
              { label: "Capacity", value: draft.capacity },
              {
                label: "Visibility",
                value: <StatusBadge status={draft.visibility} />,
              },
              {
                label: "Meetings per session",
                value: draft.meetings.length,
              },
              {
                label: "Instructors",
                value: draft.instructors.length || "Unassigned",
              },
            ]}
          />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First date" required>
            {(props) => (
              <TextInput
                {...props}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreview([]);
                }}
                type="date"
                value={startDate}
              />
            )}
          </Field>
          <Field hint="At most one year at a time." label="Last date" required>
            {(props) => (
              <TextInput
                {...props}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreview([]);
                }}
                type="date"
                value={endDate}
              />
            )}
          </Field>
        </div>
        <WeekdayChips
          onChange={(days) => {
            setWeekdays(days);
            setPreview([]);
          }}
          value={weekdays}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!(draft && startDate && endDate && weekdays.length)}
            onClick={runPreview}
            size="sm"
            type="button"
            variant="secondary"
          >
            Preview dates
          </Button>
          {preview.length ? (
            <span className="text-slate-500 text-sm">
              {pluralize(preview.length, "session")} would be created.
            </span>
          ) : null}
        </div>
        <ResultNotice message={error || message} />
        {draft && preview.length ? (
          <ul className="max-h-56 list-none space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm">
            {preview.map((occurrence) => {
              const [first] = occurrence;
              return first ? (
                <li className="flex justify-between gap-3" key={first.start}>
                  <span className="text-slate-800">
                    {formatWeekday(first.start, draft.timeZone)}
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    {formatTime(first.start, draft.timeZone)} –{" "}
                    {formatTime(first.end, draft.timeZone)}{" "}
                    {shortZone(draft.timeZone)}
                  </span>
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}

/* ------------------------------------ Page ------------------------------------ */

function useDeepLinks(
  sessions: Session[] | undefined,
  courses: Course[] | undefined,
  openEditor: (draft: SessionDraft) => void
) {
  const params = useSearchParams();
  const handled = useRef("");
  useEffect(() => {
    const key = params.toString();
    if (handled.current === key) {
      return;
    }
    if (params.get("new") === "1") {
      handled.current = key;
      openEditor(blankDraft());
      return;
    }
    const id = params.get("session");
    if (id && sessions && courses) {
      handled.current = key;
      const session = sessions.find((s) => s._id === id);
      if (session) {
        openEditor(draftFrom(session, courses, false));
      }
    }
  }, [params, sessions, courses, openEditor]);
}

function SessionListCard({
  sessions,
  courses,
  directory,
  onCreate,
  handlers,
}: {
  sessions: Session[] | undefined;
  courses: Course[];
  directory: StaffMember[] | undefined;
  onCreate: () => void;
  handlers: RowHandlers;
}) {
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [time, setTime] = useState<TimeFilter>("upcoming");
  const rows = sessions
    ? filterSessions(sessions, courses, { search, courseId, time }, Date.now())
    : undefined;
  return (
    <Card>
      <SessionFilters
        courseId={courseId}
        courses={courses}
        onCourse={setCourseId}
        onSearch={setSearch}
        onTime={setTime}
        search={search}
        time={time}
      />
      <CardContent className="p-0">
        {rows === undefined ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : null}
        {rows && rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              action={
                <Button onClick={onCreate} size="sm" type="button">
                  New session
                </Button>
              }
              description={
                sessions?.length
                  ? "No sessions match these filters."
                  : "Schedule a session from a course template to start taking registrations."
              }
              title="No sessions"
            />
          </div>
        ) : null}
        {rows && rows.length > 0 ? (
          <SessionTable
            courses={courses}
            directory={directory}
            handlers={handlers}
            sessions={rows}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SessionAdmin() {
  const courses = useCourses();
  const sessions = useSessions();
  const locations = useQuery(api.registrationOperations.locations);
  const directory = useQuery(api.registrationOperations.staffDirectory);
  const save = useMutation(api.registration.saveSession);
  const cancel = useMutation(api.registrationOperations.cancelSession);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const [tab, setTab] = useState<PageTab>("sessions");
  const [draft, setDraft] = useState<SessionDraft>(blankDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<Session | null>(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const openEditor = useCallback((next: SessionDraft) => {
    setError("");
    setNotice("");
    setNotify(true);
    setDraft(next);
    setEditorOpen(true);
  }, []);
  useDeepLinks(sessions, courses, openEditor);

  const submit = async (publication?: Session["publication"]) => {
    if (!draft.courseId) {
      setError("Choose a course before saving");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await save(
        saveArgs(
          draft,
          draft.courseId,
          publication ?? draft.publication,
          notify
        )
      );
      setNotice("Saved. The share link is unchanged.");
      setEditorOpen(false);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  };
  const confirmCancel = async (reason: string, notifyAttendees: boolean) => {
    if (!canceling) {
      return;
    }
    setError("");
    setBusy(true);
    try {
      await cancel({
        sessionId: canceling._id,
        reason,
        notify: notifyAttendees,
      });
      setNotice(`Canceled ${canceling.title}.`);
      setCanceling(null);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  };
  const createRecurring = async (
    pattern: SessionDraft,
    occurrences: Occurrence[]
  ) => {
    if (!pattern.courseId) {
      return occurrences;
    }
    const { courseId } = pattern;
    setError("");
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        occurrences.map((occurrence) =>
          save({
            courseId,
            title: pattern.title,
            timeZone: pattern.timeZone,
            capacity: pattern.capacity,
            visibility: pattern.visibility,
            publication: "draft",
            meetings: occurrence.map((m, index) => ({
              ...m,
              id: crypto.randomUUID(),
              location: pattern.meetings[index]?.location ?? "Training center",
              locationId: pattern.meetings[index]?.locationId,
              onlineUrl: pattern.meetings[index]?.onlineUrl,
              instructions: pattern.meetings[index]?.instructions ?? "",
              sequence: 0,
            })),
            overrides: pattern.override ? pattern.settings : {},
            instructors: pattern.instructors,
            offerMinutes: OFFER_MINUTES,
            notify: false,
          })
        )
      );
      const remaining = occurrences.filter(
        (_, index) => results[index]?.status === "rejected"
      );
      const created = occurrences.length - remaining.length;
      const failed = results.find((result) => result.status === "rejected");
      setNotice(
        `Created ${pluralize(created, "draft session")}. Review and publish them from the list.`
      );
      setError(
        failed?.status === "rejected"
          ? `${created} drafts created. ${remaining.length} failed; retry creates only the remaining drafts. ${String(failed.reason)}`
          : ""
      );
      return remaining;
    } catch (caught) {
      setError(String(caught));
      return occurrences;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => {
                setError("");
                setNotice("");
                setRepeating("");
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Repeat a session
            </Button>
            <Button
              onClick={() => openEditor(blankDraft())}
              size="sm"
              type="button"
            >
              New session
            </Button>
          </>
        }
        description="Scheduled classes with live seat counts, share links, and rosters."
        title="Sessions"
      />
      <Tabs
        label="Sessions and locations"
        onChange={setTab}
        tabs={[
          { id: "sessions", label: "Sessions", count: sessions?.length },
          { id: "locations", label: "Locations", count: locations?.length },
        ]}
        value={tab}
      />
      <TabPanel
        active={tab === "sessions"}
        className="space-y-4 pt-0"
        id="sessions"
      >
        {editorOpen || canceling || repeating !== null ? null : (
          <ResultNotice message={notice} />
        )}
        <SessionListCard
          courses={courses ?? []}
          directory={directory}
          handlers={{
            onCancel: (s) => {
              setError("");
              setNotice("");
              setCanceling(s);
            },
            onCopyLink: async (s) => {
              try {
                await navigator.clipboard.writeText(`${origin}/s/${s.code}`);
                setNotice(`Share link for ${s.title} copied.`);
              } catch {
                setNotice(`Share link: ${origin}/s/${s.code}`);
              }
            },
            onDuplicate: (s) => openEditor(draftFrom(s, courses ?? [], true)),
            onEdit: (s) => openEditor(draftFrom(s, courses ?? [], false)),
            onRepeat: (s) => {
              setError("");
              setNotice("");
              setRepeating(s._id);
            },
          }}
          onCreate={() => openEditor(blankDraft())}
          sessions={sessions}
        />
      </TabPanel>
      <TabPanel active={tab === "locations"} className="pt-0" id="locations">
        <LocationsPanel />
      </TabPanel>
      {editorOpen ? (
        <SessionEditorModal
          busy={busy}
          courses={courses ?? []}
          directory={directory}
          draft={draft}
          locations={locations ?? []}
          message={error}
          notify={notify}
          onChange={setDraft}
          onClose={() => setEditorOpen(false)}
          onNotify={setNotify}
          onSubmit={submit}
          origin={origin}
        />
      ) : null}
      {canceling ? (
        <CancelSessionDialog
          busy={busy}
          message={error}
          onClose={() => setCanceling(null)}
          onConfirm={confirmCancel}
          session={canceling}
        />
      ) : null}
      {repeating === null ? null : (
        <RecurrenceModal
          busy={busy}
          courses={courses ?? []}
          initialId={repeating}
          message={error || notice}
          onClose={() => setRepeating(null)}
          onCreate={createRecurring}
          sessions={sessions ?? []}
        />
      )}
    </div>
  );
}
