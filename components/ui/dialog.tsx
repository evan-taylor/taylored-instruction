"use client";
import { X } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Accessible modal built on the native dialog element: focus trapping, Escape
 * to close, and backdrop dismissal come from the browser.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);
  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };
  return (
    <dialog
      className={cn(
        "open:fade-in-0 open:zoom-in-95 m-auto w-[calc(100%-2rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px] open:animate-in",
        widths[size]
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === ref.current) {
          onClose();
        }
      }}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      ref={ref}
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-slate-100 border-b px-6 py-4">
          <div>
            <h2 className="m-0 font-semibold text-lg leading-tight">{title}</h2>
            {description ? (
              <p className="m-0 mt-1 text-slate-500 text-sm">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-slate-100 border-t bg-slate-50/70 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

/** Confirmation with a required reason, used for every audited admin action. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      description={description}
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              onConfirm();
            }}
            size="sm"
            type="button"
            variant={danger ? "danger" : "primary"}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="sm"
      title={title}
    >
      {children}
    </Modal>
  );
}
