"use client";
import { usePaginatedQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  EmailPreview,
  MERGE_FIELDS,
} from "@/components/registration/email-preview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  MoneyInput,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui/field";
import { EmptyState, Notice } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Settings } from "@/shared/registration/domain";
import { patchById } from "./shared";

export type ConfigSection = "pricing" | "questions" | "outcomes" | "emails";
type SectionProps = {
  value: Settings;
  onChange: (value: Settings) => void;
};
type Material = Settings["materials"][number];
type Question = Settings["questions"][number];
type Outcome = Settings["outcomes"][number];
type EmailStep = Settings["emails"][number];

const POLICY_HELP: Record<Material["policy"], string> = {
  included: "Bundled with every seat; the price is added to tuition.",
  optional: "Attendees may add it at checkout for the listed price.",
  waivable:
    "Added by default; attendees may waive it if they already own a copy.",
};
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="m-0 font-semibold text-base text-slate-900">{title}</h3>
        <p className="m-0 mt-0.5 text-slate-500 text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      onClick={onClick}
      size="xs"
      title={label}
      type="button"
      variant="ghost"
    >
      <Trash2 aria-hidden="true" className="h-4 w-4 text-slate-500" />
    </Button>
  );
}

/* ----------------------------- Pricing & materials ----------------------------- */

function MaterialRow({
  row,
  catalog,
  onChange,
  onRemove,
}: {
  row: Material;
  catalog: { _id: Material["materialId"]; title: string }[];
  onChange: (patch: Partial<Material>) => void;
  onRemove: () => void;
}) {
  return (
    <TR>
      <TD className="align-top">
        <Field label={<span className="sr-only">Material</span>}>
          {(props) => (
            <Select
              {...props}
              onChange={(e) => {
                const material = catalog.find((m) => m._id === e.target.value);
                if (material) {
                  onChange({ materialId: material._id, title: material.title });
                }
              }}
              value={row.materialId}
            >
              {catalog.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </TD>
      <TD className="align-top">
        <Field
          hint={POLICY_HELP[row.policy]}
          label={<span className="sr-only">Policy</span>}
        >
          {(props) => (
            <Select
              {...props}
              onChange={(e) =>
                onChange({ policy: e.target.value as Material["policy"] })
              }
              value={row.policy}
            >
              <option value="included">Included</option>
              <option value="optional">Optional</option>
              <option value="waivable">Required, waivable</option>
            </Select>
          )}
        </Field>
      </TD>
      <TD className="w-36 align-top">
        <Field label={<span className="sr-only">Price</span>}>
          {(props) => (
            <MoneyInput
              {...props}
              onChange={(cents) => onChange({ cents })}
              value={row.cents}
            />
          )}
        </Field>
      </TD>
      <TD className="w-12 text-right align-top">
        <RemoveButton label={`Remove ${row.title}`} onClick={onRemove} />
      </TD>
    </TR>
  );
}

function MaterialsTable({ value, onChange }: SectionProps) {
  const materials = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 50 }
  );
  const catalog = materials.results;
  const attach = () => {
    const [material] = catalog;
    if (!material) {
      return;
    }
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
  };
  return (
    <div className="space-y-3">
      <SectionHeading
        action={
          <Button
            disabled={catalog.length === 0}
            onClick={attach}
            size="xs"
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Attach material
          </Button>
        }
        description="Books, keycodes, and links delivered with each seat."
        title="Materials"
      />
      {value.materials.length === 0 ? (
        <EmptyState
          className="py-8"
          description={
            catalog.length
              ? "Attach a material to bundle or offer it with this course."
              : "Create materials under Materials before attaching them."
          }
          title="No materials attached"
        />
      ) : (
        <Table className="min-w-[560px]">
          <THead>
            <TR>
              <TH>Material</TH>
              <TH>Policy</TH>
              <TH>Price</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {value.materials.map((row) => (
              <MaterialRow
                catalog={catalog}
                key={row.id}
                onChange={(patch) =>
                  onChange({
                    ...value,
                    materials: patchById(value.materials, row.id, patch),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...value,
                    materials: value.materials.filter((m) => m.id !== row.id),
                  })
                }
                row={row}
              />
            ))}
          </TBody>
        </Table>
      )}
      {materials.status === "CanLoadMore" ? (
        <Button
          onClick={() => materials.loadMore(50)}
          size="xs"
          type="button"
          variant="secondary"
        >
          Load more materials
        </Button>
      ) : null}
    </div>
  );
}

function PricingSection({ value, onChange }: SectionProps) {
  const cutoffHours = value.cutoffMinutes / MINUTES_PER_HOUR;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          hint="Charged per seat before materials and coupons."
          label="Tuition"
          required
        >
          {(props) => (
            <MoneyInput
              {...props}
              onChange={(tuition) => onChange({ ...value, tuition })}
              value={value.tuition}
            />
          )}
        </Field>
        <Field
          hint="Registration closes this many hours before the first meeting. Use 0 to stay open until it starts."
          label="Registration cutoff (hours before)"
        >
          {(props) => (
            <TextInput
              {...props}
              inputMode="decimal"
              min={0}
              onChange={(e) =>
                onChange({
                  ...value,
                  cutoffMinutes: Math.max(
                    0,
                    Math.round(Number(e.target.value) * MINUTES_PER_HOUR)
                  ),
                })
              }
              step="any"
              type="number"
              value={
                Number.isInteger(cutoffHours)
                  ? cutoffHours
                  : cutoffHours.toFixed(2)
              }
            />
          )}
        </Field>
      </div>
      <MaterialsTable onChange={onChange} value={value} />
    </div>
  );
}

