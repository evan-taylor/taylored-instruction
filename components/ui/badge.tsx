import type * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "primary";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
  primary: "bg-primary/10 text-primary ring-primary/20",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium text-xs ring-1 ring-inset",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  // Orders
  hold: "info",
  unpaid: "warning",
  settled: "success",
  expired: "neutral",
  exception: "danger",
  // Sessions and publication
  open: "success",
  canceled: "danger",
  finished: "neutral",
  draft: "neutral",
  published: "success",
  archived: "neutral",
  public: "primary",
  private: "info",
  admin: "warning",
  // Seats and entitlements
  held: "info",
  active: "success",
  transferred: "neutral",
  pending: "warning",
  ready: "success",
  fulfilled: "success",
  // Invoices and group requests
  paid: "success",
  void: "neutral",
  new: "primary",
  contacted: "info",
  quoted: "warning",
  scheduled: "success",
  closed: "neutral",
  // Jobs and inventory
  sent: "success",
  sending: "info",
  failed: "danger",
  available: "success",
  assigned: "info",
  retired: "neutral",
};
const STATUS_LABELS: Record<string, string> = {
  hold: "Reserving",
  unpaid: "Awaiting payment",
  settled: "Paid",
  exception: "Needs review",
  admin: "Admin only",
  private: "Unlisted",
  void: "Voided",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      className={cn("capitalize", className)}
      tone={STATUS_TONES[status] ?? "neutral"}
    >
      {STATUS_LABELS[status] ?? status.replaceAll("-", " ")}
    </Badge>
  );
}
