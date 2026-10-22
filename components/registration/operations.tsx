"use client";
import { useAction, useMutation, useQuery } from "convex/react";
import { ExternalLink } from "lucide-react";
import type * as React from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useCourses, useSessions } from "@/components/registration/catalog";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  Field,
  Money,
  MoneyInput,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui/field";
import { Notice, ResultNotice, Skeleton } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  effective,
  formatMoney,
  type Settings,
} from "@/shared/registration/domain";
import { AssignmentHistory } from "./assignment-history";
import { errorText } from "./errors";
import { formatDate, formatDateTime, pluralize } from "./format";

type Order = Doc<"registrationOrders">;
type Seat = Doc<"registrationSeats">;
type Session = Doc<"registrationSessions">;
type Question = Settings["questions"][number];
export type AdjustmentChoiceValue = "keep" | "collect" | "refund";
type PaymentHandling = "unpaid" | "offline" | "waived";

/** Remaining Stripe amount that can still be refunded on an order. */
/** Amount actually charged: quoted total plus any sales tax Stripe collected. */
export function charged(order: Order) {
  return order.total + (order.tax ?? 0);
}
export function refundable(order: Order) {
  return Math.max(0, charged(order) - order.refunded - order.refundReserved);
}

export function sessionLabel(session: Session) {
  const state = session.state === "open" ? "" : ` · ${session.state}`;
  return `${session.title} — ${session.reserved}/${session.capacity} seats${state}`;
}

/**
 * Stops keyboard events from bubbling to an enclosing Modal, so pressing
 * Escape in a nested confirmation closes only the confirmation.
 */
export function NestedDialogBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const stop = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
      }
    };
    node.addEventListener("keydown", stop);
    return () => node.removeEventListener("keydown", stop);
  }, []);
  return <div ref={ref}>{children}</div>;
}

/**
 * Confirmation that collects the audit reason every admin mutation requires.
 * Runs `onConfirm`, surfaces failures inline, and closes on success.
 */