/* --------------------------------- Questions --------------------------------- */

function QuestionCard({
  question,
  onChange,
  onRemove,
}: {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <Field className="flex-1" label="Question" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onChange({ title: e.target.value })}
              value={question.title}
            />
          )}
        </Field>
        <div className="pt-6">
          <RemoveButton label="Remove question" onClick={onRemove} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Answer type">
          {(props) => (
            <Select
              {...props}
              onChange={(e) =>
                onChange({ type: e.target.value as Question["type"] })
              }
              value={question.type}
            >
              <option value="text">Free text</option>
              <option value="choice">Multiple choice</option>
              <option value="checkbox">Acknowledgment checkbox</option>
            </Select>
          )}
        </Field>
        <Toggle
          checked={question.required}
          className="sm:pt-7"
          description="Attendees cannot register without answering."
          label="Required"
          onChange={(required) => onChange({ required })}
        />
      </div>
      {question.type === "choice" ? (
        <Field hint="One choice per line." label="Choices">
          {(props) => (
            <TextArea
              {...props}
              onChange={(e) =>
                onChange({ options: e.target.value.split("\n") })
              }
              value={question.options.join("\n")}
            />
          )}
        </Field>
      ) : null}
      {question.type === "checkbox" ? (
        <Field
          hint="Optional HTTPS link to the policy or waiver the attendee acknowledges."
          label="Policy URL"
        >
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) =>
                onChange({ policyUrl: e.target.value || undefined })
              }
              placeholder="https://"
              type="url"
              value={question.policyUrl ?? ""}
            />
          )}
        </Field>
      ) : null}
    </div>
  );
}

