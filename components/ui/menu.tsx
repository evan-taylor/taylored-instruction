"use client";
import {
  Content,
  Item,
  Label,
  Portal,
  Root,
  Separator,
  Trigger,
} from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { cn } from "@/lib/utils";

type MenuIcon = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;

/** Dropdown menu anchored to `trigger`, which must be a single button element. */
export function Menu({
  trigger,
  children,
  align = "end",
  className,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Root modal={false} onOpenChange={onOpenChange}>
      <Trigger asChild>{trigger}</Trigger>
      <Portal>
        <Content
          align={align}
          className={cn(
            "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-[70] min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) rounded-lg border border-slate-200 bg-white p-1 text-slate-700 shadow-lg data-[state=open]:animate-in data-[state=open]:duration-100",
            className
          )}
          collisionPadding={8}
          sideOffset={6}
        >
          {children}
        </Content>
      </Portal>
    </Root>
  );
}

/** One action or link in a menu. Pass `href` for navigation, `onSelect` for an action. */
export function MenuItem({
  children,
  description,
  icon: Icon,
  href,
  external,
  onSelect,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  icon?: MenuIcon;
  href?: string;
  external?: boolean;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "flex min-h-9 pointer-coarse:min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm outline-hidden data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
    danger
      ? "text-rose-700 data-[highlighted]:bg-rose-50"
      : "text-slate-700 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
  );
  const content = (
    <>
      {Icon ? (
        <Icon
          aria-hidden={true}
          className={cn(
            "h-4 w-4 shrink-0",
            danger ? "text-rose-600" : "text-slate-400"
          )}
        />
      ) : null}
      <span className="min-w-0">
        <span className="block font-medium">{children}</span>
        {description ? (
          <span className="block text-slate-500 text-xs">{description}</span>
        ) : null}
      </span>
    </>
  );
  if (href) {
    return (
      <Item asChild className={className} disabled={disabled}>
        {external ? (
          <a href={href} rel="noopener noreferrer" target="_blank">
            {content}
          </a>
        ) : (
          <Link href={href}>{content}</Link>
        )}
      </Item>
    );
  }
  return (
    <Item className={className} disabled={disabled} onSelect={onSelect}>
      {content}
    </Item>
  );
}

export function MenuSeparator() {
  return <Separator className="-mx-1 my-1 h-px bg-slate-100" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="truncate px-2.5 pt-1.5 pb-1 text-slate-500 text-xs">
      {children}
    </Label>
  );
}

/** The "more actions" button for a table row; `label` names the row for screen readers. */
export function RowMenu({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Menu
      trigger={
        <button
          aria-label={label}
          className="inline-flex h-8 pointer-coarse:h-10 pointer-coarse:w-10 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900"
          type="button"
        >
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
      }
    >
      {children}
    </Menu>
  );
}
