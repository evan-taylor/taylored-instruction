"use client";
import {
  Scroll,
  Sheet,
  type SheetViewProps,
  useClientMediaQuery,
  VisuallyHidden,
} from "@silk-hq/components";
import { X } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { errorText } from "@/components/registration/errors";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/page-header";
import { usePressOrigin } from "@/components/ui/use-press-origin";
import { cn } from "@/lib/utils";

/**
 * Silk's license declaration. This deployment is non-commercial; switch to
 * "commercial" (and buy the license at silkhq.com/access) before any
 * commercial use. The admin drawer in components/admin/shell.tsx reads this.
 */
export const SILK_LICENSE = "non-commercial" as const;

const WIDTHS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
};

/**
 * Modal built on Silk's Sheet: a centered dialog on larger screens and a
 * swipeable bottom sheet on phones. Focus, inert background, Escape, and
 * backdrop dismissal come from Silk.
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
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const wide = useClientMediaQuery("(min-width: 640px)");
  const { ref: panelRef, pressedInside } = usePressOrigin<HTMLDivElement>();
  const contentPlacement = wide ? "center" : "bottom";
  const tracks: SheetViewProps["tracks"] = wide ? ["top", "bottom"] : "bottom";
  return (
    <Sheet.Root
      license={SILK_LICENSE}
      onPresentedChange={(presented) => {
        if (!presented) {
          onClose();
        }
      }}
      presented={open}
      sheetRole="dialog"
    >
      <Sheet.Portal>
        <Sheet.View
          className={cn("app-sheet-view", wide && "app-sheet-view-center")}
          contentPlacement={contentPlacement}
          nativeEdgeSwipePrevention
          onClickOutside={(event) => {
            // Only a press that started on the backdrop dismisses.
            event.changeDefault({ dismiss: !pressedInside.current });
          }}
          tracks={tracks}
        >
          <Sheet.Backdrop className="app-sheet-backdrop" />
          <Sheet.Content className={cn("app-sheet-content", WIDTHS[size])}>
            <div
              className="app-sheet-panel flex flex-col rounded-t-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:rounded-xl"
              ref={panelRef}
            >
              {wide ? null : (
                <Sheet.Handle
                  action="dismiss"
                  aria-label="Close dialog"
                  className="app-sheet-handle"
                />
              )}
              <div className="flex items-start justify-between gap-4 border-slate-100 border-b px-6 py-4">
                <div className="min-w-0">
                  <Sheet.Title className="font-semibold text-lg leading-tight">
                    {title}
                  </Sheet.Title>
                  {description ? (
                    <Sheet.Description className="mt-1 text-slate-500 text-sm">
                      {description}
                    </Sheet.Description>
                  ) : (
                    <VisuallyHidden.Root>
                      <Sheet.Description>{title}</Sheet.Description>
                    </VisuallyHidden.Root>
                  )}
                </div>
                <Sheet.Trigger
                  action="dismiss"
                  aria-label="Close dialog"
                  className="-m-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </Sheet.Trigger>
              </div>
              {children === undefined || children === null ? null : (
                <Scroll.Root asChild>
                  <Scroll.View className="app-sheet-scroll min-h-0 flex-1">
                    <Scroll.Content className="px-6 py-5">
                      {children}
                    </Scroll.Content>
                  </Scroll.View>
                </Scroll.Root>
              )}
              {footer ? (
                <div className="app-sheet-footer flex flex-wrap items-center justify-end gap-3 border-slate-100 border-t bg-slate-50/70 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {footer}
                </div>
              ) : null}
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
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
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (open) {
      setFailure("");
    }
  }, [open]);
  const working = busy || pending;
  return (
    <Modal
      description={description}
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={working}
            onClick={async () => {
              setFailure("");
              setPending(true);
              try {
                await onConfirm();
              } catch (error) {
                setFailure(errorText(error));
              } finally {
                setPending(false);
              }
            }}
            size="sm"
            type="button"
            variant={danger ? "danger" : "primary"}
          >
            {working ? "Working…" : confirmLabel}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="sm"
      title={title}
    >
      {children || failure ? (
        <>
          {children}
          {failure ? (
            <Notice className={cn(children && "mt-4")} tone="danger">
              {failure}
            </Notice>
          ) : null}
        </>
      ) : undefined}
    </Modal>
  );
}