function QuestionsSection({ value, onChange }: SectionProps) {
  const add = () =>
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
    });
  return (
    <div className="space-y-3">
      <SectionHeading
        action={
          <Button onClick={add} size="xs" type="button" variant="secondary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add question
          </Button>
        }
        description="Asked once per attendee during checkout."
        title="Attendee questions"
      />
      {value.questions.length === 0 ? (
        <EmptyState
          className="py-8"
          description="Collect allergies, employer names, or policy acknowledgments."
          title="No questions yet"
        />
      ) : null}
      {value.questions.map((q) => (
        <QuestionCard
          key={q.id}
          onChange={(patch) =>
            onChange({
              ...value,
              questions: patchById(value.questions, q.id, patch),
            })
          }
          onRemove={() =>
            onChange({
              ...value,
              questions: value.questions.filter((entry) => entry.id !== q.id),
            })
          }
          question={q}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- Outcomes ---------------------------------- */

function PassingField({
  outcome,
  onChange,
}: {
  outcome: Outcome;
  onChange: (patch: Partial<Outcome>) => void;
}) {
  if (outcome.type === "percentage") {
    return (
      <Field
        hint="Scores at or above this percentage count as passing."
        label="Minimum score (%)"
      >
        {(props) => (
          <TextInput
            {...props}
            max={100}
            min={0}
            onChange={(e) => onChange({ minimum: Number(e.target.value) })}
            type="number"
            value={outcome.minimum ?? 80}
          />
        )}
      </Field>
    );
  }
  const choices = outcome.options.filter((o) => o.trim());
  return (
    <Field hint="The category that counts as passing." label="Passing category">
      {(props) => (
        <Select
          {...props}
          onChange={(e) => onChange({ passingValue: e.target.value })}
          value={outcome.passingValue ?? ""}
        >
          <option value="">Choose a category</option>
          {choices.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

function OutcomeCard({
  outcome,
  onChange,
  onRemove,
}: {
  outcome: Outcome;
  onChange: (patch: Partial<Outcome>) => void;
  onRemove: () => void;
}) {
  // Changing how an outcome is graded invalidates earlier entries, so bump the version.
  const bump = (patch: Partial<Outcome>) =>
    onChange({ ...patch, version: outcome.version + 1 });
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <Field className="flex-1" label="Outcome name" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => onChange({ title: e.target.value })}
              value={outcome.title}
            />
          )}
        </Field>
        <div className="pt-6">
          <RemoveButton label="Remove outcome" onClick={onRemove} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Graded as">
          {(props) => (
            <Select
              {...props}
              onChange={(e) =>
                bump({ type: e.target.value as Outcome["type"] })
              }
              value={outcome.type}
            >
              <option value="category">Categorical (pass / fail / …)</option>
              <option value="percentage">Exam percentage</option>
            </Select>
          )}
        </Field>
        <PassingField onChange={bump} outcome={outcome} />
      </div>
      {outcome.type === "category" ? (
        <Field hint="One category per line." label="Categories">
          {(props) => (
            <TextArea
              {...props}
              onChange={(e) => bump({ options: e.target.value.split("\n") })}
              value={outcome.options.join("\n")}
            />
          )}
        </Field>
      ) : null}
      <Toggle
        checked={outcome.required}
        description="Attendees are marked complete only once every required outcome passes."
        label="Required for completion"
        onChange={(required) => bump({ required })}
      />
      <p className="m-0 text-slate-400 text-xs">
        Rule version {outcome.version}. Grading changes start a new version.
      </p>
    </div>
  );
}

function OutcomesSection({ value, onChange }: SectionProps) {
  const add = () =>
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
    });
  return (
    <div className="space-y-3">
      <SectionHeading
        action={
          <Button onClick={add} size="xs" type="button" variant="secondary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add outcome
          </Button>
        }
        description="Staff-only grading rules recorded on the roster. Attendees never see these."
        title="Outcome rules"
      />
      {value.outcomes.length === 0 ? (
        <EmptyState
          className="py-8"
          description="Add an exam score or skills check to track completion."
          title="No outcome rules"
        />
      ) : null}
      {value.outcomes.map((o) => (
        <OutcomeCard
          key={o.id}
          onChange={(patch) =>
            onChange({
              ...value,
              outcomes: patchById(value.outcomes, o.id, patch),
            })
          }
          onRemove={() =>
            onChange({
              ...value,
              outcomes: value.outcomes.filter((entry) => entry.id !== o.id),
            })
          }
          outcome={o}
        />
      ))}
    </div>
  );
}

/* ----------------------------------- Emails ----------------------------------- */

type OffsetUnit = "days" | "hours";
type Direction = "before" | "after";

function unitFor(minutes: number): OffsetUnit {
  return minutes !== 0 && minutes % MINUTES_PER_DAY === 0 ? "days" : "hours";
}
function directionFor(minutes: number, fallback: Direction): Direction {
  if (minutes === 0) {
    return fallback;
  }
  return minutes < 0 ? "before" : "after";
}
function toMinutes(amount: number, unit: OffsetUnit, direction: Direction) {
  const size = unit === "days" ? MINUTES_PER_DAY : MINUTES_PER_HOUR;
  const magnitude = Math.round(Math.abs(amount) * size);
  return direction === "before" ? -magnitude : magnitude;
}

function OffsetFields({
  offsetMinutes,
  onChange,
}: {
  offsetMinutes: number;
  onChange: (offsetMinutes: number) => void;
}) {
  const [unit, setUnit] = useState<OffsetUnit>(() => unitFor(offsetMinutes));
  const [fallbackDirection, setFallbackDirection] =
    useState<Direction>("before");
  const direction = directionFor(offsetMinutes, fallbackDirection);
  const size = unit === "days" ? MINUTES_PER_DAY : MINUTES_PER_HOUR;
  const amount = Math.abs(offsetMinutes) / size;
  return (
    <>
      <Field label="Amount">
        {(props) => (
          <TextInput
            {...props}
            inputMode="decimal"
            min={0}
            onChange={(e) =>
              onChange(toMinutes(Number(e.target.value), unit, direction))
            }
            step="any"
            type="number"
            value={Number.isInteger(amount) ? amount : amount.toFixed(2)}
          />
        )}
      </Field>
      <Field label="Unit">
        {(props) => (
          <Select
            {...props}
            onChange={(e) => {
              const next = e.target.value as OffsetUnit;
              setUnit(next);
              onChange(toMinutes(amount, next, direction));
            }}
            value={unit}
          >
            <option value="days">Days</option>
            <option value="hours">Hours</option>
          </Select>
        )}
      </Field>
      <Field label="Timing">
        {(props) => (
          <Select
            {...props}
            onChange={(e) => {
              const next = e.target.value as Direction;
              setFallbackDirection(next);
              onChange(toMinutes(amount, unit, next));
            }}
            value={direction}
          >
            <option value="before">Before</option>
            <option value="after">After</option>
          </Select>
        )}
      </Field>
    </>
  );
}

function EmailStepCard({
  step,
  onChange,
  onRemove,
}: {
  step: EmailStep;
  onChange: (patch: Partial<EmailStep>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-4">
          <OffsetFields
            offsetMinutes={step.offsetMinutes}
            onChange={(offsetMinutes) => onChange({ offsetMinutes })}
          />
          <Field label="Anchor">
            {(props) => (
              <Select
                {...props}
                onChange={(e) =>
                  onChange({ anchor: e.target.value as EmailStep["anchor"] })
                }
                value={step.anchor}
              >
                <option value="first">First meeting</option>
                <option value="last">Last meeting</option>
                <option value="registration">Registration</option>
              </Select>
            )}
          </Field>
        </div>
        <div className="pt-6">
          <RemoveButton label="Remove email step" onClick={onRemove} />
        </div>
      </div>
      <Field label="Subject" required>
        {(props) => (
          <TextInput
            {...props}
            onChange={(e) => onChange({ subject: e.target.value })}
            value={step.subject}
          />
        )}
      </Field>
      <Field
        hint="Paragraphs are formatted safely; HTML is shown as plain text."
        label="Body"
        required
      >
        {(props) => (
          <TextArea
            {...props}
            className="min-h-32"
            onChange={(e) => onChange({ body: e.target.value })}
            value={step.body}
          />
        )}
      </Field>
      <EmailPreview body={step.body} subject={step.subject} />
    </div>
  );
}

function EmailsSection({ value, onChange }: SectionProps) {
  const add = () =>
    onChange({
      ...value,
      emails: [
        ...value.emails,
        {
          id: crypto.randomUUID(),
          anchor: "first",
          offsetMinutes: -MINUTES_PER_DAY,
          subject: "Your class is tomorrow",
          body: "Hello {{attendeeName}}, view your class details in your portal.",
        },
      ],
    });
  return (
    <div className="space-y-3">
      <SectionHeading
        action={
          <Button onClick={add} size="xs" type="button" variant="secondary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add email step
          </Button>
        }
        description="Scheduled messages sent to each active attendee relative to the class."
        title="Email steps"
      />
      <Notice tone="info">
        <p className="m-0 font-medium">Merge fields</p>
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
          {MERGE_FIELDS.map((f) => (
            <li key={f.key}>
              <Badge title={f.help} tone="info">
                <code className="font-mono">{`{{${f.key}}}`}</code>
              </Badge>
            </li>
          ))}
        </ul>
      </Notice>
      {value.emails.length === 0 ? (
        <EmptyState
          className="py-8"
          description="Reminders and follow-ups are queued automatically for every seat."
          title="No email steps"
        />
      ) : null}
      {value.emails.map((step) => (
        <EmailStepCard
          key={step.id}
          onChange={(patch) =>
            onChange({
              ...value,
              emails: patchById(value.emails, step.id, patch),
            })
          }
          onRemove={() =>
            onChange({
              ...value,
              emails: value.emails.filter((entry) => entry.id !== step.id),
            })
          }
          step={step}
        />
      ))}
    </div>
  );
}

/* ------------------------------------ Root ------------------------------------ */

const SECTIONS: Record<ConfigSection, (props: SectionProps) => ReactNode> = {
  pricing: PricingSection,
  questions: QuestionsSection,
  outcomes: OutcomesSection,
  emails: EmailsSection,
};

/**
 * Edits course or session settings. Pass `section` to render one group (for use
 * inside tabs); omit it to render every section with headings.
 */
export function ConfigEditor({
  value,
  onChange,
  section,
}: SectionProps & { section?: ConfigSection }) {
  if (section) {
    const Section = SECTIONS[section];
    return <Section onChange={onChange} value={value} />;
  }
  return (
    <div className="space-y-8">
      <PricingSection onChange={onChange} value={value} />
      <QuestionsSection onChange={onChange} value={value} />
      <OutcomesSection onChange={onChange} value={value} />
      <EmailsSection onChange={onChange} value={value} />
    </div>
  );
}
