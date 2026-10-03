"use client";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { effective } from "@/shared/registration/domain";
import { AssignmentHistory } from "./assignment-history";
import { BulkTransfer } from "./bulk-transfer";

export function ManualEnrollment() {
  const courses = useQuery(api.registration.courses);
  const sessions = useQuery(api.registration.sessions, {});
  const reserve = useMutation(api.registration.reserve);
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const selectedSession = sessions?.find((s) => s._id === sessionId);
  const selectedCourse = courses?.find(
    (c) => c._id === selectedSession?.courseId
  );
  const config = selectedCourse
    ? effective(selectedCourse.settings, selectedSession?.overrides ?? {})
    : null;
  const [reason, setReason] = useState("");
  const [overbook, setOverbook] = useState(false);
  const [payment, setPayment] = useState<"unpaid" | "offline" | "waived">(
    "unpaid"
  );
  const [message, setMessage] = useState("");
  return (
    <form
      className="space-y-3 rounded border p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const session = sessions?.find((s) => s._id === sessionId);
        const course = session
          ? courses?.find((c) => c._id === session.courseId)
          : null;
        if (!(session && course)) {
          return;
        }
        try {
          await reserve({
            courseId: course._id,
            sessionId: session._id,
            purchaser: email,
            purchaserName: name,
            requestKey: crypto.randomUUID(),
            attendees: [
              {
                name,
                email,
                selected: [],
                waived: [],
                answers: Object.entries(answers).map(([id, value]) => ({
                  id,
                  value,
                })),
              },
            ],
            admin: { payment, overbook, reason },
          });
          setMessage("Enrollment created");
        } catch (error) {
          setMessage(String(error));
        }
      }}
    >
      <h2 className="text-2xl">Manual enrollment</h2>
      <label className="block">
        Session
        <select
          className="block rounded border p-2"
          onChange={(e) => setSessionId(e.target.value)}
          required
          value={sessionId}
        >
          <option value="">Choose session</option>
          {sessions?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.title} ({s.reserved}/{s.capacity})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Attendee name
        <Input
          onChange={(e) => setName(e.target.value)}
          required
          value={name}
        />
      </label>
      <label className="block">
        Attendee email
        <Input
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      {config?.questions.map((q) => (
        <label className="block" htmlFor={`manual-${q.id}`} key={q.id}>
          {q.title}
          {q.type === "choice" ? (
            <select
              id={`manual-${q.id}`}
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
              required={q.required}
              value={String(answers[q.id] ?? "")}
            >
              <option value="">Choose answer</option>
              {q.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <Input
              checked={
                q.type === "checkbox" ? answers[q.id] === true : undefined
              }
              id={`manual-${q.id}`}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [q.id]:
                    q.type === "checkbox" ? e.target.checked : e.target.value,
                })
              }
              required={q.required}
              type={q.type === "checkbox" ? "checkbox" : "text"}
              value={
                q.type === "text" ? String(answers[q.id] ?? "") : undefined
              }
            />
          )}
          {q.policyUrl ? (
            <a href={q.policyUrl} rel="noreferrer" target="_blank">
              Read policy
            </a>
          ) : null}
        </label>
      ))}
      <label className="block">
        Payment
        <select
          className="block rounded border p-2"
          onChange={(e) => setPayment(e.target.value as typeof payment)}
          value={payment}
        >
          <option value="unpaid">
            Unpaid — reserve capacity, withhold materials
          </option>
          <option value="offline">Payment received offline</option>
          <option value="waived">Explicitly waive payment</option>
        </select>
      </label>
      <label className="block">
        Reason
        <Input
          onChange={(e) => setReason(e.target.value)}
          required
          value={reason}
        />
      </label>
      <label className="block">
        <input
          checked={overbook}
          onChange={(e) => setOverbook(e.target.checked)}
          type="checkbox"
        />{" "}
        Allow overbooking — may exceed safe session capacity
      </label>
      <Button type="submit">Create enrollment</Button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