export function ReasonDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    if (open) {
      setReason("");
      setMissing(false);
      setFailure("");
    }
  }, [open]);
  const confirm = async () => {
    if (!reason.trim()) {
      setMissing(true);
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (error) {
      setFailure(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog
      busy={busy}
      confirmLabel={confirmLabel}
      danger={danger}
      description={description}
      onClose={onClose}
      onConfirm={confirm}
      open={open}
      title={title}
    >
      <div className="space-y-4">
        {children}
        <Field
          error={
            missing ? "A reason is required for the audit log." : undefined
          }
          hint="Recorded in the audit log with your name and the time."
          label="Reason"
          required
        >
          {(props) => (
            <TextArea
              {...props}
              onChange={(e) => {
                setReason(e.target.value);
                setMissing(false);
              }}
              rows={3}
              value={reason}
            />
          )}
        </Field>
        <ResultNotice message={failure} />
      </div>
    </ConfirmDialog>
  );
}

const ADJUSTMENTS: {
  id: AdjustmentChoiceValue;
  label: string;
  hint: string;
}[] = [
  {
    id: "keep",
    label: "Keep original payment",
    hint: "No money changes hands; the new seat carries the amount already paid.",
  },
  {
    id: "collect",
    label: "Collect higher price",
    hint: "Materials for the new session are withheld until the difference is paid.",
  },
  {
    id: "refund",
    label: "Refund lower price",
    hint: "Queues a refund of the difference to the original card.",
  },
];

/** Radio cards for how a transfer handles a tuition difference. */
export function AdjustmentChoice({
  value,
  onChange,
}: {
  value: AdjustmentChoiceValue;
  onChange: (choice: AdjustmentChoiceValue) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-1.5 block font-medium text-slate-700 text-sm">
        Price difference
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {ADJUSTMENTS.map((option) => {
          const id = `${name}-${option.id}`;
          const active = option.id === value;
          return (
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 hover:border-slate-300"
              )}
              htmlFor={id}
              key={option.id}
            >
              <input
                checked={active}
                className="mt-0.5 accent-primary"
                id={id}
                name={name}
                onChange={() => onChange(option.id)}
                type="radio"
                value={option.id}
              />
              <span>
                <span className="block font-medium text-slate-800">
                  {option.label}
                </span>
                <span className="block text-slate-500 text-xs">
                  {option.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Manual enrollment                                                   */
/* ------------------------------------------------------------------ */

const PAYMENT_OPTIONS: { id: PaymentHandling; label: string; hint: string }[] =
  [
    {
      id: "unpaid",
      label: "Unpaid — reserve capacity and withhold materials",
      hint: "Holds the seat now. Materials are released once a payment is recorded, a card link is paid, or an invoice settles.",
    },
    {
      id: "offline",
      label: "Payment received offline",
      hint: "Marks the order paid immediately (check, cash, or a PO already settled) and queues material delivery.",
    },
    {
      id: "waived",
      label: "Waive payment",
      hint: "No payment will be collected. Materials are delivered right away and the waiver is audited.",
    },
  ];

type Answers = Record<string, string | boolean>;

export function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const policy = question.policyUrl ? (
    <a
      className="text-primary underline"
      href={question.policyUrl}
      rel="noreferrer"
      target="_blank"
    >
      Read policy
    </a>
  ) : undefined;
  if (question.type === "checkbox") {
    return (
      <Toggle
        checked={value === true}
        description={policy}
        label={`${question.title}${question.required ? " (required)" : ""}`}
        onChange={onChange}
      />
    );
  }
  return (
    <Field hint={policy} label={question.title} required={question.required}>
      {(props) =>
        question.type === "choice" ? (
          <Select
            {...props}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            value={String(value ?? "")}
          >
            <option value="">Choose an answer</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <TextInput
            {...props}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            value={String(value ?? "")}
          />
        )
      }
    </Field>
  );
}

const EMPTY_ENROLLMENT = {
  sessionId: "",
  name: "",
  email: "",
  answers: {} as Answers,
  payment: "unpaid" as PaymentHandling,
  reason: "",
  overbook: false,
};

function useManualEnrollment() {
  const courses = useCourses();
  const sessions = useSessions();
  const reserve = useMutation(api.registration.reserve);
  const [form, setForm] = useState(EMPTY_ENROLLMENT);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const session = sessions?.find((s) => s._id === form.sessionId);
  const course = courses?.find((c) => c._id === session?.courseId);
  const config = course
    ? effective(course.settings, session?.overrides ?? {})
    : null;
  const update = (patch: Partial<typeof EMPTY_ENROLLMENT>) =>
    setForm((previous) => ({ ...previous, ...patch }));
  const submit = async () => {
    if (!(session && course)) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await reserve({
        courseId: course._id,
        sessionId: session._id,
        purchaser: form.email,
        purchaserName: form.name,
        requestKey: crypto.randomUUID(),
        attendees: [
          {
            name: form.name,
            email: form.email,
            selected: [],
            waived: [],
            answers: Object.entries(form.answers).map(([id, value]) => ({
              id,
              value,
            })),
          },
        ],
        admin: {
          payment: form.payment,
          overbook: form.overbook,
          reason: form.reason,
        },
      });
      setMessage(
        `Enrollment created for ${form.name} (${formatMoney(result.total)}, ${result.status}).`
      );
      update({ name: "", email: "", answers: {} });
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  return { sessions, session, config, form, update, submit, message, busy };
}

/** Staff-created single-seat enrollment with explicit payment handling. */
export function ManualEnrollment() {
  const { sessions, session, config, form, update, submit, message, busy } =
    useManualEnrollment();
  const full = session ? session.reserved >= session.capacity : false;
  const payment = PAYMENT_OPTIONS.find((p) => p.id === form.payment);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field
        hint={
          session
            ? `${session.reserved} of ${session.capacity} seats reserved · ${formatDateTime(session.firstStart, session.timeZone)}`
            : "Seat counts show reserved/capacity."
        }
        label="Session"
        required
      >
        {(props) => (
          <Select
            {...props}
            onChange={(e) => update({ sessionId: e.target.value, answers: {} })}
            required
            value={form.sessionId}
          >
            <option value="">Choose a session</option>
            {sessions?.map((s) => (
              <option key={s._id} value={s._id}>
                {sessionLabel(s)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attendee name" required>
          {(props) => (
            <TextInput
              {...props}
              autoComplete="off"
              onChange={(e) => update({ name: e.target.value })}
              required
              value={form.name}
            />
          )}
        </Field>
        <Field
          hint="Also used as the purchaser for receipts and portal access."
          label="Attendee email"
          required
        >
          {(props) => (
            <TextInput
              {...props}
              autoComplete="off"
              onChange={(e) => update({ email: e.target.value })}
              required
              type="email"
              value={form.email}
            />
          )}
        </Field>
      </div>
      {config?.questions.length ? (
        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          <p className="font-medium text-slate-700 text-sm">
            Registration questions
          </p>
          {config.questions.map((q) => (
            <QuestionInput
              key={q.id}
              onChange={(value) =>
                update({ answers: { ...form.answers, [q.id]: value } })
              }
              question={q}
              value={form.answers[q.id]}
            />
          ))}
        </div>
      ) : null}
      <Notice tone="info">
        Card payments and invoices add sales tax at payment time based on the
        billing address; offline and waived enrollments record the pre-tax total
        only.
      </Notice>
      <Field hint={payment?.hint} label="Payment handling" required>
        {(props) => (
          <Select
            {...props}
            onChange={(e) =>
              update({ payment: e.target.value as PaymentHandling })
            }
            value={form.payment}
          >
            {PAYMENT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        hint="Why this enrollment is being created by staff. Recorded in the audit log."
        label="Reason"
        required
      >
        {(props) => (
          <TextInput
            {...props}
            onChange={(e) => update({ reason: e.target.value })}
            required
            value={form.reason}
          />
        )}
      </Field>
      <Toggle
        checked={form.overbook}
        description="Lets this enrollment exceed the session's capacity."
        label="Allow overbooking"
        onChange={(overbook) => update({ overbook })}
      />
      {form.overbook ? (
        <Notice tone="warning">
          Overbooking may exceed the safe capacity of the room or equipment.
          {full ? " This session is already full." : ""}
        </Notice>
      ) : null}
      {!form.overbook && full ? (
        <Notice tone="info">
          This session is full. Enable overbooking to add this attendee anyway.
        </Notice>
      ) : null}
      <ResultNotice message={message} />
      <div className="flex justify-end">
        <Button disabled={busy} size="sm" type="submit">
          {busy ? "Working…" : "Create enrollment"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Seat operations                                                     */
/* ------------------------------------------------------------------ */

function MaterialRow({
  material,
}: {
  material: Doc<"registrationEntitlements">;
}) {
  const replaceCode = useMutation(api.registrationOperations.replaceCode);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900 text-sm">
            {material.title}
          </span>
          <StatusBadge status={material.state} />
          <Badge>{material.kind}</Badge>
          <span className="text-slate-500 text-xs">v{material.version}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {material.url ? (
            <Button
              href={material.url}
              rel="noreferrer"
              size="xs"
              target="_blank"
              variant="ghost"
            >
              View
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {material.kind === "keycode" ? (
            <Button
              onClick={() => setOpen(true)}
              size="xs"
              type="button"
              variant="secondary"
            >
              Replace code
            </Button>
          ) : null}
        </div>
      </div>
      <AssignmentHistory entitlementId={material._id} />
      <ResultNotice message={message} />
      <ReasonDialog
        confirmLabel="Assign replacement"
        description="Assigns the next available code from inventory. The prior code stays in the assignment history."
        onClose={() => setOpen(false)}
        onConfirm={async (reason) => {
          await replaceCode({ entitlementId: material._id, reason });
          setMessage("Replacement assigned; prior code history retained.");
        }}
        open={open}
        title={`Replace code for ${material.title}`}
      />
    </li>
  );
}

function SeatMaterials({ seat }: { seat: Seat }) {
  const materials = useQuery(api.registrationOperations.seatMaterials, {
    seatId: seat._id,
  });
  const resend = useMutation(api.registrationOperations.resendMaterials);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const resendAccess = async () => {
    setBusy(true);
    setMessage("");
    try {
      await resend({ seatId: seat._id, key: crypto.randomUUID() });
      setMessage("Material access email queued using existing assignments.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-slate-900 text-sm">
          Delivered materials
        </h4>
        <Button
          disabled={busy || !seat.settledAt}
          onClick={resendAccess}
          size="xs"
          title={
            seat.settledAt
              ? undefined
              : "Materials can be resent once the order is paid"
          }
          type="button"
          variant="secondary"
        >
          {busy ? "Working…" : "Resend material access"}
        </Button>
      </div>
      {materials === undefined ? <Skeleton className="h-12" /> : null}
      {materials?.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No materials are attached to this registration.
        </p>
      ) : null}
      {materials?.length ? (
        <ul className="list-none divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white p-0">
          {materials.map((material) => (
            <MaterialRow key={material._id} material={material} />
          ))}
        </ul>
      ) : null}
      <ResultNotice message={message} />
    </section>
  );
}

function SeatActions({ seat }: { seat: Seat }) {
  const order = useQuery(api.registrationOperations.order, {
    orderId: seat.orderId,
  });
  const wholeOrder = Boolean(
    order &&
      (order.status === "unpaid" || order.status === "hold") &&
      order.seats.length > 1
  );
  const cancel = useMutation(api.registrationOperations.cancelSeat);
  const override = useMutation(api.registrationOperations.overrideCompletion);
  const [dialog, setDialog] = useState<"cancel" | "override" | null>(null);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const cancelable = seat.state === "held" || seat.state === "active";
  return (
    <section className="space-y-3">
      <h4 className="font-semibold text-slate-900 text-sm">Registration</h4>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setDialog("override")}
          size="xs"
          type="button"
          variant="secondary"
        >
          Override completion
        </Button>
        <Button
          disabled={!cancelable}
          onClick={() => setDialog("cancel")}
          size="xs"
          title={cancelable ? undefined : `Seat is already ${seat.state}`}
          type="button"
          variant="secondary"
        >
          Cancel registration
        </Button>
      </div>
      <ResultNotice message={message} />
      {seat.state === "held" &&
      order &&
      (order.status === "unpaid" || order.status === "hold") ? (
        <RequestPayment order={order} />
      ) : null}
      <ReasonDialog
        confirmLabel="Cancel registration"
        danger
        description={
          wholeOrder
            ? `Cancels ALL ${order?.seats.length} attendees in this unpaid group and closes its payment links and invoices. This cannot cancel only one attendee.`
            : "Releases this seat and cancels undelivered materials. Cancelling does not refund any payment; use the Payments section to refund."
        }
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await cancel({
            seatId: seat._id,
            reason,
            notify,
            cancelWholeOrder: wholeOrder,
          });
          setMessage(
            "Registration canceled. Payment and delivered codes are unchanged."
          );
        }}
        open={dialog === "cancel"}
        title={
          wholeOrder ? "Cancel entire unpaid group" : `Cancel ${seat.name}`
        }
      >
        <Toggle
          checked={notify}
          description="Sends a cancellation email explaining that refunds are handled separately."
          label="Notify attendee"
          onChange={setNotify}
        />
      </ReasonDialog>
      <ReasonDialog
        confirmLabel="Record override"
        description="Marks this attendee complete regardless of recorded outcomes. The override is audited with your reason."
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await override({ seatId: seat._id, reason, complete: true });
          setMessage("Completion override recorded.");
        }}
        open={dialog === "override"}
        title={`Override completion for ${seat.name}`}
      />
    </section>
  );
}

function TransferPreview({
  seatId,
  sessionId,
}: {
  seatId: Id<"registrationSeats">;
  sessionId: Id<"registrationSessions">;
}) {
  const preview = useQuery(api.registrationTransfers.preview, {
    seatId,
    sessionId,
  });
  if (!preview) {
    return <Skeleton className="h-14" />;
  }
  if (preview.blocked) {
    return (
      <p className="text-amber-700 text-sm" role="status">
        {preview.blocked}
      </p>
    );
  }
  const tone = preview.difference > 0 ? "text-amber-700" : "text-slate-900";
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200 ring-inset">
      <div>
        <dt className="text-slate-500 text-xs uppercase tracking-wide">
          Original
        </dt>
        <dd className="text-sm">
          <Money cents={preview.original} />
        </dd>
      </div>
      <div>
        <dt className="text-slate-500 text-xs uppercase tracking-wide">
          Destination
        </dt>
        <dd className="text-sm">
          <Money cents={preview.destination} />
        </dd>
      </div>
      <div>
        <dt className="text-slate-500 text-xs uppercase tracking-wide">
          Difference
        </dt>
        <dd className={cn("font-medium text-sm", tone)}>
          {preview.difference > 0 ? "+" : ""}
          <Money cents={preview.difference} />
        </dd>
      </div>
    </dl>
  );
}

function TransferSeat({ seat }: { seat: Seat }) {
  const courses = useCourses();
  const [answers, setAnswers] = useState<Answers>({});
  const sessions = useSessions();
  const transfer = useMutation(api.registrationTransfers.transfer);
  const [target, setTarget] = useState<Id<"registrationSessions"> | "">("");
  const [choice, setChoice] = useState<AdjustmentChoiceValue>("keep");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const eligible = seat.state === "active" && Boolean(seat.settledAt);
  const destinations = sessions?.filter(
    (s) => s._id !== seat.sessionId && s.state === "open"
  );
  const destination = destinations?.find((s) => s._id === target);
  const course = courses?.find((c) => c._id === destination?.courseId);
  const config = course
    ? effective(course.settings, destination?.overrides ?? {})
    : null;
  return (
    <section className="space-y-3">
      <h4 className="font-semibold text-slate-900 text-sm">Transfer</h4>
      {eligible ? null : (
        <p className="text-slate-500 text-sm">
          Only paid, active registrations can be transferred.
        </p>
      )}
      <Field label="Destination session">
        {(props) => (
          <Select
            {...props}
            disabled={!eligible}
            onChange={(e) =>
              setTarget(e.target.value as Id<"registrationSessions"> | "")
            }
            value={target}
          >
            <option value="">Choose an open session</option>
            {destinations?.map((s) => (
              <option key={s._id} value={s._id}>
                {sessionLabel(s)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {target ? <TransferPreview seatId={seat._id} sessionId={target} /> : null}
      {config?.questions.map((q) => (
        <QuestionInput
          key={`${target}:${q.id}`}
          onChange={(value) =>
            setAnswers({ ...answers, [`${target}:${q.id}`]: value })
          }
          question={q}
          value={answers[`${target}:${q.id}`]}
        />
      ))}
      <AdjustmentChoice onChange={setChoice} value={choice} />
      <div className="flex justify-end">
        <Button
          disabled={!(eligible && target)}
          onClick={() => setOpen(true)}
          size="xs"
          type="button"
        >
          Transfer attendee
        </Button>
      </div>
      <ResultNotice message={message} />
      <ReasonDialog
        confirmLabel="Transfer"
        description={`Moves ${seat.name} to ${destination?.title ?? "the selected session"} and creates a new order for the destination seat.`}
        onClose={() => setOpen(false)}
        onConfirm={async (reason) => {
          if (!target) {
            return;
          }
          const result = await transfer({
            seatId: seat._id,
            sessionId: target,
            choice,
            reason,
            answers: (config?.questions ?? []).flatMap((q) => {
              const value = answers[`${target}:${q.id}`];
              return value === undefined ? [] : [{ id: q.id, value }];
            }),
            requestKey: crypto.randomUUID(),
          });
          setMessage(
            `Transferred. Adjustment ${formatMoney(result.adjustment)}. Review the new order for payment or refund processing.`
          );
        }}
        open={open}
        title="Confirm transfer"
      />
    </section>
  );
}

/** Everything staff can do to a single attendee seat. */
export function SeatOperations({ seat }: { seat: Seat }) {
  return (
    <div className="space-y-6">
      <SeatMaterials seat={seat} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SeatActions seat={seat} />
        <TransferSeat seat={seat} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order payments                                                      */
/* ------------------------------------------------------------------ */

function RequestPayment({ order }: { order: Order }) {
  const requestPayment = useMutation(api.registrationPayments.requestPayment);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const [message, setMessage] = useState("");
  const createPaymentLink = async () => {
    setBusy(true);
    setMessage("");
    try {
      setUrl(
        await requestPayment({
          orderId: order._id,
          requestId: requestId.current,
        })
      );
      setMessage(`Payment request queued for ${order.purchaser}.`);
      requestId.current = crypto.randomUUID();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <Button
        disabled={
          busy || (order.status !== "unpaid" && order.status !== "hold")
        }
        onClick={createPaymentLink}
        size="sm"
        type="button"
      >
        {busy ? "Sending…" : "Request payment"}
      </Button>
      <p className="text-slate-500 text-xs">
        Emails {order.purchaser} a secure payment link for this entire order (
        {order.seats.length} attendee{order.seats.length === 1 ? "" : "s"}).
        They enter their billing address at checkout. No invoice is required.
      </p>
      {url ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <a
            className="min-w-0 flex-1 truncate text-primary text-sm underline"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            {url}
          </a>
          <CopyButton value={url} />
        </div>
      ) : null}
      <ResultNotice message={message} />
    </div>
  );
}

function UnpaidActions({ order }: { order: Order }) {
  const record = useMutation(api.registrationOperations.recordPayment);
  const [dialog, setDialog] = useState<"offline" | "waived" | null>(null);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={order.status !== "unpaid"}
          onClick={() => setDialog("offline")}
          size="sm"
          type="button"
          variant="secondary"
        >
          Record offline payment
        </Button>
        <Button
          disabled={order.status !== "unpaid"}
          onClick={() => setDialog("waived")}
          size="sm"
          type="button"
          variant="secondary"
        >
          Waive payment
        </Button>
      </div>
      <RequestPayment order={order} />
      <ResultNotice message={message} />
      <ReasonDialog
        confirmLabel="Record payment"
        description={`Marks ${formatMoney(order.total)} as paid outside Stripe and queues material delivery.`}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await record({ orderId: order._id, source: "offline", reason });
          setMessage("Payment recorded and fulfillment queued.");
        }}
        open={dialog === "offline"}
        title="Record offline payment"
      />
      <ReasonDialog
        confirmLabel="Waive payment"
        danger
        description={`Settles this ${formatMoney(order.total)} order with no payment. Materials are delivered immediately.`}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          await record({ orderId: order._id, source: "waived", reason });
          setMessage("Payment waived and fulfillment queued.");
        }}
        open={dialog === "waived"}
        title="Waive payment"
      />
    </div>
  );
}

function RefundForm({ order }: { order: Order }) {
  const requestRefund = useMutation(api.registrationPayments.requestRefund);
  const refund = useAction(api.registrationExternal.refund);
  const remaining = refundable(order);
  const [amount, setAmount] = useState(remaining);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field
          className="w-48"
          hint={`Up to ${formatMoney(remaining)} remaining on the card payment. Collected sales tax is refundable along with the lines.`}
          label="Refund amount"
        >
          {(props) => (
            <MoneyInput
              {...props}
              disabled={remaining <= 0}
              onChange={(cents) => setAmount(Math.min(cents, remaining))}
              value={amount}
            />
          )}
        </Field>
        <Button
          className="mb-6"
          disabled={remaining <= 0 || amount <= 0}
          onClick={() => setOpen(true)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Refund…
        </Button>
      </div>
      {order.refundReserved > 0 ? (
        <p className="text-slate-500 text-xs">
          <Money cents={order.refundReserved} /> is reserved by refunds awaiting
          Stripe confirmation.
        </p>
      ) : null}
      <ResultNotice message={message} />
      <ReasonDialog
        confirmLabel="Issue refund"
        danger
        description={`Refunds ${formatMoney(amount)} to the original card through Stripe. The registration stays active unless you cancel it separately.`}
        onClose={() => setOpen(false)}
        onConfirm={async (reason) => {
          const id = await requestRefund({
            orderId: order._id,
            cents: amount,
            reason,
            key: crypto.randomUUID(),
          });
          await refund({ id });
          setMessage(`Refund of ${formatMoney(amount)} confirmed.`);
        }}
        open={open}
        title="Refund payment"
      />
    </div>
  );
}

function RestoreCoupon({ order }: { order: Order }) {
  const restore = useMutation(api.registrationOperations.restoreCoupon);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const outstanding = order.couponUses - order.restoredUses;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={outstanding <= 0}
          onClick={() => setOpen(true)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Restore coupon uses
        </Button>
        <span className="text-slate-500 text-xs">
          {outstanding > 0
            ? `${pluralize(outstanding, "use")} consumed by this order can be returned to the coupon.`
            : "Coupon uses for this order were already restored."}
        </span>
      </div>
      <ResultNotice message={message} />
      <ReasonDialog
        confirmLabel="Restore uses"
        description="Returns the discounted seats' uses to the coupon. This runs exactly once per order."
        onClose={() => setOpen(false)}
        onConfirm={async (reason) => {
          await restore({ orderId: order._id, reason });
          setMessage("Coupon uses restored.");
        }}
        open={open}
        title="Restore coupon uses"
      />
    </div>
  );
}

/** Payment, refund, and coupon actions available for an order. */
export function OrderPayments({ order }: { order: Order }) {
  const unpaid = order.status === "unpaid" || order.status === "hold";
  const refundableCard =
    Boolean(order.paymentIntent) &&
    (order.status === "settled" || order.status === "exception");
  const coupon = Boolean(order.couponId) && order.status === "settled";
  if (!(unpaid || refundableCard || coupon)) {
    return (
      <p className="text-slate-500 text-sm">
        No payment actions are available while this order is{" "}
        <StatusBadge status={order.status} />.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {unpaid ? <UnpaidActions order={order} /> : null}
      {refundableCard ? <RefundForm order={order} /> : null}
      {coupon ? <RestoreCoupon order={order} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order invoices                                                      */
/* ------------------------------------------------------------------ */

/** Read-only invoice list for an order; actions live on the Groups page. */
export function OrderInvoices({ order }: { order: Order }) {
  const invoices = useQuery(api.registrationGroups.orderInvoices, {
    orderId: order._id,
  });
  if (!invoices) {
    return <Skeleton className="h-12" />;
  }
  const hasOpen = invoices.some(
    (i) => i.status === "open" || i.status === "draft"
  );
  const canCreate = order.status === "unpaid" && !hasOpen;
  return (
    <div className="space-y-3">
      {invoices.length ? (
        <Table>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Status</TH>
              <TH className="text-right">Amount</TH>
              <TH>Due</TH>
              <TH className="text-right">Link</TH>
            </TR>
          </THead>
          <TBody>
            {invoices.map((invoice) => (
              <TR key={invoice._id}>
                <TD className="font-medium text-slate-900">{invoice.number}</TD>
                <TD>
                  <StatusBadge status={invoice.status} />
                </TD>
                <TD className="text-right">
                  <Money cents={invoice.amount + (invoice.tax ?? 0)} />
                </TD>
                <TD className="whitespace-nowrap">
                  {formatDate(invoice.dueAt)}
                </TD>
                <TD className="text-right">
                  {invoice.hostedUrl ? (
                    <Button
                      href={invoice.hostedUrl}
                      rel="noreferrer"
                      size="xs"
                      target="_blank"
                      variant="ghost"
                    >
                      Hosted invoice
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    </Button>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <p className="text-slate-500 text-sm">
          No invoices have been issued for this order.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canCreate ? (
          <Button
            href={`/admin/groups?tab=invoices&order=${order._id}`}
            size="xs"
          >
            Create invoice
          </Button>
        ) : null}
        <Button href="/admin/groups?tab=invoices" size="xs" variant="ghost">
          Manage invoices
        </Button>
      </div>
    </div>
  );
}
