"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function AssignmentHistory({
  entitlementId,
}: {
  entitlementId: Id<"registrationEntitlements">;
}) {
  const rows = useQuery(api.registrationOperations.assignmentHistory, {
    entitlementId,
  });
  return (
    <details>
      <summary>Assignment history</summary>
      {rows?.map((r) => (
        <p className="break-all" key={`${r.at}:${r.url}`}>
          {new Date(r.at).toLocaleString()} · {r.reason} · {r.url}
        </p>
      ))}
    </details>
  );
}
