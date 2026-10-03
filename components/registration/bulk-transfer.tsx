"use client";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function BulkTransfer({
  orders,
  reason,
}: {
  orders: Id<"registrationOrders">[];
  reason: string;
}) {
  const convex = useConvex();
  const sessions = useQuery(api.registration.sessions, {});
  const transfer = useMutation(api.registrationTransfers.transfer);
  const [target, setTarget] = useState<Id<"registrationSessions">>();
  const [choice, setChoice] = useState<"keep" | "collect" | "refund">("keep");
  const [results, setResults] = useState<string[]>([]);
  async function run(preview: boolean) {
    if (!target) {
      return;
    }
    const rows = await Promise.all(
      orders.map(async (orderId) => {
        const seats = await convex.query(
          api.registrationOperations.orderSeats,
          { orderId }
        );
        return await Promise.all(
          seats
            .filter((s) => s.state === "active")
            .map(async (seat) => {
              try {
                if (preview) {
                  const price = await convex.query(
                    api.registrationTransfers.preview,
                    { seatId: seat._id, sessionId: target }
                  );
                  return `${seat.name}: difference $${(price.difference / 100).toFixed(2)}`;
                }
                const result = await transfer({
                  seatId: seat._id,
                  sessionId: target,
                  choice,
                  reason,
                  requestKey: crypto.randomUUID(),
                });
                return `${seat.name}: transferred; adjustment $${(result.adjustment / 100).toFixed(2)}`;
              } catch (error) {
                return `${seat.name}: ${String(error)}`;
              }
            })
        );
      })
    );
    setResults(rows.flat());
  }
  return (
    <div className="space-y-3">
      <label className="block">
        Bulk transfer destination
        <select
          onChange={(e) =>
            setTarget(e.target.value as Id<"registrationSessions">)
          }
          value={target ?? ""}
        >
          <option value="">Choose session</option>
          {sessions
            ?.filter((s) => s.state === "open")
            .map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
        </select>
      </label>
      <label className="block">
        Adjustment choice
        <select
          onChange={(e) => setChoice(e.target.value as typeof choice)}
          value={choice}
        >
          <option value="keep">Keep original payment</option>
          <option value="collect">Collect higher price</option>
          <option value="refund">Refund lower price</option>
        </select>
      </label>
      <Button
        disabled={!(target && orders.length)}
        onClick={() => run(true)}
        type="button"
      >
        Preview selected transfers
      </Button>
      <Button
        disabled={!(target && orders.length && reason)}
        onClick={() => run(false)}
        type="button"
      >
        Transfer selected registrations
      </Button>
      <ul>
        {results.map((result, index) => (
          <li key={`${orders[index] ?? "seat"}:${result}`}>{result}</li>
        ))}
      </ul>
    </div>
  );
}
