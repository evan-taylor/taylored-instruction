import type * as React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  wrapperClassName,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & {
  wrapperClassName?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white",
        wrapperClassName
      )}
    >
      <table
        className={cn("w-full min-w-[640px] text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}
export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-slate-50 text-slate-500 text-xs uppercase tracking-wide",
        className
      )}
      {...props}
    />
  );
}
export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-slate-100", className)} {...props} />
  );
}
export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-slate-50/70", className)}
      {...props}
    />
  );
}
export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-4 py-3 font-semibold", className)}
      scope="col"
      {...props}
    />
  );
}
export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-slate-700", className)}
      {...props}
    />
  );
}
