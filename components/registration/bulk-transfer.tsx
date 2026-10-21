"use client";
import { useConvex, useMutation } from "convex/react";
import { useState } from "react";
import { useCourses, useSessions } from "@/components/registration/catalog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { ResultNotice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  effective,
  formatMoney,
  type Settings,
} from "@/shared/registration/domain";
import {
  AdjustmentChoice,
  type AdjustmentChoiceValue,
  QuestionInput,
  ReasonDialog,
  sessionLabel,
} from "./operations";

/** One line of a bulk operation outcome, keyed by the entity it touched. */
export type BulkResult = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

export function BulkResults({
  results,
  title = "Results",
}: {
  results: BulkResult[];
  title?: string;
}) {
  if (results.length === 0) {
    return null;
  }
  const failed = results.filter((r) => !r.ok).length;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="m-0 font-semibold text-slate-900 text-sm">{title}</h4>
        <Badge tone="success">{results.length - failed} succeeded</Badge>
        {failed ? <Badge tone="danger">{failed} failed</Badge> : null}
      </div>
      <ul className="m-0 list-none divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white p-0 text-sm">
        {results.map((result) => (
          <li
            className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
            key={result.key}
          >
            <span className="min-w-0">
              <span className="block font-medium text-slate-900">
                {result.label}
              </span>
              <span className="block break-words text-slate-500 text-xs">
                {result.detail}
              </span>
            </span>
            <Badge tone={result.ok ? "success" : "danger"}>
              {result.ok ? "Done" : "Failed"}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useBulkTransfer(orders: Id<"registrationOrders">[]) {
  const convex = useConvex();
  const transfer = useMutation(api.registrationTransfers.transfer);
  const [previewSeats, setPreviewSeats] = useState<Doc<"registrationSeats">[]>(
    []
  );
  const [previewTarget, setPreviewTarget] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activeSeats = async () => {
    const perOrder = await Promise.all(
      orders.map((orderId) =>
        convex.query(api.registrationOperations.orderSeats, { orderId })
      )
    );
    return perOrder.flat().filter((seat) => seat.state === "active");
  };
  const preview = async (sessionId: Id<"registrationSessions">) => {
    setBusy(true);
    setMessage("");
    try {
      const seats = await activeSeats();
      setPreviewSeats(seats);
      setPreviewTarget(sessionId);
      const rows = await Promise.all(
        seats.map(async (seat): Promise<BulkResult> => {
          try {
            const price = await convex.query(
              api.registrationTransfers.preview,
              { seatId: seat._id, sessionId }
            );
            return {
              key: seat._id,
              label: seat.name,
              ok: true,
              detail: `${formatMoney(price.original)} → ${formatMoney(price.destination)} (difference ${formatMoney(price.difference)})`,
            };
          } catch (error) {
            return {
              key: seat._id,
              label: seat.name,
              ok: false,
              detail: String(error),
            };
          }
        })
      );
      setResults(rows);
      if (rows.length === 0) {
        setMessage("No active, paid seats were found in the selected orders.");
      }
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  };
  const run = async (
    sessionId: Id<"registrationSessions">,
    choice: AdjustmentChoiceValue,
    reason: string,
    questions: Settings["questions"],
    answers: Record<string, string | boolean>
  ) => {
    const seats = await activeSeats();
    const rows = await Promise.all(
      seats.map(async (seat): Promise<BulkResult> => {
        try {
          const result = await transfer({
            seatId: seat._id,
            sessionId,
            choice,
            reason,
            answers: questions.flatMap((q) => {
              const value = answers[`${sessionId}:${seat._id}:${q.id}`];
              return value === undefined ? [] : [{ id: q.id, value }];
            }),
            requestKey: crypto.randomUUID(),
          });
          return {
            key: seat._id,
            label: seat.name,
            ok: true,
            detail: `Transferred; adjustment ${formatMoney(result.adjustment)}`,
          };
        } catch (error) {
          return {
            key: seat._id,
            label: seat.name,
            ok: false,
            detail: String(error),
          };
        }
      })
    );
    setResults(rows);
    setMessage(
      rows.length
        ? `Processed ${rows.length} seat transfer${rows.length === 1 ? "" : "s"}.`
        : "No active, paid seats were found in the selected orders."
    );
  };
  return { results, busy, message, preview, run, previewSeats, previewTarget };
}

/** Moves every active seat in the selected orders to one destination session. */
export function BulkTransfer({
  orders,
}: {
  orders: Id<"registrationOrders">[];
}) {
  const sessions = useSessions();
  const courses = useCourses();
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [target, setTarget] = useState<Id<"registrationSessions"> | "">("");
  const [choice, setChoice] = useState<AdjustmentChoiceValue>("keep");
  const [open, setOpen] = useState(false);
  const { results, busy, message, preview, run, previewSeats, previewTarget } =
    useBulkTransfer(orders);
  const destinations = sessions?.filter((s) => s.state === "open");
  const destination = destinations?.find((s) => s._id === target);
  const course = courses?.find((c) => c._id === destination?.courseId);
  const questions = course
    ? effective(course.settings, destination?.overrides ?? {}).questions
    : [];
  return (
    <div className="space-y-5">
      <p className="m-0 text-slate-600 text-sm">
        Transfers every active, paid seat in the {orders.length} selected{" "}
        {orders.length === 1 ? "order" : "orders"}. Held, unpaid, or canceled
        seats are skipped.
      </p>
      <Field label="Destination session" required>
        {(props) => (
          <Select
            {...props}
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
      <AdjustmentChoice onChange={setChoice} value={choice} />
      {previewTarget === target && questions.length > 0
        ? previewSeats.map((seat) => (
            <section className="space-y-3" key={seat._id}>
              <h4>{seat.name} — destination questions</h4>
              {questions.map((q) => (
                <QuestionInput
                  key={q.id}
                  onChange={(value) =>
                    setAnswers({
                      ...answers,
                      [`${target}:${seat._id}:${q.id}`]: value,
                    })
                  }
                  question={q}
                  value={answers[`${target}:${seat._id}:${q.id}`]}
                />
              ))}
            </section>
          ))
        : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={!target || busy}
          onClick={() => {
            if (target) {
              preview(target);
            }
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {busy ? "Working…" : "Preview"}
        </Button>
        <Button
          disabled={
            !target ||
            busy ||
            previewTarget !== target ||
            previewSeats.length === 0
          }
          onClick={() => setOpen(true)}
          size="sm"
          type="button"
        >
          Transfer
        </Button>
      </div>
      <ResultNotice message={message} />
      <BulkResults results={results} />
      <ReasonDialog
        confirmLabel="Transfer seats"
        description={`Moves all active seats in the selected orders to ${destination?.title ?? "the destination"}. Each seat gets a new order for the destination session.`}
        onClose={() => setOpen(false)}
        onConfirm={async (reason) => {
          if (target) {
            await run(target, choice, reason, questions, answers);
          }
        }}
        open={open}
        title="Confirm bulk transfer"
      />
    </div>
  );
}
