import type * as React from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
  className?: string;
}) {
  const accents = {
    neutral: "text-slate-900",
    primary: "text-primary",
    warning: "text-amber-700",
    danger: "text-rose-700",
    success: "text-emerald-700",
  };
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xs",
        className
      )}
    >
      <div className="min-w-0">
        <p className="m-0 font-medium text-slate-500 text-xs uppercase tracking-wide">
          {label}
        </p>
        <p
          className={cn(
            "m-0 mt-1 font-semibold text-2xl tabular-nums leading-tight",
            accents[tone]
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="m-0 mt-1 text-slate-500 text-xs">{hint}</p>
        ) : null}
      </div>
      {icon ? (
        <div className="shrink-0 rounded-lg bg-slate-50 p-2 text-slate-500">
          {icon}
        </div>
      ) : null}
    </div>
  );
}

function meterTone(ratio: number) {
  if (ratio >= 1) {
    return "bg-rose-500";
  }
  return ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
}
/** Thin progress indicator for capacity or inventory. */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const tone = meterTone(ratio);
  return (
    <div className={cn("min-w-28", className)}>
      <div className="flex items-center justify-between gap-2 text-slate-600 text-xs">
        <span className="tabular-nums">
          {value}/{max}
        </span>
        <span className="tabular-nums">{Math.round(ratio * 100)}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