function SeatOperations({ seat }: { seat: Doc<"registrationSeats"> }) {
  const replaceCode = useMutation(api.registrationOperations.replaceCode);
  const resend = useMutation(api.registrationOperations.resendMaterials);
  const materials = useQuery(api.registrationOperations.seatMaterials, {
    seatId: seat._id,
  });
  const sessions = useQuery(api.registration.sessions, {});
  const cancel = useMutation(api.registrationOperations.cancelSeat);
  const transfer = useMutation(api.registrationTransfers.transfer);
  const override = useMutation(api.registrationOperations.overrideCompletion);
  const [target, setTarget] = useState<Id<"registrationSessions">>();
  const preview = useQuery(
    api.registrationTransfers.preview,
    target ? { seatId: seat._id, sessionId: target } : "skip"
  );
  const [choice, setChoice] = useState<"collect" | "refund" | "keep">("keep");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  return (
    <section className="space-y-3 rounded border p-4">
      <h3 className="text-xl">
        {seat.name} · {seat.state}
      </h3>
      <h4>Delivered materials</h4>
      {materials?.map((m) => (
        <div key={m._id}>
          {m.title} · {m.state} · version {m.version}{" "}
          <AssignmentHistory entitlementId={m._id} />
          {m.kind === "keycode" ? (
            <Button
              disabled={!reason}
              onClick={async () => {
                try {
                  await replaceCode({ entitlementId: m._id, reason });
                  setMessage(
                    "Replacement assigned; prior code history retained"
                  );
                } catch (error) {
                  setMessage(String(error));
                }
              }}
              type="button"
              variant="outline"
            >
              Replace code
            </Button>
          ) : null}
          {m.url ? (
            <a
              className="underline"
              href={m.url}
              rel="noreferrer"
              target="_blank"
            >
              View assigned material
            </a>
          ) : null}
        </div>
      ))}
      <Button
        onClick={async () => {
          try {
            await resend({ seatId: seat._id, key: crypto.randomUUID() });
            setMessage("Material email queued using existing assignments");
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
        variant="outline"
      >
        Resend material access
      </Button>
      <label className="block">
        Operational reason
        <Input onChange={(e) => setReason(e.target.value)} value={reason} />
      </label>
      <label className="block">
        <input
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          type="checkbox"
        />{" "}
        Notify attendee about cancellation
      </label>
      <Button
        disabled={!reason}
        onClick={async () => {
          try {
            await cancel({ seatId: seat._id, reason, notify });
            setMessage("Canceled. Payment and delivered codes are unchanged.");
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
        variant="outline"
      >
        Cancel registration without refund
      </Button>
      <label className="block">
        Transfer destination
        <select
          className="block rounded border p-2"
          onChange={(e) =>
            setTarget(e.target.value as Id<"registrationSessions">)
          }
          value={target ?? ""}
        >
          <option value="">Choose session</option>
          {sessions
            ?.filter((s) => s._id !== seat.sessionId && s.state === "open")
            .map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
        </select>
      </label>
      <label className="block">
        Price difference{" "}
        {preview
          ? `— original $${(preview.original / 100).toFixed(2)}, destination $${(preview.destination / 100).toFixed(2)}, difference $${(preview.difference / 100).toFixed(2)}`
          : ""}
        <select
          className="block rounded border p-2"
          onChange={(e) => setChoice(e.target.value as typeof choice)}
          value={choice}
        >
          <option value="keep">Keep original paid amount</option>
          <option value="collect">
            Collect higher price before new materials
          </option>
          <option value="refund">Queue lower-price refund</option>
        </select>
      </label>
      <Button
        disabled={!(target && reason)}
        onClick={async () => {
          if (!target) {
            return;
          }
          try {
            const result = await transfer({
              seatId: seat._id,
              sessionId: target,
              choice,
              reason,
              requestKey: crypto.randomUUID(),
            });
            setMessage(
              `Transferred. Adjustment: $${(result.adjustment / 100).toFixed(2)}. Review the new order for payment or refund processing.`
            );
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
      >
        Transfer attendee
      </Button>
      <Button
        disabled={!reason}
        onClick={async () => {
          try {
            await override({ seatId: seat._id, reason, complete: true });
            setMessage("Audited admin completion override recorded");
          } catch (error) {
            setMessage(String(error));
          }
        }}
        type="button"
        variant="outline"
      >
        Override completion with reason
      </Button>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
export function OrderOperations({
  order,
}: {
  order: Doc<"registrationOrders">;
}) {
  const seats = useQuery(api.registrationOperations.orderSeats, {
    orderId: order._id,
  });
  const requestRefund = useMutation(api.registrationPayments.requestRefund);
  const refund = useAction(api.registrationExternal.refund);
  const createLink = useMutation(api.registrationPayments.createPaymentLink);
  const checkout = useAction(api.registrationExternal.checkout);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="space-y-3">
      {order.status === "unpaid" ? (
        <Button
          onClick={async () => {
            try {
              const requestKey = crypto.randomUUID();
              await createLink({ orderId: order._id, requestKey });
              setUrl(await checkout({ orderId: order._id, requestKey }));
            } catch (error) {
              setMessage(String(error));
            }
          }}
          type="button"
        >
          Create test payment link
        </Button>
      ) : null}
      {url ? (
        <a
          className="block underline"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          Open payment link
        </a>
      ) : null}
      {order.paymentIntent ? (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const id = await requestRefund({
                orderId: order._id,
                cents: amount,
                reason,
                key: crypto.randomUUID(),
              });
              await refund({ id });
              setMessage("Test refund confirmed");
            } catch (error) {
              setMessage(String(error));
            }
          }}
        >
          <p>
            Remaining refundable: $
            {(
              (order.total - order.refunded - order.refundReserved) /
              100
            ).toFixed(2)}
          </p>
          <label className="block">
            Refund cents
            <Input
              min={1}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              type="number"
              value={amount}
            />
          </label>
          <label className="block">
            Refund reason
            <Input
              onChange={(e) => setReason(e.target.value)}
              required
              value={reason}
            />
          </label>
          <Button type="submit">Issue explicit test refund</Button>
        </form>
      ) : null}
      {seats?.map((seat) => (
        <SeatOperations key={seat._id} seat={seat} />
      ))}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
export function BulkOperations({
  orders,
}: {
  orders: Doc<"registrationOrders">[];
}) {
  const convex = useConvex();
  const cancel = useMutation(api.registrationOperations.cancelSeat);
  const requestRefund = useMutation(api.registrationPayments.requestRefund);
  const refund = useAction(api.registrationExternal.refund);
  const [selected, setSelected] = useState<Id<"registrationOrders">[]>([]);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [results, setResults] = useState<string[]>([]);
  async function run(operation: "cancel" | "refund") {
    const outcomes = await Promise.all(
      selected.map(async (orderId) => {
        try {
          if (operation === "cancel") {
            const seats = await convex.query(
              api.registrationOperations.orderSeats,
              { orderId }
            );
            const seatResults = await Promise.allSettled(
              seats.map((seat) => cancel({ seatId: seat._id, reason, notify }))
            );
            return `${orderId}: ${seatResults.filter((r) => r.status === "fulfilled").length} canceled; ${seatResults.filter((r) => r.status === "rejected").length} failed`;
          }
          const order = orders.find((o) => o._id === orderId);
          if (!order) {
            throw new Error("Reload order first");
          }
          const id = await requestRefund({
            orderId,
            cents: order.total - order.refunded - order.refundReserved,
            reason,
            key: crypto.randomUUID(),
          });
          await refund({ id });
          return `${orderId}: refund confirmed`;
        } catch (error) {
          return `${orderId}: ${String(error)}`;
        }
      })
    );
    setResults(outcomes);
  }
  return (
    <section className="space-y-3 rounded border p-5">
      <h2 className="text-2xl">Bulk order operations</h2>
      {orders.map((o) => (
        <label className="block" key={o._id}>
          <input
            checked={selected.includes(o._id)}
            onChange={(e) =>
              setSelected(
                e.target.checked
                  ? [...selected, o._id]
                  : selected.filter((id) => id !== o._id)
              )
            }
            type="checkbox"
          />{" "}
          {o.title} · {o.purchaser}
        </label>
      ))}
      <label className="block">
        Reason
        <Input onChange={(e) => setReason(e.target.value)} value={reason} />
      </label>
      <label className="block">
        <input
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          type="checkbox"
        />{" "}
        Notify canceled attendees
      </label>
      <Button
        disabled={!(selected.length && reason)}
        onClick={() => run("cancel")}
        type="button"
        variant="outline"
      >
        Cancel selected registrations without refunds
      </Button>
      <Button
        disabled={!(selected.length && reason)}
        onClick={() => run("refund")}
        type="button"
      >
        Refund remaining test payments for selected orders
      </Button>
      <BulkTransfer orders={selected} reason={reason} />
      <ul>
        {results.map((result) => (
          <li key={result}>{result}</li>
        ))}
      </ul>
    </section>
  );
}
