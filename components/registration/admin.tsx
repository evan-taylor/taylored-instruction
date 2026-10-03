"use client";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Settings } from "@/shared/registration/domain";
import { recurrenceFromMeetings } from "@/shared/registration/schedule";
import { EmailPreview } from "./email-preview";
import { InventoryManager } from "./inventory";
import {
  BulkOperations,
  ManualEnrollment,
  OrderOperations,
} from "./operations";

const emptySettings: Settings = {
  tuition: 0,
  materials: [],
  questions: [],
  outcomes: [],
  emails: [],
  cutoffMinutes: 0,
};
const inputStyle =
  "block w-full rounded border border-slate-400 bg-white p-2 text-slate-950";
export function RegistrationAdminNav() {
  return (
    <nav
      aria-label="Registration management"
      className="flex flex-wrap gap-4 border-b p-6"
    >
      {[
        "courses",
        "sessions",
        "materials",
        "coupons",
        "registrations",
        "registration-activity",
      ].map((page) => (
        <Link className="underline" href={`/admin/${page}`} key={page}>
          {page.replaceAll("-", " ")}
        </Link>
      ))}
    </nav>
  );
}
function Message({ text }: { text: string }) {
  return text ? (
    <p className="rounded bg-slate-100 p-3 text-slate-950" role="status">
      {text}
    </p>
  ) : null;
}
function ConfigEditor({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
}) {
  const materials = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 50 }
  );
  return (
    <div className="space-y-5">
      <label className="block">
        Tuition (USD cents)
        <Input
          min={0}
          onChange={(e) =>
            onChange({ ...value, tuition: Number(e.target.value) })
          }
          type="number"
          value={value.tuition}
        />
      </label>
      <label className="block">
        Close registration this many minutes before the first meeting
        <Input
          min={0}
          onChange={(e) =>
            onChange({ ...value, cutoffMinutes: Number(e.target.value) })
          }
          type="number"
          value={value.cutoffMinutes}
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="font-semibold text-xl">Materials</legend>
        {value.materials.map((m) => (
          <div
            className="grid gap-2 rounded border p-3 md:grid-cols-3"
            key={m.id}
          >
            <label>
              Material
              <select
                className={inputStyle}
                onChange={(e) => {
                  const material = materials.results.find(
                    (entry) => entry._id === e.target.value
                  );
                  if (material) {
                    onChange({
                      ...value,
                      materials: value.materials.map((entry) =>
                        entry.id === m.id
                          ? {
                              ...entry,
                              materialId: material._id,
                              title: material.title,
                            }
                          : entry
                      ),
                    });
                  }
                }}
                value={m.materialId}
              >
                {materials.results.map((entry) => (
                  <option key={entry._id} value={entry._id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Policy
              <select
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    materials: value.materials.map((entry) =>
                      entry.id === m.id
                        ? {
                            ...entry,
                            policy: e.target.value as typeof m.policy,
                          }
                        : entry
                    ),
                  })
                }
                value={m.policy}
              >
                <option value="included">Included</option>
                <option value="optional">Optional</option>
                <option value="waivable">Required, waivable</option>
              </select>
            </label>
            <label>
              Price (cents)
              <Input
                min={0}
                onChange={(e) =>
                  onChange({
                    ...value,
                    materials: value.materials.map((entry) =>
                      entry.id === m.id
                        ? { ...entry, cents: Number(e.target.value) }
                        : entry
                    ),
                  })
                }
                type="number"
                value={m.cents}
              />
            </label>
            <Button
              onClick={() =>
                onChange({
                  ...value,
                  materials: value.materials.filter(
                    (entry) => entry.id !== m.id
                  ),
                })
              }
              type="button"
              variant="outline"
            >
              Remove attachment
            </Button>
          </div>
        ))}
        <Button
          disabled={!materials.results.length}
          onClick={() => {
            const [material] = materials.results;
            if (material) {
              onChange({
                ...value,
                materials: [
                  ...value.materials,
                  {
                    id: crypto.randomUUID(),
                    materialId: material._id,
                    title: material.title,
                    policy: "included",
                    cents: 0,
                  },
                ],
              });
            }
          }}
          type="button"
          variant="outline"
        >
          Attach material
        </Button>
        {materials.status === "CanLoadMore" ? (
          <Button onClick={() => materials.loadMore(50)} type="button">
            Load more materials
          </Button>
        ) : null}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="font-semibold text-xl">Attendee questions</legend>
        {value.questions.map((q) => (
          <div className="space-y-2 rounded border p-3" key={q.id}>
            <label>
              Question
              <Input
                onChange={(e) =>
                  onChange({
                    ...value,
                    questions: value.questions.map((entry) =>
                      entry.id === q.id
                        ? { ...entry, title: e.target.value }
                        : entry
                    ),
                  })
                }
                value={q.title}
              />
            </label>
            <label>
              Answer type
              <select
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    questions: value.questions.map((entry) =>
                      entry.id === q.id
                        ? { ...entry, type: e.target.value as typeof q.type }
                        : entry
                    ),
                  })
                }
                value={q.type}
              >
                <option value="text">Text</option>
                <option value="choice">Multiple choice</option>
                <option value="checkbox">Acknowledgment</option>
              </select>
            </label>
            <label>
              Choices (one per line)
              <textarea
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    questions: value.questions.map((entry) =>
                      entry.id === q.id
                        ? { ...entry, options: e.target.value.split("\n") }
                        : entry
                    ),
                  })
                }
                value={q.options.join("\n")}
              />
            </label>
            <label>
              <input
                checked={q.required}
                onChange={(e) =>
                  onChange({
                    ...value,
                    questions: value.questions.map((entry) =>
                      entry.id === q.id
                        ? { ...entry, required: e.target.checked }
                        : entry
                    ),
                  })
                }
                type="checkbox"
              />{" "}
              Required
            </label>
            <Button
              onClick={() =>
                onChange({
                  ...value,
                  questions: value.questions.filter(
                    (entry) => entry.id !== q.id
                  ),
                })
              }
              type="button"
              variant="outline"
            >
              Remove question
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            onChange({
              ...value,
              questions: [
                ...value.questions,
                {
                  id: crypto.randomUUID(),
                  title: "New question",
                  type: "text",
                  required: false,
                  options: [],
                  version: 1,
                },
              ],
            })
          }
          type="button"
          variant="outline"
        >
          Add question
        </Button>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="font-semibold text-xl">
          Staff-only outcome rules
        </legend>
        {value.outcomes.map((o) => (
          <div className="space-y-2 rounded border p-3" key={o.id}>
            <label>
              Outcome name
              <Input
                onChange={(e) =>
                  onChange({
                    ...value,
                    outcomes: value.outcomes.map((entry) =>
                      entry.id === o.id
                        ? { ...entry, title: e.target.value }
                        : entry
                    ),
                  })
                }
                value={o.title}
              />
            </label>
            <label>
              Type
              <select
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    outcomes: value.outcomes.map((entry) =>
                      entry.id === o.id
                        ? {
                            ...entry,
                            type: e.target.value as typeof o.type,
                            version: entry.version + 1,
                          }
                        : entry
                    ),
                  })
                }
                value={o.type}
              >
                <option value="category">Categorical</option>
                <option value="percentage">Exam percentage</option>
              </select>
            </label>
            <label>
              Categories (one per line)
              <textarea
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    outcomes: value.outcomes.map((entry) =>
                      entry.id === o.id
                        ? {
                            ...entry,
                            options: e.target.value.split("\n"),
                            version: entry.version + 1,
                          }
                        : entry
                    ),
                  })
                }
                value={o.options.join("\n")}
              />
            </label>
            <label>
              Passing category or minimum percentage
              <Input
                onChange={(e) =>
                  onChange({
                    ...value,
                    outcomes: value.outcomes.map((entry) =>
                      entry.id === o.id
                        ? {
                            ...entry,
                            ...(o.type === "percentage"
                              ? { minimum: Number(e.target.value) }
                              : { passingValue: e.target.value }),
                            version: entry.version + 1,
                          }
                        : entry
                    ),
                  })
                }
                value={
                  o.type === "percentage"
                    ? (o.minimum ?? 80)
                    : (o.passingValue ?? "")
                }
              />
            </label>
            <label>
              <input
                checked={o.required}
                onChange={(e) =>
                  onChange({
                    ...value,
                    outcomes: value.outcomes.map((entry) =>
                      entry.id === o.id
                        ? {
                            ...entry,
                            required: e.target.checked,
                            version: entry.version + 1,
                          }
                        : entry
                    ),
                  })
                }
                type="checkbox"
              />{" "}
              Required for completion
            </label>
            <Button
              onClick={() =>
                onChange({
                  ...value,
                  outcomes: value.outcomes.filter((entry) => entry.id !== o.id),
                })
              }
              type="button"
              variant="outline"
            >
              Remove outcome
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            onChange({
              ...value,
              outcomes: [
                ...value.outcomes,
                {
                  id: crypto.randomUUID(),
                  title: "Exam",
                  type: "percentage",
                  required: true,
                  options: [],
                  minimum: 80,
                  version: 1,
                },
              ],
            })
          }
          type="button"
          variant="outline"
        >
          Add outcome
        </Button>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="font-semibold text-xl">Email steps</legend>
        <p>
          Use {"{{attendeeName}}"}, {"{{courseTitle}}"}, and {"{{portalLink}}"}.
          Paragraphs are formatted safely; HTML is displayed as text.
        </p>
        {value.emails.map((step) => (
          <div className="space-y-2 rounded border p-3" key={step.id}>
            <EmailPreview body={step.body} subject={step.subject} />
            <label>
              Subject
              <Input
                onChange={(e) =>
                  onChange({
                    ...value,
                    emails: value.emails.map((entry) =>
                      entry.id === step.id
                        ? { ...entry, subject: e.target.value }
                        : entry
                    ),
                  })
                }
                value={step.subject}
              />
            </label>
            <label>
              Body
              <textarea
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    emails: value.emails.map((entry) =>
                      entry.id === step.id
                        ? { ...entry, body: e.target.value }
                        : entry
                    ),
                  })
                }
                value={step.body}
              />
            </label>
            <label>
              Timing anchor
              <select
                className={inputStyle}
                onChange={(e) =>
                  onChange({
                    ...value,
                    emails: value.emails.map((entry) =>
                      entry.id === step.id
                        ? {
                            ...entry,
                            anchor: e.target.value as typeof step.anchor,
                          }
                        : entry
                    ),
                  })
                }
                value={step.anchor}
              >
                <option value="first">First meeting</option>
                <option value="last">Last meeting</option>
                <option value="registration">Registration</option>
              </select>
            </label>
            <label>
              Minutes from anchor (negative means before)
              <Input
                onChange={(e) =>
                  onChange({
                    ...value,
                    emails: value.emails.map((entry) =>
                      entry.id === step.id
                        ? { ...entry, offsetMinutes: Number(e.target.value) }
                        : entry
                    ),
                  })
                }
                type="number"
                value={step.offsetMinutes}
              />
            </label>
            <Button
              onClick={() =>
                onChange({
                  ...value,
                  emails: value.emails.filter((entry) => entry.id !== step.id),
                })
              }
              type="button"
              variant="outline"
            >
              Remove step
            </Button>
          </div>
        ))}
        <Button
          onClick={() =>
            onChange({
              ...value,
              emails: [
                ...value.emails,
                {
                  id: crypto.randomUUID(),
                  anchor: "first",
                  offsetMinutes: -1440,
                  subject: "Your class is tomorrow",
                  body: "Hello {{attendeeName}}, view your class details in your portal.",
                },
              ],
            })
          }
          type="button"
          variant="outline"
        >
          Add email step
        </Button>
      </fieldset>
    </div>
  );
}
export function CourseAdmin() {
  const courses = useQuery(api.registration.courses);
  const save = useMutation(api.registration.saveCourse);
  const [editing, setEditing] = useState<Id<"registrationCourses">>();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [delivery, setDelivery] = useState<"scheduled" | "self-paced">(
    "scheduled"
  );
  const [publication, setPublication] = useState<
    "draft" | "published" | "archived"
  >("draft");
  const [open, setOpen] = useState(true);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [message, setMessage] = useState("");
  function edit(c: Doc<"registrationCourses">, duplicate = false) {
    setEditing(duplicate ? undefined : c._id);
    setTitle(c.title + (duplicate ? " copy" : ""));
    setSlug(c.slug + (duplicate ? "-copy" : ""));
    setDescription(c.description);
    setDelivery(c.delivery);
    setPublication(duplicate ? "draft" : c.publication);
    setOpen(c.enrollmentOpen);
    setSettings(c.settings);
  }
  return (
    <section className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">Course templates</h1>
      <div className="flex flex-wrap gap-3">
        {courses?.map((c) => (
          <article className="rounded border p-3" key={c._id}>
            <h2>
              {c.title} · {c.publication}
            </h2>
            <Button onClick={() => edit(c)} type="button" variant="outline">
              Edit
            </Button>
            <Button
              onClick={() => edit(c, true)}
              type="button"
              variant="outline"
            >
              Duplicate
            </Button>
            <Link className="block underline" href={`/courses/${c.slug}`}>
              View offering
            </Link>
          </article>
        ))}
      </div>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const id = await save({
              id: editing,
              title,
              slug,
              description,
              delivery,
              publication,
              enrollmentOpen: open,
              settings,
              revision: 0,
            });
            setEditing(id);
            setMessage("Course saved");
          } catch (error) {
            setMessage(String(error));
          }
        }}
      >
        <h2 className="text-2xl">
          {editing ? "Edit template" : "New template"}
        </h2>
        <label className="block">
          Title
          <Input
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />
        </label>
        <label className="block">
          URL name
          <Input
            onChange={(e) => setSlug(e.target.value)}
            required
            value={slug}
          />
        </label>
        <label className="block">
          Description
          <textarea
            className={inputStyle}
            onChange={(e) => setDescription(e.target.value)}
            value={description}
          />
        </label>
        <label className="block">
          Delivery
          <select
            className={inputStyle}
            onChange={(e) => setDelivery(e.target.value as typeof delivery)}
            value={delivery}
          >
            <option value="scheduled">Scheduled</option>
            <option value="self-paced">Self-paced</option>
          </select>
        </label>
        <label className="block">
          Publication
          <select
            className={inputStyle}
            onChange={(e) =>
              setPublication(e.target.value as typeof publication)
            }
            value={publication}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <input
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            type="checkbox"
          />{" "}
          Enrollment open
        </label>
        <ConfigEditor onChange={setSettings} value={settings} />
        <Button type="submit">Save template</Button>
      </form>
      <Message text={message} />
    </section>
  );
}
export function SessionAdmin() {
  const [reason, _setReason] = useState("");
  const courses = useQuery(api.registration.courses);
  const sessions = useQuery(api.registration.sessions, {});
  const save = useMutation(api.registration.saveSession);
  const cancel = useMutation(api.registrationOperations.cancelSession);
  const locations = useQuery(api.registrationOperations.locations);
  const directory = useQuery(api.registrationOperations.staffDirectory);
  const [instructors, setInstructors] = useState<Id<"users">[]>([]);
  const [editing, setEditing] = useState<Doc<"registrationSessions"> | null>(
    null
  );
  const [courseId, setCourseId] = useState<Id<"registrationCourses">>();
  const [title, setTitle] = useState("");
  const [zone, setZone] = useState("America/Los_Angeles");
  const [capacity, setCapacity] = useState(12);
  const [visibility, setVisibility] = useState<"public" | "private" | "admin">(
    "public"
  );
  const [publication, setPublication] = useState<
    "draft" | "published" | "archived"
  >("draft");
  const [meetings, setMeetings] = useState<
    Doc<"registrationSessions">["meetings"]
  >([]);
  const [override, setOverride] = useState(false);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [preview, setPreview] = useState<{ start: number; end: number }[][]>(
    []
  );
  function edit(s: Doc<"registrationSessions">, duplicate = false) {
    setEditing(duplicate ? null : s);
    setCourseId(s.courseId);
    setTitle(s.title);
    setZone(s.timeZone);
    setCapacity(s.capacity);
    setVisibility(s.visibility);
    setPublication(duplicate ? "draft" : s.publication);
    setMeetings(s.meetings);
    setInstructors(s.instructors);
    setOverride(Object.keys(s.overrides).length > 0);
    const course = courses?.find((c) => c._id === s.courseId);
    setSettings({ ...(course?.settings ?? emptySettings), ...s.overrides });
  }
  async function submit() {
    if (!courseId) {
      return;
    }
    try {
      await save({
        id: editing?._id,
        courseId,
        title,
        timeZone: zone,
        capacity,
        visibility,
        publication,
        meetings,
        overrides: override ? settings : {},
        instructors,
        offerMinutes: 1440,
        notify,
      });
      setMessage("Session saved. Its share link remains stable.");
    } catch (error) {
      setMessage(String(error));
    }
  }
  return (
    <section className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">Sessions</h1>
      {sessions?.map((s) => (
        <article
          className="flex flex-wrap items-center gap-3 rounded border p-4"
          key={s._id}
        >
          <h2>
            {s.title} · {s.reserved}/{s.capacity} · {s.state}
          </h2>
          <Button onClick={() => edit(s)} type="button" variant="outline">
            Edit
          </Button>
          <Button onClick={() => edit(s, true)} type="button" variant="outline">
            Duplicate
          </Button>
          <Button
            onClick={() =>
              navigator.clipboard.writeText(
                `${window.location.origin}/s/${s.code}`
              )
            }
            type="button"
            variant="outline"
          >
            Copy share link
          </Button>
          <Link className="underline" href={`/instructor/sessions/${s._id}`}>
            Roster
          </Link>
          <Button
            onClick={async () => {
              if (reason) {
                try {
                  await cancel({ sessionId: s._id, reason, notify });
                  setMessage("Session canceled");
                } catch (error) {
                  setMessage(String(error));
                }
              }
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </article>
      ))}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block">
          Course
          <select
            className={inputStyle}
            onChange={(e) => {
              const c = courses?.find(
                (course) => course._id === e.target.value
              );
              if (c) {
                setCourseId(c._id);
                setSettings(c.settings);
                setTitle(c.title);
              }
            }}
            required
            value={courseId ?? ""}
          >
            <option value="">Choose course</option>
            {courses
              ?.filter((c) => c.delivery === "scheduled")
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          Session title
          <Input
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />
        </label>
        <label className="block">
          IANA time zone
          <Input onChange={(e) => setZone(e.target.value)} value={zone} />
        </label>
        <label className="block">
          Capacity
          <Input
            min={1}
            onChange={(e) => setCapacity(Number(e.target.value))}
            type="number"
            value={capacity}
          />
        </label>
        <label className="block">
          Visibility
          <select
            className={inputStyle}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            value={visibility}
          >
            <option value="public">Public</option>
            <option value="private">Private / unlisted</option>
            <option value="admin">Admin only</option>
          </select>
        </label>
        <label className="block">
          Publication
          <select
            className={inputStyle}
            onChange={(e) =>
              setPublication(e.target.value as typeof publication)
            }
            value={publication}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <fieldset>
          <legend>Assigned instructors</legend>
          {directory?.map((person) => (
            <label className="block" key={person.id}>
              <input
                checked={instructors.includes(person.id)}
                onChange={(e) =>
                  setInstructors(
                    e.target.checked
                      ? [...instructors, person.id]
                      : instructors.filter((id) => id !== person.id)
                  )
                }
                type="checkbox"
              />{" "}
              {person.email}
            </label>
          ))}
        </fieldset>
        {meetings.map((m) => (
          <fieldset className="space-y-2 rounded border p-3" key={m.id}>
            <legend>Meeting</legend>
            <label className="block">
              Saved location
              <select
                className="block rounded border p-2"
                onChange={(e) => {
                  const location = locations?.find(
                    (l) => l._id === e.target.value
                  );
                  if (location) {
                    setMeetings(
                      meetings.map((entry) =>
                        entry.id === m.id
                          ? {
                              ...entry,
                              locationId: location._id,
                              location: `${location.name}: ${location.address}`,
                              instructions: location.instructions,
                            }
                          : entry
                      )
                    );
                  }
                }}
                value={m.locationId ?? ""}
              >
                <option value="">Custom venue</option>
                {locations
                  ?.filter((l) => !l.archived)
                  .map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              Start (UTC)
              <Input
                onChange={(e) =>
                  setMeetings(
                    meetings.map((entry) =>
                      entry.id === m.id
                        ? { ...entry, start: Date.parse(`${e.target.value}Z`) }
                        : entry
                    )
                  )
                }
                type="datetime-local"
                value={new Date(m.start).toISOString().slice(0, 16)}
              />
            </label>
            <label className="block">
              End (UTC)
              <Input
                onChange={(e) =>
                  setMeetings(
                    meetings.map((entry) =>
                      entry.id === m.id
                        ? { ...entry, end: Date.parse(`${e.target.value}Z`) }
                        : entry
                    )
                  )
                }
                type="datetime-local"
                value={new Date(m.end).toISOString().slice(0, 16)}
              />
            </label>
            <label className="block">
              Public venue
              <Input
                onChange={(e) =>
                  setMeetings(
                    meetings.map((entry) =>
                      entry.id === m.id
                        ? { ...entry, location: e.target.value }
                        : entry
                    )
                  )
                }
                value={m.location}
              />
            </label>
            <label className="block">
              Private online link
              <Input
                onChange={(e) =>
                  setMeetings(
                    meetings.map((entry) =>
                      entry.id === m.id
                        ? { ...entry, onlineUrl: e.target.value || undefined }
                        : entry
                    )
                  )
                }
                type="url"
                value={m.onlineUrl ?? ""}
              />
            </label>
            <label className="block">
              Private joining instructions
              <Input
                onChange={(e) =>
                  setMeetings(
                    meetings.map((entry) =>
                      entry.id === m.id
                        ? { ...entry, instructions: e.target.value }
                        : entry
                    )
                  )
                }
                value={m.instructions}
              />
            </label>
            <Button
              onClick={() =>
                setMeetings(meetings.filter((entry) => entry.id !== m.id))
              }
              type="button"
              variant="outline"
            >
              Remove meeting
            </Button>
          </fieldset>
        ))}
        <Button
          onClick={() =>
            setMeetings([
              ...meetings,
              {
                id: crypto.randomUUID(),
                start: Date.now() + 86_400_000,
                end: Date.now() + 90_000_000,
                location: "",
                instructions: "",
                sequence: 0,
              },
            ])
          }
          type="button"
          variant="outline"
        >
          Add meeting
        </Button>
        <label className="block">
          <input
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            type="checkbox"
          />{" "}
          Override template settings for this session
        </label>
        {override ? (
          <ConfigEditor onChange={setSettings} value={settings} />
        ) : (
          <p>
            Pricing, materials, questions, outcomes, and emails inherit from the
            current template. Uncheck override to reset.
          </p>
        )}
        <label className="block">
          <input
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            type="checkbox"
          />{" "}
          Notify affected attendees about changes
        </label>
        <Button type="submit">Save session</Button>
      </form>
      <fieldset className="space-y-3 rounded border p-4">
        <legend>Recurring sessions preview</legend>
        <p>
          Preview sessions on selected weekdays, preserving all meeting offsets
          and local times in the selected time zone.
        </p>
        <label>
          Start date
          <Input
            onChange={(e) => setStartDate(e.target.value)}
            type="date"
            value={startDate}
          />
        </label>
        <label>
          End date
          <Input
            onChange={(e) => setEndDate(e.target.value)}
            type="date"
            value={endDate}
          />
        </label>
        <fieldset>
          <legend>Weekdays</legend>
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day, index) => (
            <label className="mr-3 inline-block" key={day}>
              <input
                checked={weekdays.includes(index + 1)}
                onChange={(e) =>
                  setWeekdays(
                    e.target.checked
                      ? [...weekdays, index + 1]
                      : weekdays.filter((d) => d !== index + 1)
                  )
                }
                type="checkbox"
              />
              {day}
            </label>
          ))}
        </fieldset>
        <Button
          onClick={() => {
            try {
              setPreview(
                recurrenceFromMeetings({
                  startDate,
                  endDate,
                  weekdays,
                  timeZone: zone,
                  meetings,
                })
              );
            } catch (error) {
              setMessage(String(error));
            }
          }}
          type="button"
        >
          Preview dates
        </Button>
        <ul>
          {preview.map((occurrence) => (
            <li key={occurrence[0]?.start}>
              {new Date(occurrence[0]?.start ?? 0).toLocaleString("en-US", {
                timeZone: zone,
              })}
            </li>
          ))}
        </ul>
        <Button
          disabled={!(preview.length && courseId)}
          onClick={async () => {
            if (!courseId) {
              return;
            }
            try {
              await Promise.all(
                preview.map((occurrence) =>
                  save({
                    courseId,
                    title,
                    timeZone: zone,
                    capacity,
                    visibility,
                    publication: "draft",
                    meetings: occurrence.map((m, index) => ({
                      ...m,
                      id: crypto.randomUUID(),
                      location: meetings[index]?.location ?? "Training center",
                      onlineUrl: meetings[index]?.onlineUrl,
                      instructions: meetings[index]?.instructions ?? "",
                      sequence: 0,
                    })),
                    overrides: {},
                    instructors: [],
                    offerMinutes: 1440,
                    notify: false,
                  })
                )
              );
              setPreview([]);
              setMessage("Independent draft sessions created");
            } catch (error) {
              setMessage(String(error));
            }
          }}
          type="button"
        >
          Create previewed draft sessions
        </Button>
      </fieldset>
      <Message text={message} />
    </section>
  );
}
export function MaterialAdmin() {
  const materials = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 20 }
  );
  const save = useMutation(api.registrationOperations.saveMaterial);
  const upload = useMutation(api.registrationOperations.uploadUrl);
  const addStock = useMutation(api.registrationOperations.addStock);
  const [editing, setEditing] = useState<Id<"registrationMaterials">>();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"link" | "pdf" | "keycode">("link");
  const [url, setUrl] = useState("");
  const [storageId, setStorageId] = useState<Id<"_storage">>();
  const [inventory, setInventory] = useState<Id<"registrationMaterials">>();
  const [links, setLinks] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">Materials and inventory</h1>
      {materials.results.map((m) => (
        <article className="rounded border p-3" key={m._id}>
          {m.title} · {m.kind} · version {m.version} · {m.availableCount ?? 0}{" "}
          available / {m.assignedCount ?? 0} assigned / {m.retiredCount ?? 0}{" "}
          retired
          <Button
            onClick={() => {
              setEditing(m._id);
              setTitle(m.title);
              setKind(m.kind);
              setUrl(m.url ?? "");
              setStorageId(m.storageId);
            }}
            type="button"
            variant="outline"
          >
            Edit material
          </Button>
          {m.kind === "keycode" ? (
            <Button
              onClick={() => setInventory(m._id)}
              type="button"
              variant="outline"
            >
              Restock
            </Button>
          ) : null}
        </article>
      ))}
      {materials.status === "CanLoadMore" ? (
        <Button onClick={() => materials.loadMore(20)} type="button">
          Load more
        </Button>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save({
              id: editing,
              title,
              kind,
              url: kind === "link" ? url : undefined,
              storageId,
              archived: false,
            });
            setMessage("Material saved; previous delivered versions preserved");
            setEditing(undefined);
          } catch (error) {
            setMessage(String(error));
          }
        }}
      >
        <label className="block">
          Title
          <Input
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />
        </label>
        <label className="block">
          Type
          <select
            className={inputStyle}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            value={kind}
          >
            <option value="link">Shared link</option>
            <option value="pdf">PDF</option>
            <option value="keycode">Unique keycode inventory</option>
          </select>
        </label>
        {kind === "link" ? (
          <label className="block">
            HTTPS link
            <Input
              onChange={(e) => setUrl(e.target.value)}
              type="url"
              value={url}
            />
          </label>
        ) : null}
        {kind === "pdf" ? (
          <label className="block">
            PDF upload
            <Input
              accept="application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }
                try {
                  const response = await fetch(await upload({}), {
                    method: "POST",
                    headers: { "Content-Type": "application/pdf" },
                    body: file,
                  });
                  const data = await response.json();
                  setStorageId(data.storageId);
                  setMessage("PDF uploaded");
                } catch (error) {
                  setMessage(String(error));
                }
              }}
              type="file"
            />
          </label>
        ) : null}
        <Button type="submit">
          {editing ? "Save material version" : "Create material"}
        </Button>
      </form>
      {inventory ? (
        <div className="space-y-3">
          <h2 className="text-2xl">Bulk paste unique links</h2>
          <label className="block">
            One HTTPS link per line
            <textarea
              className={inputStyle}
              onChange={(e) => setLinks(e.target.value)}
              rows={8}
              value={links}
            />
          </label>
          <Button
            onClick={async () => {
              try {
                const result = await addStock({
                  materialId: inventory,
                  input: links,
                  preview: true,
                });
                setMessage(
                  `${result.valid.length} valid · ${result.duplicates.length} duplicates · ${result.invalid.length} invalid`
                );
              } catch (error) {
                setMessage(String(error));
              }
            }}
            type="button"
            variant="outline"
          >
            Preview import
          </Button>
          <Button
            onClick={async () => {
              try {
                const result = await addStock({
                  materialId: inventory,
                  input: links,
                  preview: false,
                });
                setMessage(
                  `${result.added} links added. Outstanding paid entitlements will be fulfilled in order.`
                );
              } catch (error) {
                setMessage(String(error));
              }
            }}
            type="button"
          >
            Import valid links
          </Button>
        </div>
      ) : null}
      {inventory ? <InventoryManager materialId={inventory} /> : null}
      <Message text={message} />
    </section>
  );
}
export function CouponAdmin() {
  const courses = useQuery(api.registration.courses);
  const materials = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 50 }
  );
  const [courseIds, setCourseIds] = useState<Id<"registrationCourses">[]>([]);
  const [materialIds, setMaterialIds] = useState<Id<"registrationMaterials">[]>(
    []
  );
  const [editing, setEditing] = useState<Id<"registrationCoupons">>();
  const coupons = useQuery(api.registration.coupons);
  const save = useMutation(api.registration.saveCoupon);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState(100);
  const [limit, setLimit] = useState(2);
  const [allMaterials, setAllMaterials] = useState(false);
  const [expires, setExpires] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">Coupons</h1>
      {coupons?.map((c) => (
        <article className="rounded border p-4" key={c._id}>
          <h2>{c.code}</h2>
          <Button
            onClick={() => {
              setEditing(c._id);
              setCode(c.code);
              setType(c.type);
              setAmount(c.amount);
              setLimit(c.limit);
              setCourseIds(c.courseIds);
              setMaterialIds(c.materialIds);
              setAllMaterials(c.allMaterials);
              setExpires(new Date(c.expires).toISOString().slice(0, 10));
            }}
            type="button"
            variant="outline"
          >
            Edit coupon
          </Button>
          <p>
            {c.consumed} consumed · {c.reserved} reserved · {c.limit} seat uses
          </p>
          <Button
            onClick={async () => {
              const { _id, _creationTime, ...fields } = c;
              try {
                await save({ ...fields, id: _id, disabled: !c.disabled });
              } catch (error) {
                setMessage(String(error));
              }
            }}
            type="button"
            variant="outline"
          >
            {c.disabled ? "Enable" : "Disable"}
          </Button>
        </article>
      ))}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save({
              id: editing,
              code,
              type,
              amount,
              materialIds,
              allMaterials,
              courseIds,
              expires: Date.parse(`${expires}T23:59:59Z`),
              limit,
              reserved: 0,
              consumed: 0,
              disabled: false,
            });
            setMessage("Coupon saved");
          } catch (error) {
            setMessage(String(error));
          }
        }}
      >
        <label className="block">
          Code
          <Input
            onChange={(e) => setCode(e.target.value)}
            required
            value={code}
          />
        </label>
        <label className="block">
          Discount type
          <select
            className={inputStyle}
            onChange={(e) => setType(e.target.value as typeof type)}
            value={type}
          >
            <option value="percent">Percentage per seat</option>
            <option value="fixed">Fixed cents per seat</option>
          </select>
        </label>
        <label className="block">
          Amount
          <Input
            min={0}
            onChange={(e) => setAmount(Number(e.target.value))}
            type="number"
            value={amount}
          />
        </label>
        <label className="block">
          Maximum discounted seats
          <Input
            min={0}
            onChange={(e) => setLimit(Number(e.target.value))}
            type="number"
            value={limit}
          />
        </label>
        <label className="block">
          Expires (UTC)
          <Input
            onChange={(e) => setExpires(e.target.value)}
            required
            type="date"
            value={expires}
          />
        </label>
        <label className="block">
          <input
            checked={allMaterials}
            onChange={(e) => setAllMaterials(e.target.checked)}
            type="checkbox"
          />{" "}
          Discount all materials as well as tuition
        </label>
        <fieldset>
          <legend>Eligible courses (none selected means all)</legend>
          {courses?.map((c) => (
            <label className="block" key={c._id}>
              <input
                checked={courseIds.includes(c._id)}
                onChange={(e) =>
                  setCourseIds(
                    e.target.checked
                      ? [...courseIds, c._id]
                      : courseIds.filter((id) => id !== c._id)
                  )
                }
                type="checkbox"
              />
              {c.title}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Selected discounted materials</legend>
          {materials.results.map((m) => (
            <label className="block" key={m._id}>
              <input
                checked={materialIds.includes(m._id)}
                onChange={(e) =>
                  setMaterialIds(
                    e.target.checked
                      ? [...materialIds, m._id]
                      : materialIds.filter((id) => id !== m._id)
                  )
                }
                type="checkbox"
              />
              {m.title}
            </label>
          ))}
        </fieldset>
        {materials.status === "CanLoadMore" ? (
          <Button onClick={() => materials.loadMore(50)} type="button">
            Load more materials
          </Button>
        ) : null}
        <Button type="submit">
          {editing ? "Save coupon" : "Create coupon"}
        </Button>
      </form>
      <Message text={message} />
    </section>
  );
}
export function OrderAdmin() {
  const [reason, setReason] = useState("");
  const orders = usePaginatedQuery(
    api.registrationOperations.orders,
    {},
    { initialNumItems: 20 }
  );
  const record = useMutation(api.registrationOperations.recordPayment);
  const restore = useMutation(api.registrationOperations.restoreCoupon);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">Registrations and payments</h1>
      <label className="block">
        Search loaded orders and attendees
        <Input onChange={(e) => setSearch(e.target.value)} value={search} />
      </label>
      <label className="block">
        Payment or coupon restoration reason
        <Input onChange={(e) => setReason(e.target.value)} value={reason} />
      </label>
      <ManualEnrollment />
      <BulkOperations orders={orders.results} />
      {orders.results
        .filter((order) =>
          `${order.purchaser} ${order.title} ${order.seats.map((seat) => seat.attendee.email).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
        .map((order) => (
          <article className="space-y-2 rounded border p-5" key={order._id}>
            <h2 className="font-semibold text-xl">{order.title}</h2>
            <p>
              {order.purchaser} · {order.status} · $
              {(order.total / 100).toFixed(2)}
            </p>
            <ul>
              {order.seats.map((seat) => (
                <li key={seat.attendee.email}>
                  {seat.attendee.name} · {seat.attendee.email} · $
                  {(seat.total / 100).toFixed(2)}
                </li>
              ))}
            </ul>
            {order.status === "unpaid" ? (
              <div>
                {(["offline", "waived"] as const).map((source) => (
                  <Button
                    key={source}
                    onClick={async () => {
                      if (reason) {
                        try {
                          await record({ orderId: order._id, source, reason });
                          setMessage("Payment recorded and fulfillment queued");
                        } catch (error) {
                          setMessage(String(error));
                        }
                      }
                    }}
                    type="button"
                  >
                    {source === "offline"
                      ? "Record offline payment"
                      : "Waive payment"}
                  </Button>
                ))}
              </div>
            ) : null}
            {order.couponId && order.status === "settled" ? (
              <Button
                onClick={async () => {
                  if (reason) {
                    try {
                      await restore({ orderId: order._id, reason });
                      setMessage("Coupon uses restored exactly once");
                    } catch (error) {
                      setMessage(String(error));
                    }
                  }
                }}
                type="button"
                variant="outline"
              >
                Restore coupon uses
              </Button>
            ) : null}
            <OrderOperations order={order} />
          </article>
        ))}
      {orders.status === "CanLoadMore" ? (
        <Button onClick={() => orders.loadMore(20)} type="button">
          Load more
        </Button>
      ) : null}
      <Message text={message} />
    </section>
  );
}
export function ActivityAdmin() {
  const activity = usePaginatedQuery(
    api.registrationOperations.activity,
    {},
    { initialNumItems: 20 }
  );
  const attention = useQuery(api.registrationOperations.attention);
  const retry = useMutation(api.registrationOperations.retryEmail);
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-bold text-3xl">
        Registration activity and attention
      </h1>
      <h2 className="text-2xl">Refund reconciliation</h2>
      {attention?.refunds.map((r) => (
        <p key={r._id}>
          {r.orderId} · ${(r.cents / 100).toFixed(2)} ·{" "}
          {r.error ?? "Awaiting provider confirmation; durable retry scheduled"}
        </p>
      ))}
      <h2 className="text-2xl">Failed email deliveries</h2>
      {attention?.emails.map((job) => (
        <article className="rounded border p-3" key={job._id}>
          <p>
            {job.subject} · {job.error}
          </p>
          <Button
            onClick={async () => {
              try {
                await retry({ id: job._id });
                setMessage("Retry queued");
              } catch (error) {
                setMessage(String(error));
              }
            }}
            type="button"
          >
            Retry
          </Button>
        </article>
      ))}
      <h2 className="text-2xl">Unpaid enrollments</h2>
      {attention?.unpaid.map((o) => (
        <p key={o._id}>
          {o.title} · {o.purchaser}
        </p>
      ))}
      <h2 className="text-2xl">Payment reconciliation</h2>
      {attention?.payments.map((o) => (
        <p key={o._id}>
          {o.title} · {o.error}
        </p>
      ))}
      <h2 className="text-2xl">Audit history</h2>
      {activity.results.map((row) => (
        <article className="rounded border p-3" key={row._id}>
          <p>
            {new Date(row.at).toLocaleString()} · {row.action}
          </p>
          <p>{row.detail}</p>
        </article>
      ))}
      {activity.status === "CanLoadMore" ? (
        <Button onClick={() => activity.loadMore(20)} type="button">
          Load more
        </Button>
      ) : null}
      <Message text={message} />
    </section>
  );
}
