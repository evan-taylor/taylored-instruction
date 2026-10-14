"use client";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pluralize } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import {
  Field,
  Money,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Settings } from "@/shared/registration/domain";
import { ConfigEditor } from "./config-editor";
import { emptySettings, slugify } from "./shared";

type Course = Doc<"registrationCourses">;
type CourseDraft = {
  id?: Id<"registrationCourses">;
  title: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  delivery: Course["delivery"];
  publication: Course["publication"];
  enrollmentOpen: boolean;
  settings: Settings;
};
type EditorTab = "basics" | "pricing" | "questions" | "outcomes" | "emails";
const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "pricing", label: "Pricing & materials" },
  { id: "questions", label: "Questions" },
  { id: "outcomes", label: "Outcomes" },
  { id: "emails", label: "Emails" },
];

function blankDraft(): CourseDraft {
  return {
    title: "",
    slug: "",
    slugTouched: false,
    description: "",
    delivery: "scheduled",
    publication: "draft",
    enrollmentOpen: true,
    settings: emptySettings,
  };
}
function draftFrom(course: Course, duplicate: boolean): CourseDraft {
  return {
    id: duplicate ? undefined : course._id,
    title: duplicate ? `${course.title} copy` : course.title,
    slug: duplicate ? `${course.slug}-copy` : course.slug,
    slugTouched: true,
    description: course.description,
    delivery: course.delivery,
    publication: duplicate ? "draft" : course.publication,
    enrollmentOpen: course.enrollmentOpen,
    settings: course.settings,
  };
}

