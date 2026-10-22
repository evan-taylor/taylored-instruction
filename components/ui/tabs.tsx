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
        const offsets: Record<string, number> = {
          ArrowRight: 1,
          ArrowLeft: -1,
          Home: -index,
          End: tabs.length - 1 - index,
        };
        const offset = offsets[e.key];
        if (offset === undefined || tabs.length === 0) {
          return;
        }
        e.preventDefault();
        const next = (index + offset + tabs.length) % tabs.length;
        const tab = tabs.at(next);
        if (tab) {
          onChange(tab.id);
          e.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="tab"]')
            .item(next)
            ?.focus();
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
  keepMounted = false,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  /** Keep the panel's state (e.g. a wizard draft) while another tab is shown. */
  keepMounted?: boolean;
}) {
  if (!(active || keepMounted)) {
    return null;
  }
  return (
    <div
      aria-labelledby={`${id}-tab`}
      className={cn("pt-5", className)}
      hidden={!active}
      id={`${id}-panel`}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
