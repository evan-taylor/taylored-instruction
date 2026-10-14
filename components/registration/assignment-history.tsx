"use client";
import { useQuery } from "convex/react";
import { formatDateTime } from "@/components/registration/format";
import { Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type HistoryRow = { at: number; reason: string; url: string };

function HistoryTimeline({ rows }: { rows: HistoryRow[] | undefined }) {
  if (rows === undefined) {
    return <Skeleton className="h-12 w-full" />;
  }
  if (rows.length === 0) {
    return (
      <p className="m-0 text-slate-500 text-xs">No assignments recorded yet.</p>
    );
  }
  return (
    <ol className="relative m-0 ml-1.5 list-none space-y-3 border-slate-200 border-l p-0 pl-4">
      {rows.map((row) => (
        <li className="relative" key={`${row.at}:${row.url}`}>
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white"
          />
          <p className="m-0 text-slate-500 text-xs tabular-nums">
            {formatDateTime(row.at)}
          </p>
          <p className="m-0 text-slate-800 text-sm">{row.reason}</p>
          <p
            className="m-0 max-w-xs truncate font-mono text-slate-500 text-xs"
            title={row.url}
          >
            {row.url}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Compact, expandable timeline of every code assigned to one entitlement. */
export function AssignmentHistory({
  entitlementId,
}: {
  entitlementId: Id<"registrationEntitlements">;
}) {
  const rows = useQuery(api.registrationOperations.assignmentHistory, {
    entitlementId,
  });
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer select-none font-medium text-slate-600 text-xs hover:text-slate-900">
        Assignment history
        {rows ? ` (${rows.length})` : ""}
      </summary>
      <div className="mt-3">
        <HistoryTimeline rows={rows} />
      </div>
    </details>
  );
}
