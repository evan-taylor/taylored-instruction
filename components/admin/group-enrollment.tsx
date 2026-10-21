"use client";
import { useAction, useMutation } from "convex/react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  useCourses,
  useOrganizations,
  useSessions,
} from "@/components/registration/catalog";
import {
  formatMeeting,
  formatWeekday,
  pluralize,
} from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Field,
  Money,
  MoneyInput,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui/field";
import { Notice, ResultNotice } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  ADMIN_MAX_SEATS,
  type Attendee,
  effective,
  quote,
  type Settings,
} from "@/shared/registration/domain";
import {
  parseRoster,
  type RosterRow,
  rosterSummary,
} from "@/shared/registration/roster";
import {
  emptyInvoiceDraft,
  type InvoiceDraft,
  InvoiceFields,
} from "./invoices";
import {
  emptyOrganization,
  type OrganizationDraft,
  OrganizationFields,
} from "./organization-form";

type Payment = "invoice" | "offline" | "waived" | "unpaid";
type Step = "offering" | "roster" | "pricing" | "billing" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "offering", label: "Class" },
  { id: "roster", label: "Roster" },
  { id: "pricing", label: "Pricing" },
  { id: "billing", label: "Billing" },
  { id: "review", label: "Review" },
];

export type EnrollmentPrefill = {
  requestId?: Id<"registrationGroupRequests">;
  organization?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  organizationId?: Id<"registrationOrganizations">;
};
type Result = {
  orderId: Id<"registrationOrders">;
  total: number;
  status: string;
  invoiceUrl?: string;
  warning?: string;
};

