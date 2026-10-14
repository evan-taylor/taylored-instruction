"use client";
import type * as React from "react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = {
  id: T;
  label: React.ReactNode;
  count?: number;
};

/** Controlled, keyboard-navigable tab list. Panels are rendered by the caller. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto border-slate-200 border-b",
        className
      )}
      onKeyDown={(e) => {
        const index = tabs.findIndex((t) => t.id === value);
        if (e.key === "ArrowRight") {
          onChange(tabs[(index + 1) % tabs.length]?.id ?? value);
        } else if (e.key === "ArrowLeft") {
          onChange(tabs[(index - 1 + tabs.length) % tabs.length]?.id ?? value);
        }
      }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={active}
            className={cn(
              "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 font-medium text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
              active
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            )}
            id={`${tab.id}-tab`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {tab.label}
            {tab.count === undefined ? null : (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
  className,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!active) {
    return null;
  }
  return (
    <div
      aria-labelledby={`${id}-tab`}
      className={cn("pt-5", className)}
      id={`${id}-panel`}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
