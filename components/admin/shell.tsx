"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Ticket,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: "attention";
};
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    group: "Classes",
    items: [
      { label: "Course templates", href: "/admin/courses", icon: BookOpen },
      { label: "Sessions", href: "/admin/sessions", icon: CalendarDays },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Registrations", href: "/admin/registrations", icon: Users },
      { label: "Groups & invoices", href: "/admin/groups", icon: Building2 },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    group: "Fulfillment",
    items: [
      {
        label: "Materials & keycodes",
        href: "/admin/materials",
        icon: KeyRound,
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Activity & attention",
        href: "/admin/registration-activity",
        icon: Bell,
        badge: "attention",
      },
      { label: "Instructors", href: "/admin/instructors", icon: GraduationCap },
      { label: "SEO content", href: "/admin/seo-content", icon: Globe },
      { label: "Content studio", href: "/admin/studio", icon: Newspaper },
    ],
  },
];
/** Links out of the admin workspace, kept apart from the page navigation. */
const SECONDARY: NavItem[] = [
  { label: "Instructor workspace", href: "/instructor/sessions", icon: Users },
  { label: "View site", href: "/", icon: ExternalLink },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  count,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary/10 text-primary"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      )}
      href={item.href}
    >
      <Icon
        aria-hidden={true}
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
        )}
      />
      <span className="truncate">{item.label}</span>
      {count ? (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 font-semibold text-white text-xs tabular-nums leading-none">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroups({
  pathname,
  attentionCount,
}: {
  pathname: string;
  attentionCount: number;
}) {
  return (
    <div className="space-y-6">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="mb-1.5 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
            {section.group}
          </p>
          <ul className="list-none space-y-0.5 p-0">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  active={isActive(pathname, item.href)}
                  count={item.badge === "attention" ? attentionCount : 0}
                  item={item}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link
      className="flex items-center gap-3 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
      href="/admin"
    >
      <Image
        alt="Taylored Instruction"
        className="h-7 w-auto"
        height={28}
        priority
        src="/horizontal-logo-black.png"
        width={96}
      />
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">
        Admin
      </span>
    </Link>
  );
}

function AccountRow({ email }: { email: string | null }) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const initial = (email ?? "?").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900 text-sm">
          {email ?? "Signed in"}
        </p>
        <Link
          className="text-slate-500 text-xs underline-offset-2 hover:text-slate-900 hover:underline"
          href="/my-account"
        >
          My account
        </Link>
      </div>
      <button
        aria-label="Sign out"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        title="Sign out"
        type="button"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

function SidebarContent({
  pathname,
  attentionCount,
  email,
}: {
  pathname: string;
  attentionCount: number;
  email: string | null;
}) {
  return (
    <>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-5">
        <NavGroups attentionCount={attentionCount} pathname={pathname} />
      </nav>
      <div className="border-slate-200 border-t px-3 py-3">
        <ul className="mb-2 list-none space-y-0.5 p-0">
          {SECONDARY.map((item) => (
            <li key={item.href}>
              <NavLink active={false} item={item} />
            </li>
          ))}
        </ul>
        <AccountRow email={email} />
      </div>
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  pathname,
  attentionCount,
  email,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  attentionCount: number;
  email: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
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
  return (
    <dialog
      aria-label="Admin navigation"
      className="open:slide-in-from-left m-0 h-dvh max-h-none w-72 max-w-[85vw] flex-col border-slate-200 border-r bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40 open:flex open:animate-in motion-reduce:open:animate-none"
      onClick={(e) => {
        if (e.target === ref.current && pressedBackdrop.current) {
          onClose();
        }
        pressedBackdrop.current = false;
      }}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === ref.current;
      }}
      ref={ref}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-slate-200 border-b px-4">
        <Brand />
        <button
          aria-label="Close navigation"
          className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <SidebarContent
        attentionCount={attentionCount}
        email={email}
        pathname={pathname}
      />
    </dialog>
  );
}

function GateMessage({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="flex h-14 items-center border-slate-200 border-b bg-white px-4 sm:px-6">
        <Brand />
      </header>
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-bold text-2xl text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{children}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actions}
        </div>
      </div>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }): React.ReactNode {
  const { loading, session, email } = useProfile();
  if (loading) {
    return (
      <div
        aria-busy="true"
        className="flex min-h-dvh bg-slate-50"
        role="status"
      >
        <span className="sr-only">Checking your sign-in…</span>
        <div className="hidden h-dvh w-64 shrink-0 space-y-3 border-slate-200 border-r bg-white p-5 lg:block">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-6 h-4 w-20" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
        <div className="mx-auto w-full max-w-5xl space-y-4 p-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <GateMessage
        actions={<Button href="/login">Sign in</Button>}
        title="Staff sign-in required"
      >
        Sign in with an administrator account to manage classes, registrations,
        instructors, and content.
      </GateMessage>
    );
  }
  if (!isAdminEmail(email)) {
    return (
      <GateMessage
        actions={
          <>
            <Button href="/instructor/sessions" variant="secondary">
              My sessions
            </Button>
            <Button href="/my-account">My account</Button>
          </>
        }
        title="Access restricted"
      >
        {email} is not an administrator. Instructors can open their assigned
        sessions instead.
      </GateMessage>
    );
  }
  return children;
}

function AttentionAware({
  children,
}: {
  children: (count: number) => React.ReactNode;
}) {
  const attention = useQuery(api.registrationOperations.attention);
  const count = attention
    ? attention.emails.length +
      attention.payments.length +
      attention.refunds.length +
      attention.invoices.length +
      attention.requests.length
    : 0;
  return children(count);
}

function Workspace({
  children,
  attentionCount,
}: {
  children: React.ReactNode;
  attentionCount: number;
}) {
  const pathname = usePathname() ?? "/admin";
  const { email } = useProfile();
  const [drawer, setDrawer] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: close the drawer whenever the route changes
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);
  return (
    <div className="flex min-h-dvh bg-slate-50">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-slate-200 border-r bg-white lg:flex">
        <div className="flex h-14 shrink-0 items-center border-slate-200 border-b px-5">
          <Brand />
        </div>
        <SidebarContent
          attentionCount={attentionCount}
          email={email}
          pathname={pathname}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-slate-200 border-b bg-white px-4 lg:hidden">
          <Brand />
          <button
            aria-expanded={drawer}
            aria-label="Open navigation"
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={() => setDrawer(true)}
            type="button"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
      <MobileDrawer
        attentionCount={attentionCount}
        email={email}
        onClose={() => setDrawer(false)}
        open={drawer}
        pathname={pathname}
      />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Gate>
      <AttentionAware>
        {(attentionCount) => (
          <Workspace attentionCount={attentionCount}>{children}</Workspace>
        )}
      </AttentionAware>
    </Gate>
  );
}