function stepClass(position: number, current: number) {
  if (position === current) {
    return "bg-primary text-white";
  }
  return position < current
    ? "bg-emerald-50 text-emerald-800"
    : "bg-slate-100 text-slate-500";
}
function Stepper({ current }: { current: Step }) {
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <ol aria-label="Steps" className="m-0 flex list-none flex-wrap gap-2 p-0">
      {STEPS.map((step, i) => (
        <li
          aria-current={step.id === current ? "step" : undefined}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs ${stepClass(i, index)}`}
          key={step.id}
        >
          <span className="font-semibold tabular-nums">{i + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function useOffering(
  mode: "session" | "course",
  sessionId: string,
  courseId: string
) {
  const sessions = useSessions();
  const courses = useCourses();
  const session = sessions?.find((s) => s._id === sessionId);
  const course = courses?.find(
    (c) => c._id === (mode === "session" ? session?.courseId : courseId)
  );
  const config: Settings | null = course
    ? effective(
        course.settings,
        mode === "session" ? (session?.overrides ?? {}) : {}
      )
    : null;
  return { sessions, courses, session, course, config };
}

function OfferingStep({
  mode,
  setMode,
  sessionId,
  setSessionId,
  courseId,
  setCourseId,
  sessions,
  courses,
  config,
  session,
}: {
  mode: "session" | "course";
  setMode: (m: "session" | "course") => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  courseId: string;
  setCourseId: (id: string) => void;
  sessions: Doc<"registrationSessions">[] | undefined;
  courses: Doc<"registrationCourses">[] | undefined;
  config: Settings | null;
  session: Doc<"registrationSessions"> | undefined;
}) {
  const upcoming = (sessions ?? [])
    .filter((s) => s.state === "open" && s.lastEnd > Date.now())
    .sort((a, b) => a.firstStart - b.firstStart);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["session", "course"] as const).map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
              mode === option
                ? "border-primary bg-primary/5"
                : "border-slate-200 hover:border-slate-300"
            }`}
            key={option}
          >
            <input
              checked={mode === option}
              className="mt-0.5 accent-primary"
              name="offering-mode"
              onChange={() => setMode(option)}
              type="radio"
            />
            <span>
              <span className="block font-medium text-slate-900">
                {option === "session"
                  ? "Scheduled session"
                  : "Self-paced course"}
              </span>
              <span className="block text-slate-500 text-xs">
                {option === "session"
                  ? "A dated class, public or private. Seats count against its capacity."
                  : "Online access delivered after payment; no dates or capacity."}
              </span>
            </span>
          </label>
        ))}
      </div>
      {mode === "session" ? (
        <Field
          hint="Private or admin-only sessions work well for dedicated group classes."
          label="Session"
          required
        >
          {(p) => (
            <Select
              {...p}
              onChange={(e) => setSessionId(e.target.value)}
              value={sessionId}
            >
              <option value="">Choose a session…</option>
              {upcoming.map((s) => (
                <option key={s._id} value={s._id}>
                  {formatWeekday(s.firstStart, s.timeZone)} · {s.title} ·{" "}
                  {Math.max(0, s.capacity - s.reserved)} open · {s.visibility}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : (
        <Field label="Course" required>
          {(p) => (
            <Select
              {...p}
              onChange={(e) => setCourseId(e.target.value)}
              value={courseId}
            >
              <option value="">Choose a self-paced course…</option>
              {courses
                ?.filter((c) => c.delivery === "self-paced")
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} · {c.publication}
                  </option>
                ))}
            </Select>
          )}
        </Field>
      )}
      {config ? (
        <Card>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">
                Tuition
              </p>
              <p className="font-semibold text-slate-900">
                <Money cents={config.tuition} /> per seat
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">
                Materials
              </p>
              <p className="text-slate-900">
                {config.materials.length
                  ? config.materials
                      .map((m) => `${m.title} (${m.policy})`)
                      .join(", ")
                  : "None"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">
                {session ? "Schedule" : "Questions"}
              </p>
              <p className="text-slate-900">
                {session
                  ? session.meetings
                      .map((m) => formatMeeting(m, session.timeZone))
                      .join("; ")
                  : pluralize(config.questions.length, "question")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function RosterStep({
  text,
  setText,
  rows,
  onRemove,
  available,
  overbook,
  setOverbook,
}: {
  text: string;
  setText: (value: string) => void;
  rows: RosterRow[];
  onRemove: (key: string) => void;
  available: number | null;
  overbook: boolean;
  setOverbook: (value: boolean) => void;
}) {
  const summary = rosterSummary(rows);
  const exceeds = available !== null && summary.ready > available;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Field
        hint='One attendee per line: "Jane Doe, jane@example.com". Name <email> and tab-separated spreadsheets paste fine. A header row is ignored.'
        label="Paste the roster"
        required
      >
        {(p) => (
          <TextArea
            {...p}
            className="min-h-64 font-mono text-xs"
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "Jane Doe, jane@example.com\nJohn Smith, john@example.com"
            }
            value={text}
          />
        )}
      </Field>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">{summary.ready} ready</Badge>
          {summary.problems ? (
            <Badge tone="danger">{summary.problems} need fixing</Badge>
          ) : null}
          {available === null ? null : (
            <Badge tone={exceeds ? "warning" : "neutral"}>
              {available} seats open
            </Badge>
          )}
          <span className="text-slate-500 text-xs">
            Up to {ADMIN_MAX_SEATS} attendees per order.
          </span>
        </div>
        {rows.length ? (
          <Table wrapperClassName="max-h-72 overflow-y-auto">
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH className="text-right">Remove</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR
                  className={row.issue ? "bg-rose-50/60" : undefined}
                  key={row.key}
                >
                  <TD>
                    {row.name || <span className="text-rose-700">Missing</span>}
                  </TD>
                  <TD>
                    <span className="font-mono text-xs">
                      {row.email || "—"}
                    </span>
                    {row.issue ? (
                      <div className="text-rose-700 text-xs">{row.issue}</div>
                    ) : null}
                  </TD>
                  <TD className="text-right">
                    <Button
                      aria-label={`Remove ${row.name || row.email}`}
                      onClick={() => onRemove(row.key)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <Notice tone="info">
            Attendees appear here as you paste. Fix any flagged rows before
            continuing.
          </Notice>
        )}
        {exceeds ? (
          <Toggle
            checked={overbook}
            description="Allowed for staff with an audited reason. The room must actually fit everyone."
            label={`Overbook this session by ${summary.ready - (available ?? 0)}`}
            onChange={setOverbook}
          />
        ) : null}
      </div>
    </div>
  );
}

function QuestionInputs({
  config,
  answers,
  setAnswers,
}: {
  config: Settings;
  answers: Record<string, string | boolean>;
  setAnswers: (value: Record<string, string | boolean>) => void;
}) {
  if (!config.questions.length) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Attendee questions</CardTitle>
          <p className="text-slate-500 text-sm">
            Answers below are recorded for every attendee in this group.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {config.questions.map((q) =>
          q.type === "checkbox" ? (
            <Toggle
              checked={answers[q.id] === true}
              key={q.id}
              label={`${q.title}${q.required ? " (required)" : ""}`}
              onChange={(checked) =>
                setAnswers({ ...answers, [q.id]: checked })
              }
            />
          ) : (
            <Field key={q.id} label={q.title} required={q.required}>
              {(p) =>
                q.type === "choice" ? (
                  <Select
                    {...p}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                    value={String(answers[q.id] ?? "")}
                  >
                    <option value="">Choose…</option>
                    {q.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                ) : (
                  <TextInput
                    {...p}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                    value={String(answers[q.id] ?? "")}
                  />
                )
              }
            </Field>
          )
        )}
      </CardContent>
    </Card>
  );
}

function PricingStep({
  config,
  custom,
  setCustom,
  tuition,
  setTuition,
  note,
  setNote,
  selected,
  setSelected,
  waived,
  setWaived,
  coupon,
  setCoupon,
  answers,
  setAnswers,
  seats,
  estimate,
  estimateError,
}: {
  config: Settings;
  custom: boolean;
  setCustom: (v: boolean) => void;
  tuition: number;
  setTuition: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  selected: string[];
  setSelected: (v: string[]) => void;
  waived: string[];
  setWaived: (v: string[]) => void;
  coupon: string;
  setCoupon: (v: string) => void;
  answers: Record<string, string | boolean>;
  setAnswers: (v: Record<string, string | boolean>) => void;
  seats: number;
  estimate: number | null;
  estimateError: string;
}) {
  const toggleIn = (list: string[], id: string, on: boolean) =>
    on ? [...list, id] : list.filter((x) => x !== id);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tuition</CardTitle>
              <p className="text-slate-500 text-sm">
                Template price is <Money cents={config.tuition} /> per seat.
                Negotiated group rates are recorded on the order and in the
                audit log.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              checked={custom}
              label="Use a custom group price per seat"
              onChange={setCustom}
            />
            {custom ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price per seat" required>
                  {(p) => (
                    <MoneyInput {...p} onChange={setTuition} value={tuition} />
                  )}
                </Field>
                <Field
                  hint="Required. Example: volume rate for 20+ staff."
                  label="Why this price?"
                  required
                >
                  {(p) => (
                    <TextInput
                      {...p}
                      onChange={(e) => setNote(e.target.value)}
                      value={note}
                    />
                  )}
                </Field>
              </div>
            ) : null}
          </CardContent>
        </Card>
        {config.materials.length ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Materials for every attendee</CardTitle>
                <p className="text-slate-500 text-sm">
                  Included materials are always delivered. Choose add-ons and
                  waivers for the whole group.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.materials.map((m) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm"
                  key={m.id}
                >
                  <div>
                    <span className="font-medium text-slate-900">
                      {m.title}
                    </span>
                    <span className="ml-2 text-slate-500 text-xs capitalize">
                      {m.policy === "waivable"
                        ? "Required, waivable"
                        : m.policy}{" "}
                      · <Money cents={m.cents} />
                    </span>
                  </div>
                  {m.policy === "included" ? (
                    <Badge tone="success">Included</Badge>
                  ) : (
                    <Toggle
                      checked={
                        m.policy === "optional"
                          ? selected.includes(m.id)
                          : waived.includes(m.id)
                      }
                      label={
                        m.policy === "optional"
                          ? "Add for everyone"
                          : "Everyone already has this material"
                      }
                      onChange={(on) =>
                        m.policy === "optional"
                          ? setSelected(toggleIn(selected, m.id, on))
                          : setWaived(toggleIn(waived, m.id, on))
                      }
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <QuestionInputs
          answers={answers}
          config={config}
          setAnswers={setAnswers}
        />
        <Field
          hint="Applied at submission. Coupon uses count discounted seats; the estimate excludes it."
          label="Coupon code"
        >
          {(p) => (
            <TextInput
              {...p}
              className="max-w-xs uppercase"
              onChange={(e) => setCoupon(e.target.value)}
              value={coupon}
            />
          )}
        </Field>
      </div>
      <Card className="self-start lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Estimate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Attendees</span>
            <span className="tabular-nums">{seats}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Per seat</span>
            <span className="tabular-nums">
              {estimate !== null && seats > 0 ? (
                <Money cents={Math.round(estimate / seats)} />
              ) : (
                "—"
              )}
            </span>
          </div>
          <div className="flex justify-between border-slate-200 border-t pt-2 font-semibold text-slate-900">
            <span>Total</span>
            <span className="tabular-nums">
              {estimate === null ? "—" : <Money cents={estimate} />}
            </span>
          </div>
          {estimateError ? (
            <p className="text-rose-700 text-xs">{estimateError}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function BillingStep({
  organizations,
  organizationId,
  setOrganizationId,
  newOrganization,
  setNewOrganization,
  purchaserName,
  setPurchaserName,
  purchaserEmail,
  setPurchaserEmail,
  payment,
  setPayment,
  invoice,
  setInvoice,
  reason,
  setReason,
}: {
  organizations: Doc<"registrationOrganizations">[] | undefined;
  organizationId: Id<"registrationOrganizations"> | "new" | "";
  setOrganizationId: (v: Id<"registrationOrganizations"> | "new" | "") => void;
  newOrganization: OrganizationDraft;
  setNewOrganization: (v: OrganizationDraft) => void;
  purchaserName: string;
  setPurchaserName: (v: string) => void;
  purchaserEmail: string;
  setPurchaserEmail: (v: string) => void;
  payment: Payment;
  setPayment: (v: Payment) => void;
  invoice: InvoiceDraft;
  setInvoice: (v: InvoiceDraft) => void;
  reason: string;
  setReason: (v: string) => void;
}) {
  const options: { id: Payment; title: string; detail: string }[] = [
    {
      id: "invoice",
      title: "Send an invoice",
      detail:
        "Net terms with a hosted pay link and PDF. Seats are reserved; materials release when it is paid.",
    },
    {
      id: "offline",
      title: "Payment already received",
      detail:
        "Settle now (check, ACH, card over the phone). Materials are delivered immediately.",
    },
    {
      id: "waived",
      title: "Waive payment",
      detail:
        "No charge. Use for sponsored or make-up training. Materials are delivered immediately.",
    },
    {
      id: "unpaid",
      title: "Hold seats, decide later",
      detail:
        "Reserve capacity without billing. Appears in the attention queue until resolved.",
    },
  ];
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Organization</CardTitle>
            <p className="text-slate-500 text-sm">
              Links this order and its invoices to a company so you can find
              them later.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Organization">
            {(p) => (
              <Select
                {...p}
                onChange={(e) =>
                  setOrganizationId(
                    e.target.value as
                      | Id<"registrationOrganizations">
                      | "new"
                      | ""
                  )
                }
                value={organizationId}
              >
                <option value="">No organization</option>
                <option value="new">＋ Create a new organization</option>
                {organizations
                  ?.filter((o) => !o.archived)
                  .map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          {organizationId === "new" ? (
            <OrganizationFields
              compact
              onChange={setNewOrganization}
              value={newOrganization}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              hint="Receives the receipt and purchaser portal access."
              label="Purchaser name"
              required
            >
              {(p) => (
                <TextInput
                  {...p}
                  onChange={(e) => setPurchaserName(e.target.value)}
                  value={purchaserName}
                />
              )}
            </Field>
            <Field label="Purchaser email" required>
              {(p) => (
                <TextInput
                  {...p}
                  onChange={(e) => setPurchaserEmail(e.target.value)}
                  type="email"
                  value={purchaserEmail}
                />
              )}
            </Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
                  payment === option.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                key={option.id}
              >
                <input
                  checked={payment === option.id}
                  className="mt-0.5 accent-primary"
                  name="payment"
                  onChange={() => setPayment(option.id)}
                  type="radio"
                />
                <span>
                  <span className="block font-medium text-slate-900">
                    {option.title}
                  </span>
                  <span className="block text-slate-500 text-xs">
                    {option.detail}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {payment === "invoice" ? (
            <InvoiceFields onChange={setInvoice} value={invoice} />
          ) : null}
          <Field
            hint="Recorded in the audit log with this enrollment."
            label="Reason / internal note"
            required
          >
            {(p) => (
              <TextInput
                {...p}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Group booking for Acme Dental, PO 1042"
                value={reason}
              />
            )}
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({
  title,
  seats,
  estimate,
  payment,
  purchaserEmail,
  organizationName,
  overbook,
  invoice,
  custom,
  tuition,
}: {
  title: string;
  seats: number;
  estimate: number | null;
  payment: Payment;
  purchaserEmail: string;
  organizationName: string;
  overbook: boolean;
  invoice: InvoiceDraft;
  custom: boolean;
  tuition: number;
}) {
  const paymentLabel: Record<Payment, string> = {
    invoice: `Invoice ${invoice.billToEmail} · ${invoice.dueDays === 0 ? "due on receipt" : `net ${invoice.dueDays}`}`,
    offline: "Payment received offline; settle immediately",
    waived: "Payment waived; settle immediately",
    unpaid: "Hold seats unpaid",
  };
  return (
    <Card>
      <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Class
          </p>
          <p className="font-medium text-slate-900">{title}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Attendees
          </p>
          <p className="font-medium text-slate-900">
            {seats}
            {overbook ? (
              <Badge className="ml-2" tone="warning">
                Overbooking
              </Badge>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Pricing
          </p>
          <p className="font-medium text-slate-900">
            {custom ? (
              <>
                Custom <Money cents={tuition} /> per seat
              </>
            ) : (
              "Template pricing"
            )}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Estimated total
          </p>
          <p className="font-semibold text-slate-900">
            {estimate === null ? "—" : <Money cents={estimate} />}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Purchaser
          </p>
          <p className="font-medium text-slate-900">{purchaserEmail}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Organization
          </p>
          <p className="font-medium text-slate-900">
            {organizationName || "None"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-slate-500 text-xs uppercase tracking-wide">
            Payment
          </p>
          <p className="font-medium text-slate-900">{paymentLabel[payment]}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: Result;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-8 text-center">
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto h-10 w-10 text-emerald-600"
        />
        <div>
          <h2 className="font-semibold text-slate-900 text-xl">
            Group enrolled
          </h2>
          <p className="mt-1 text-slate-600 text-sm">
            Order subtotal before tax <Money cents={result.total} /> ·{" "}
            {result.status === "settled"
              ? "paid and materials delivering"
              : "awaiting payment"}
          </p>
        </div>
        {result.invoiceUrl ? (
          <div className="mx-auto max-w-md space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
            <p className="font-medium text-slate-900">
              Invoice created with a hosted pay link. Email delivery is queued.
            </p>
            <div className="flex items-center gap-2">
              <a
                className="truncate text-primary text-xs hover:underline"
                href={result.invoiceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {result.invoiceUrl}
              </a>
              <CopyButton value={result.invoiceUrl} />
            </div>
          </div>
        ) : null}
        {result.warning ? (
          <Notice tone="warning">{result.warning}</Notice>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            href={`/admin/registrations?order=${result.orderId}`}
            size="sm"
            variant="secondary"
          >
            Open order
          </Button>
          <Button
            href="/admin/groups?tab=invoices"
            size="sm"
            variant="secondary"
          >
            Invoices
          </Button>
          <Button onClick={onReset} size="sm" type="button">
            Enroll another group
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function stepValid(
  step: Step,
  state: {
    offeringReady: boolean;
    rosterReady: boolean;
    pricingReady: boolean;
    billingReady: boolean;
  }
) {
  switch (step) {
    case "offering":
      return state.offeringReady;
    case "roster":
      return state.rosterReady;
    case "pricing":
      return state.pricingReady;
    case "billing":
      return state.billingReady;
    default:
      return true;
  }
}

function estimateTotal(pricing: Settings | null, attendees: Attendee[]) {
  if (!(pricing && attendees.length)) {
    return { estimate: null, estimateError: "" };
  }
  try {
    const estimate = quote(pricing, attendees, null, 0, ADMIN_MAX_SEATS).reduce(
      (sum, s) => sum + s.total,
      0
    );
    return { estimate, estimateError: "" };
  } catch (error) {
    return {
      estimate: null,
      estimateError: error instanceof Error ? error.message : String(error),
    };
  }
}
type ValidityInput = {
  offering: boolean;
  rows: RosterRow[];
  available: number | null;
  overbook: boolean;
  estimateError: string;
  custom: boolean;
  note: string;
  purchaserName: string;
  purchaserEmail: string;
  reason: string;
  organizationId: string;
  newOrganizationName: string;
  payment: Payment;
  invoice: InvoiceDraft;
};
function computeValidity(input: ValidityInput) {
  const ready = input.rows.filter((r) => !r.issue).length;
  const fits =
    input.available === null || ready <= input.available || input.overbook;
  const organizationOk =
    input.organizationId !== "new" ||
    input.newOrganizationName.trim().length > 0;
  const address = input.invoice;
  const invoiceOk =
    input.payment !== "invoice" ||
    (address.billToName.trim().length > 0 &&
      address.billToEmail.includes("@") &&
      address.billToAddress.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.state.trim().length > 0 &&
      address.postalCode.trim().length > 0);
  return {
    offeringReady: input.offering,
    rosterReady:
      ready > 0 &&
      ready === input.rows.length &&
      ready <= ADMIN_MAX_SEATS &&
      fits,
    pricingReady:
      !input.estimateError && (!input.custom || input.note.trim().length > 0),
    billingReady:
      input.purchaserName.trim().length > 0 &&
      input.purchaserEmail.includes("@") &&
      input.reason.trim().length > 0 &&
      organizationOk &&
      invoiceOk,
  };
}
type EnrollmentInput = {
  course: Doc<"registrationCourses">;
  sessionId?: Id<"registrationSessions">;
  purchaserEmail: string;
  purchaserName: string;
  attendees: Attendee[];
  coupon: string;
  overbook: boolean;
  reason: string;
  payment: Payment;
  custom: boolean;
  tuition: number;
  note: string;
  organizationId: Id<"registrationOrganizations"> | "new" | "";
  newOrganization: OrganizationDraft;
  invoice: InvoiceDraft;
  requestId?: Id<"registrationGroupRequests">;
};
type EnrollmentActions = {
  reserve: ReturnType<typeof useMutation<typeof api.registration.reserve>>;
  saveOrganization: ReturnType<
    typeof useMutation<typeof api.registrationGroups.saveOrganization>
  >;
  createInvoice: ReturnType<
    typeof useMutation<typeof api.registrationGroups.createInvoice>
  >;
  issue: ReturnType<
    typeof useAction<typeof api.registrationInvoiceActions.issue>
  >;
  updateRequest: ReturnType<
    typeof useMutation<typeof api.registrationGroups.updateGroupRequest>
  >;
};
async function attachInvoice(
  input: EnrollmentInput,
  act: EnrollmentActions,
  outcome: Result,
  organizationId?: Id<"registrationOrganizations">
) {
  if (outcome.total <= 0) {
    outcome.warning =
      "The order total is $0, so no invoice was created; the enrollment settled as free.";
    return;
  }
  try {
    const invoiceId = await act.createInvoice({
      orderId: outcome.orderId,
      ...input.invoice,
      organizationId,
    });
    outcome.invoiceUrl = await act.issue({ id: invoiceId });
  } catch (error) {
    outcome.warning = `Enrollment saved, but the invoice could not be sent: ${String(error)}. Create it from the Invoices tab.`;
  }
}
async function performEnrollment(
  input: EnrollmentInput,
  act: EnrollmentActions,
  attempt: { key: string; organizationId?: Id<"registrationOrganizations"> }
): Promise<Result> {
  const organizationId =
    input.organizationId === "new"
      ? (attempt.organizationId ??
        (await act.saveOrganization(input.newOrganization)))
      : input.organizationId || undefined;
  attempt.organizationId = organizationId;
  const reserved = await act.reserve({
    courseId: input.course._id,
    sessionId: input.sessionId,
    requestKey: attempt.key,
    purchaser: input.purchaserEmail,
    purchaserName: input.purchaserName,
    attendees: input.attendees,
    coupon: input.coupon.trim() || undefined,
    admin: {
      overbook: input.overbook,
      reason: input.reason,
      payment: input.payment === "invoice" ? "unpaid" : input.payment,
      tuition: input.custom ? input.tuition : undefined,
      pricingNote: input.custom ? input.note : undefined,
      organizationId,
    },
  });
  const outcome: Result = {
    orderId: reserved.orderId,
    total: reserved.total,
    status: reserved.status,
  };
  if (input.payment === "invoice") {
    await attachInvoice(input, act, outcome, organizationId);
  }
  if (input.requestId) {
    try {
      await act.updateRequest({
        id: input.requestId,
        status: "scheduled",
        internalNotes: `Enrolled via group wizard; order ${reserved.orderId}`,
        organizationId,
        orderId: reserved.orderId,
      });
    } catch (error) {
      outcome.warning = `Enrollment saved, but the group request could not be updated: ${String(error)}`;
    }
  }
  return outcome;
}

function useWizardState(prefill?: EnrollmentPrefill) {
  const [step, setStep] = useState<Step>("offering");
  const [mode, setMode] = useState<"session" | "course">("session");
  const [sessionId, setSessionId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [rosterText, setRosterText] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [overbook, setOverbook] = useState(false);
  const [custom, setCustom] = useState(false);
  const [tuition, setTuition] = useState(0);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [waived, setWaived] = useState<string[]>([]);
  const [coupon, setCoupon] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [organizationId, setOrganizationId] = useState<
    Id<"registrationOrganizations"> | "new" | ""
  >(prefill?.organizationId ?? (prefill?.organization ? "new" : ""));
  const [newOrganization, setNewOrganization] = useState<OrganizationDraft>({
    ...emptyOrganization,
    name: prefill?.organization ?? "",
    contactName: prefill?.contactName ?? "",
    contactEmail: prefill?.contactEmail ?? "",
    phone: prefill?.phone ?? "",
  });
  const [purchaserName, setPurchaserName] = useState(
    prefill?.contactName ?? ""
  );
  const [purchaserEmail, setPurchaserEmail] = useState(
    prefill?.contactEmail ?? ""
  );
  const [payment, setPayment] = useState<Payment>("invoice");
  const [invoice, setInvoice] = useState<InvoiceDraft>({
    ...emptyInvoiceDraft,
    billToName: prefill?.organization ?? "",
    billToEmail: prefill?.contactEmail ?? "",
  });
  const [reason, setReason] = useState("");
  return {
    step,
    setStep,
    mode,
    setMode,
    sessionId,
    setSessionId,
    courseId,
    setCourseId,
    rosterText,
    setRosterText,
    removed,
    setRemoved,
    overbook,
    setOverbook,
    custom,
    setCustom,
    tuition,
    setTuition,
    note,
    setNote,
    selected,
    setSelected,
    waived,
    setWaived,
    coupon,
    setCoupon,
    answers,
    setAnswers,
    organizationId,
    setOrganizationId,
    newOrganization,
    setNewOrganization,
    purchaserName,
    setPurchaserName,
    purchaserEmail,
    setPurchaserEmail,
    payment,
    setPayment,
    invoice,
    setInvoice,
    reason,
    setReason,
  };
}
type Wizard = ReturnType<typeof useWizardState>;
type Offering = ReturnType<typeof useOffering>;

function deriveWizard(w: Wizard, offering: Offering, rows: RosterRow[]) {
  const ready = rows.filter((r) => !r.issue);
  const attendees: Attendee[] = ready.map((r) => ({
    name: r.name,
    email: r.email,
    selected: w.selected,
    waived: w.waived,
    answers: Object.entries(w.answers).map(([id, value]) => ({ id, value })),
  }));
  const { config, course, session } = offering;
  const { estimate, estimateError } = estimateTotal(
    config && w.custom ? { ...config, tuition: w.tuition } : config,
    attendees
  );
  const available = session
    ? Math.max(0, session.capacity - session.reserved)
    : null;
  const validity = computeValidity({
    offering: Boolean(course && config && (w.mode === "course" || session)),
    rows,
    available,
    overbook: w.overbook,
    estimateError,
    custom: w.custom,
    note: w.note,
    purchaserName: w.purchaserName,
    purchaserEmail: w.purchaserEmail,
    reason: w.reason,
    organizationId: w.organizationId,
    newOrganizationName: w.newOrganization.name,
    payment: w.payment,
    invoice: w.invoice,
  });
  return { ready, attendees, estimate, estimateError, available, validity };
}
type Derived = ReturnType<typeof deriveWizard>;

function StepBody({
  w,
  offering,
  derived,
  rows,
  organizations,
}: {
  w: Wizard;
  offering: Offering;
  derived: Derived;
  rows: RosterRow[];
  organizations: Doc<"registrationOrganizations">[] | undefined;
}) {
  const { config, course, session } = offering;
  switch (w.step) {
    case "offering":
      return (
        <OfferingStep
          config={config}
          courseId={w.courseId}
          courses={offering.courses}
          mode={w.mode}
          session={session}
          sessionId={w.sessionId}
          sessions={offering.sessions}
          setCourseId={w.setCourseId}
          setMode={w.setMode}
          setSessionId={w.setSessionId}
        />
      );
    case "roster":
      return (
        <RosterStep
          available={derived.available}
          onRemove={(key) => w.setRemoved([...w.removed, key])}
          overbook={w.overbook}
          rows={rows}
          setOverbook={w.setOverbook}
          setText={(value) => {
            w.setRosterText(value);
            w.setRemoved([]);
          }}
          text={w.rosterText}
        />
      );
    case "pricing":
      if (!config) {
        return null;
      }
      return (
        <PricingStep
          answers={w.answers}
          config={config}
          coupon={w.coupon}
          custom={w.custom}
          estimate={derived.estimate}
          estimateError={derived.estimateError}
          note={w.note}
          seats={derived.ready.length}
          selected={w.selected}
          setAnswers={w.setAnswers}
          setCoupon={w.setCoupon}
          setCustom={(on) => {
            w.setCustom(on);
            if (on && w.tuition === 0) {
              w.setTuition(config.tuition);
            }
          }}
          setNote={w.setNote}
          setSelected={w.setSelected}
          setTuition={w.setTuition}
          setWaived={w.setWaived}
          tuition={w.tuition}
          waived={w.waived}
        />
      );
    case "billing":
      return (
        <BillingStep
          invoice={w.invoice}
          newOrganization={w.newOrganization}
          organizationId={w.organizationId}
          organizations={organizations}
          payment={w.payment}
          purchaserEmail={w.purchaserEmail}
          purchaserName={w.purchaserName}
          reason={w.reason}
          setInvoice={w.setInvoice}
          setNewOrganization={w.setNewOrganization}
          setOrganizationId={w.setOrganizationId}
          setPayment={w.setPayment}
          setPurchaserEmail={w.setPurchaserEmail}
          setPurchaserName={w.setPurchaserName}
          setReason={w.setReason}
        />
      );
    default:
      return (
        <ReviewStep
          custom={w.custom}
          estimate={derived.estimate}
          invoice={w.invoice}
          organizationName={
            w.organizationId === "new"
              ? w.newOrganization.name
              : (organizations?.find((o) => o._id === w.organizationId)?.name ??
                "")
          }
          overbook={w.overbook}
          payment={w.payment}
          purchaserEmail={w.purchaserEmail}
          seats={derived.ready.length}
          title={session?.title ?? course?.title ?? ""}
          tuition={w.tuition}
        />
      );
  }
}

function WizardFooter({
  step,
  canContinue,
  busy,
  seats,
  onBack,
  onNext,
  onSubmit,
}: {
  step: Step;
  canContinue: boolean;
  busy: boolean;
  seats: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const index = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center justify-between gap-3 border-slate-200 border-t pt-4">
      <Button
        disabled={index === 0 || busy}
        onClick={onBack}
        size="sm"
        type="button"
        variant="secondary"
      >
        Back
      </Button>
      <div className="flex items-center gap-3">
        <Link
          className="text-slate-500 text-xs hover:text-slate-800"
          href="/admin/registrations"
        >
          Need a single attendee? Use manual enrollment
        </Link>
        {step === "review" ? (
          <Button disabled={busy} onClick={onSubmit} size="sm" type="button">
            {busy ? "Enrolling…" : `Enroll ${pluralize(seats, "attendee")}`}
          </Button>
        ) : (
          <Button
            disabled={!canContinue || busy}
            onClick={onNext}
            size="sm"
            type="button"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

export function GroupEnrollment({ prefill }: { prefill?: EnrollmentPrefill }) {
  const w = useWizardState(prefill);
  const [linkedRequest, setLinkedRequest] = useState(prefill?.requestId);
  const offering = useOffering(w.mode, w.sessionId, w.courseId);
  const organizations = useOrganizations();
  const actions: EnrollmentActions = {
    reserve: useMutation(api.registration.reserve),
    saveOrganization: useMutation(api.registrationGroups.saveOrganization),
    createInvoice: useMutation(api.registrationGroups.createInvoice),
    issue: useAction(api.registrationInvoiceActions.issue),
    updateRequest: useMutation(api.registrationGroups.updateGroupRequest),
  };
  const rows = useMemo(
    () =>
      parseRoster(w.rosterText, (i) => `row-${i}`).filter(
        (r) => !w.removed.includes(r.key)
      ),
    [w.rosterText, w.removed]
  );
  const derived = deriveWizard(w, offering, rows);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const attempt = useRef<{
    key: string;
    organizationId?: Id<"registrationOrganizations">;
  }>({ key: crypto.randomUUID() });
  const index = STEPS.findIndex((s) => s.id === w.step);

  async function submit() {
    const { course, session } = offering;
    if (!course) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      setResult(
        await performEnrollment(
          {
            ...w,
            course,
            sessionId: w.mode === "session" ? session?._id : undefined,
            attendees: derived.attendees,
            requestId: linkedRequest,
          },
          actions,
          attempt.current
        )
      );
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <ResultPanel
        onReset={() => {
          attempt.current = { key: crypto.randomUUID() };
          setLinkedRequest(undefined);
          setResult(null);
          w.setStep("offering");
          w.setRosterText("");
          w.setRemoved([]);
          w.setCoupon("");
          w.setReason("");
        }}
        result={result}
      />
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Stepper current={w.step} />
        {prefill?.requestId ? (
          <Badge tone="info">Started from a group request</Badge>
        ) : null}
      </div>
      <StepBody
        derived={derived}
        offering={offering}
        organizations={organizations}
        rows={rows}
        w={w}
      />
      {w.step === "review" && w.overbook ? (
        <Notice tone="warning">
          <span className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            This enrollment exceeds the session capacity. The overbook is
            recorded with your reason.
          </span>
        </Notice>
      ) : null}
      <ResultNotice message={message} />
      <WizardFooter
        busy={busy}
        canContinue={stepValid(w.step, derived.validity)}
        onBack={() =>
          w.setStep(STEPS[Math.max(0, index - 1)]?.id ?? "offering")
        }
        onNext={() => w.setStep(STEPS[index + 1]?.id ?? "review")}
        onSubmit={submit}
        seats={derived.ready.length}
        step={w.step}
      />
    </div>
  );
}
