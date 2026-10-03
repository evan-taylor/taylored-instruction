"use client";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function InventoryManager({
  materialId,
}: {
  materialId: Id<"registrationMaterials">;
}) {
  const stock = usePaginatedQuery(
    api.registrationOperations.stock,
    { materialId },
    { initialNumItems: 20 }
  );
  const missing = usePaginatedQuery(
    api.registrationOperations.missingMaterials,
    { materialId },
    { initialNumItems: 20 }
  );
  const manage = useMutation(api.registrationOperations.manageCode);
  const [entitlement, setEntitlement] =
    useState<Id<"registrationEntitlements">>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className="space-y-3">
      <h2 className="text-2xl">Inventory and missing-code queue</h2>
      <label className="block">
        Assign to outstanding entitlement
        <select
          className="block rounded border p-2"
          onChange={(e) =>
            setEntitlement(
              e.target.value
                ? (e.target.value as Id<"registrationEntitlements">)
                : undefined
            )
          }
          value={entitlement ?? ""}
        >
          <option value="">Retire unused code instead</option>
          {missing.results.map((e) => (
            <option key={e._id} value={e._id}>
              {e.title} · registration {e.seatId}
            </option>
          ))}
        </select>
      </label>
      {missing.status === "CanLoadMore" ? (
        <Button onClick={() => missing.loadMore(20)} type="button">
          More outstanding materials
        </Button>
      ) : null}
      <label className="block">
        Assignment or retirement reason
        <Input onChange={(e) => setReason(e.target.value)} value={reason} />
      </label>
      {stock.results.map((code) => (
        <article className="rounded border p-3" key={code._id}>
          <p className="break-all">
            {code.url} · {code.state}
          </p>
          {code.state === "available" ? (
            <Button
              disabled={!reason}
              onClick={async () => {
                try {
                  await manage({
                    codeId: code._id,
                    entitlementId: entitlement,
                    reason,
                  });
                  setMessage(
                    entitlement
                      ? "Code assigned with history"
                      : "Unused code retired"
                  );
                } catch (error) {
                  setMessage(String(error));
                }
              }}
              type="button"
            >
              {entitlement ? "Assign code" : "Retire code"}
            </Button>
          ) : null}
        </article>
      ))}
      {stock.status === "CanLoadMore" ? (
        <Button onClick={() => stock.loadMore(20)} type="button">
          More inventory
        </Button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
