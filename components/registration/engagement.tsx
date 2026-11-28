"use client";

import { useQuery } from "convex/react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmailHistory } from "./email-history";
import { formatDateTime, pluralize } from "./format";

const MATERIAL_STATES: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Waiting", tone: "warning" },
  ready: { label: "Ready", tone: "info" },
  fulfilled: { label: "Delivered", tone: "success" },
  canceled: { label: "Removed", tone: "neutral" },
};

/** Admin-only: a registration's emails and the materials it can access. */
export function RegistrationEngagement({
  seatId,
}: {
  seatId: Id<"registrationSeats">;
}) {
  const history = useQuery(api.registrationEngagement.history, { seatId });
  return (
    <section aria-busy={history === undefined} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="font-semibold text-slate-900 text-sm">Emails</h4>
          {history ? (
            <span className="text-slate-500 text-xs tabular-nums">
              {pluralize(history.emails.length, "email")}
            </span>
          ) : null}
        </div>
        {history ? (
          <>
            {history.truncated ? (
              <p className="text-slate-500 text-xs" role="status">
                Showing the most recent history only.
              </p>
            ) : null}
            <EmailHistory emails={history.emails} />
          </>
        ) : (
          <>
            <span className="sr-only" role="status">
              Loading emails…
            </span>
            <Skeleton className="h-28" />
          </>
        )}
      </div>
      {history?.materials.length ? (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 text-sm">Materials</h4>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {history.materials.map((material) => (
              <li
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
                key={material.id}
              >
                <span className="min-w-0 flex-1 font-medium text-slate-900">
                  {material.title}
                </span>
                <span className="text-slate-500 text-xs tabular-nums">
                  {material.accessCount
                    ? `Last opened ${formatDateTime(material.lastAccessedAt ?? material.firstAccessedAt ?? 0)} · ${pluralize(material.accessCount, "visit")}`
                    : "Not opened in the portal"}
                </span>
                <Badge tone={MATERIAL_STATES[material.state]?.tone}>
                  {MATERIAL_STATES[material.state]?.label ?? material.state}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