function BasicsSection({
  draft,
  onChange,
}: {
  draft: CourseDraft;
  onChange: (draft: CourseDraft) => void;
}) {
  const editing = draft.id !== undefined;
  const autoSlug = !(editing || draft.slugTouched);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) =>
                onChange({
                  ...draft,
                  title: e.target.value,
                  slug: autoSlug ? slugify(e.target.value) : draft.slug,
                })
              }
              placeholder="BLS Provider"
              value={draft.title}
            />
          )}
        </Field>
        <Field
          hint={`Public page: /courses/${draft.slug || "…"}`}
          label="URL slug"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) =>
                onChange({
                  ...draft,
                  slug: e.target.value,
                  slugTouched: true,
                })
              }
              value={draft.slug}
            />
          )}
        </Field>
      </div>
      <Field
        hint="Shown on the public course page and the registration form."
        label="Description"
      >
        {(props) => (
          <TextArea
            {...props}
            className="min-h-28"
            onChange={(e) =>
              onChange({ ...draft, description: e.target.value })
            }
            value={draft.description}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          hint={
            editing
              ? "Duplicate the template to change delivery type."
              : "Scheduled courses meet at set times; self-paced courses deliver materials immediately."
          }
          label="Delivery"
        >
          {(props) => (
            <Select
              {...props}
              disabled={editing}
              onChange={(e) =>
                onChange({
                  ...draft,
                  delivery: e.target.value as Course["delivery"],
                })
              }
              value={draft.delivery}
            >
              <option value="scheduled">Scheduled</option>
              <option value="self-paced">Self-paced</option>
            </Select>
          )}
        </Field>
        <Field
          hint="Only published templates appear on the public site."
          label="Publication"
        >
          {(props) => (
            <Select
              {...props}
              onChange={(e) =>
                onChange({
                  ...draft,
                  publication: e.target.value as Course["publication"],
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
      <Toggle
        checked={draft.enrollmentOpen}
        description="When closed, the public page shows the course but blocks new registrations."
        label="Enrollment open"
        onChange={(enrollmentOpen) => onChange({ ...draft, enrollmentOpen })}
      />
    </div>
  );
}

function CourseEditorModal({
  draft,
  onChange,
  onClose,
  onSubmit,
  busy,
  message,
}: {
  draft: CourseDraft;
  onChange: (draft: CourseDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
  message: string;
}) {
  const [tab, setTab] = useState<EditorTab>("basics");
  const setSettings = (settings: Settings) => onChange({ ...draft, settings });
  return (
    <Modal
      description="Templates define pricing, materials, questions, and emails that every session inherits."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={busy} onClick={onSubmit} size="sm" type="button">
            {busy ? "Working…" : "Save template"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="xl"
      title={draft.id ? `Edit ${draft.title || "template"}` : "New template"}
    >
      <div className="space-y-4">
        <ResultNotice message={message} />
        <Tabs
          label="Template sections"
          onChange={setTab}
          tabs={EDITOR_TABS}
          value={tab}
        />
        <TabPanel active={tab === "basics"} id="basics">
          <BasicsSection draft={draft} onChange={onChange} />
        </TabPanel>
        <TabPanel active={tab === "pricing"} id="pricing">
          <ConfigEditor
            onChange={setSettings}
            section="pricing"
            value={draft.settings}
          />
        </TabPanel>
        <TabPanel active={tab === "questions"} id="questions">
          <ConfigEditor
            onChange={setSettings}
            section="questions"
            value={draft.settings}
          />
        </TabPanel>
        <TabPanel active={tab === "outcomes"} id="outcomes">
          <ConfigEditor
            onChange={setSettings}
            section="outcomes"
            value={draft.settings}
          />
        </TabPanel>
        <TabPanel active={tab === "emails"} id="emails">
          <ConfigEditor
            onChange={setSettings}
            section="emails"
            value={draft.settings}
          />
        </TabPanel>
      </div>
    </Modal>
  );
}

function CourseRow({
  course,
  onEdit,
  onDuplicate,
}: {
  course: Course;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  return (
    <TR>
      <TD>
        <div className="font-medium text-slate-900">{course.title}</div>
        <div className="text-slate-500 text-xs">/courses/{course.slug}</div>
      </TD>
      <TD>
        <Badge tone={course.delivery === "scheduled" ? "info" : "neutral"}>
          {course.delivery === "scheduled" ? "Scheduled" : "Self-paced"}
        </Badge>
      </TD>
      <TD>
        <StatusBadge status={course.publication} />
      </TD>
      <TD>
        <Badge tone={course.enrollmentOpen ? "success" : "warning"}>
          {course.enrollmentOpen ? "Open" : "Closed"}
        </Badge>
      </TD>
      <TD className="text-right">
        <Money cents={course.settings.tuition} />
        {course.settings.taxCode ? (
          <div className="text-slate-500 text-xs">
            Tax code {course.settings.taxCode}
          </div>
        ) : null}
      </TD>
      <TD className="tabular-nums">
        {pluralize(course.settings.materials.length, "material")}
      </TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button onClick={onEdit} size="xs" type="button" variant="secondary">
            Edit
          </Button>
          <Button onClick={onDuplicate} size="xs" type="button" variant="ghost">
            Duplicate
          </Button>
          <Button
            href={`/courses/${course.slug}`}
            rel="noopener noreferrer"
            size="xs"
            target="_blank"
            variant="ghost"
          >
            View offering
          </Button>
        </div>
      </TD>
    </TR>
  );
}

function CourseTable({
  courses,
  onEdit,
  onDuplicate,
}: {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDuplicate: (course: Course) => void;
}) {
  return (
    <Table wrapperClassName="rounded-none border-0">
      <THead>
        <TR>
          <TH>Template</TH>
          <TH>Delivery</TH>
          <TH>Publication</TH>
          <TH>Enrollment</TH>
          <TH className="text-right">Tuition</TH>
          <TH>Materials</TH>
          <TH className="text-right">
            <span className="sr-only">Actions</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {courses.map((c) => (
          <CourseRow
            course={c}
            key={c._id}
            onDuplicate={() => onDuplicate(c)}
            onEdit={() => onEdit(c)}
          />
        ))}
      </TBody>
    </Table>
  );
}

function CourseList({
  courses,
  onEdit,
  onDuplicate,
  onCreate,
}: {
  courses: Course[] | undefined;
  onEdit: (course: Course) => void;
  onDuplicate: (course: Course) => void;
  onCreate: () => void;
}) {
  if (courses === undefined) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    );
  }
  if (courses.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          action={
            <Button onClick={onCreate} size="sm" type="button">
              Create a template
            </Button>
          }
          description="Templates hold pricing, materials, and emails. Sessions are scheduled from them."
          title="No course templates yet"
        />
      </div>
    );
  }
  return (
    <CourseTable courses={courses} onDuplicate={onDuplicate} onEdit={onEdit} />
  );
}

export function CourseAdmin() {
  const courses = useQuery(api.registration.courses);
  const save = useMutation(api.registration.saveCourse);
  const params = useSearchParams();
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (params.get("new") === "1") {
      setDraft(blankDraft());
    }
  }, [params]);
  const open = (next: CourseDraft) => {
    setError("");
    setNotice("");
    setDraft(next);
  };
  const submit = async () => {
    if (!draft) {
      return;
    }
    if (!(draft.title.trim() && draft.slug.trim())) {
      setError("Title and slug are required");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await save({
        id: draft.id,
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        delivery: draft.delivery,
        publication: draft.publication,
        enrollmentOpen: draft.enrollmentOpen,
        settings: draft.settings,
        revision: 0,
      });
      setNotice(
        `Saved ${draft.title}. Sessions pick up template changes automatically.`
      );
      setDraft(null);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => open(blankDraft())} size="sm" type="button">
            New template
          </Button>
        }
        description="Reusable course definitions. Each session inherits a template's pricing, materials, questions, outcomes, and emails."
        title="Course templates"
      />
      <ResultNotice message={notice} />
      <Card>
        <CardContent className="p-0">
          <CourseList
            courses={courses}
            onCreate={() => open(blankDraft())}
            onDuplicate={(c) => open(draftFrom(c, true))}
            onEdit={(c) => open(draftFrom(c, false))}
          />
        </CardContent>
      </Card>
      {draft ? (
        <CourseEditorModal
          busy={busy}
          draft={draft}
          message={error}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
}
