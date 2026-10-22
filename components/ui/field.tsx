"use client";
import type * as React from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney, parseDollars } from "@/shared/registration/domain";

export const controlClass =
  "block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-xs md:text-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

/** Label, control, hint, and error laid out consistently. */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
  id,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => React.ReactNode;
  id?: string;
}) {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        className="block font-medium text-slate-700 text-sm"
        htmlFor={controlId}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-rose-600">
            *
          </span>
        ) : null}
      </label>
      {children({
        id: controlId,
        "aria-describedby":
          [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint ? (
        <p className="text-slate-500 text-xs" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-rose-700 text-xs" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}
export function TextArea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(controlClass, "min-h-20", className)} {...props} />
  );
}
export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select className={cn(controlClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/** Dollar input bound to integer cents. */
export function MoneyInput({
  value,
  onChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number;
  onChange: (cents: number) => void;
}) {
  const [text, setText] = useState(() => (value / 100).toFixed(2));
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : (value / 100).toFixed(2);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">
        $
      </span>
      <input
        className={cn(controlClass, "pl-7 tabular-nums", className)}
        inputMode="decimal"
        onBlur={() => {
          setEditing(false);
          try {
            onChange(parseDollars(text));
          } catch {
            setText((value / 100).toFixed(2));
          }
        }}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(parseDollars(e.target.value));
          } catch {
            /* keep typing */
          }
        }}
        onFocus={() => {
          setEditing(true);
          setText((value / 100).toFixed(2));
        }}
        type="text"
        value={shown}
        {...props}
      />
    </div>
  );
}

/** Checkbox row with label and optional description. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3 py-0.5", className)}>
      <input
        checked={checked}
        className="mt-0.5 h-4 pointer-coarse:h-5 pointer-coarse:w-5 w-4 shrink-0 rounded-sm border-slate-300 text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        disabled={disabled}
        id={id}
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <label className="text-sm" htmlFor={id}>
        <span className="font-medium text-slate-800">{label}</span>
        {description ? (
          <span className="block text-slate-500 text-xs">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

export function Money({ cents }: { cents: number }) {
  return <span className="tabular-nums">{formatMoney(cents)}</span>;
}
