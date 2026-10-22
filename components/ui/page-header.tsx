import type * as React from "react";

const FAILURE_WORDS =
  /error|fail|invalid|cannot|required|not |too many|forbidden|unable/iu;
const ERROR_PREFIX = /^(Error|ConvexError):\s*/u;
const STACK_SUFFIX = /\s+at .*$/su;

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-medium text-primary text-xs uppercase tracking-wide">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-bold text-2xl text-slate-900 leading-tight lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-slate-500 text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-slate-200 border-dashed bg-slate-50/50 px-6 py-12 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3 text-slate-400">{icon}</div> : null}
      <p className="font-semibold text-slate-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-slate-500 text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Inline status or error message for forms and actions. */
export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-rose-200 bg-rose-50 text-rose-900",
  };
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tones[tone],
        className
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

/**
 * Shows an action result. Pass `tone` when the caller knows the outcome;
 * otherwise errors are guessed from the wording.
 */
export function ResultNotice({
  message,
  tone,
  className,
}: {
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
  className?: string;
}) {
  if (!message) {
    return null;
  }
  const failed = FAILURE_WORDS.test(message);
  return (
    <Notice
      className={className}
      tone={tone ?? (failed ? "danger" : "success")}
    >
      {message.replace(ERROR_PREFIX, "").replace(STACK_SUFFIX, "")}
    </Notice>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-slate-100", className)}
    />
  );
}

export function DescriptionList({
  items,
  className,
}: {
  items: { label: React.ReactNode; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items.map((item, index) => (
        <div key={typeof item.label === "string" ? item.label : index}>
          <dt className="text-slate-500 text-xs uppercase tracking-wide">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-slate-900 text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Renders a skeleton while loading, an empty state when there are no rows, else children. */
export function ListState({
  loading,
  empty,
  emptyState,
  children,
  skeletonClassName = "h-48",
}: {
  loading: boolean;
  empty: boolean;
  emptyState: React.ReactNode;
  children: React.ReactNode;
  skeletonClassName?: string;
}) {
  if (loading) {
    return <Skeleton className={skeletonClassName} />;
  }
  if (empty) {
    return emptyState;
  }
  return children;
}
