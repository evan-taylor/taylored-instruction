"use client";
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
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
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
      { label: "Content studio", href: "/admin/studio", icon: Globe },
      {
        label: "Instructor workspace",
        href: "/instructor/sessions",
        icon: ExternalLink,
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  attentionCount,
  compact,
}: {
  pathname: string;
  attentionCount: number;
  compact?: boolean;
}) {
  return (
    <>
      {NAV.map((section) => (
        <div key={section.group}>
          {compact ? null : (
            <p className="m-0 mb-1 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
              {section.group}
            </p>
          )}
          <ul
            className={cn(
              "m-0 list-none p-0",
              compact ? "flex gap-1" : "space-y-0.5"
            )}
          >
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const count = item.badge === "attention" ? attentionCount : 0;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      compact && "whitespace-nowrap"
                    )}
                    href={item.href}
                  >
                    <Icon aria-hidden={true} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {count > 0 ? (
                      <span className="ml-auto rounded-full bg-rose-600 px-1.5 py-0.5 font-semibold text-white text-xs tabular-nums leading-none">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function Gate({ children }: { children: React.ReactNode }): React.ReactNode {
  const { loading, session, email } = useProfile();
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-8">
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
    );
  }
  if (!session) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="m-0 font-bold text-2xl">Staff sign-in required</h1>
        <p className="m-0 mt-2 text-slate-600">
          Sign in with an administrator account to manage classes,
          registrations, instructors, and content.
        </p>
        <div className="mt-6">
          <Button href="/login">Sign in</Button>
        </div>
      </div>
    );
  }
  if (!isAdminEmail(email)) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="m-0 font-bold text-2xl">Access restricted</h1>
        <p className="m-0 mt-2 text-slate-600">
          {email} is not an administrator. Instructors can open their assigned
          sessions instead.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/instructor/sessions" variant="secondary">
            My sessions
          </Button>
          <Button href="/my-account">My account</Button>
        </div>
      </div>
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  return (
    <div className="min-h-screen bg-slate-50">
      <Gate>
        <AttentionAware>
          {(attentionCount) => (
            <div className="mx-auto flex w-full max-w-[1500px]">
              <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 overflow-y-auto border-slate-200 border-r bg-white px-3 py-6 lg:flex">
                <div className="px-3">
                  <p className="m-0 font-semibold text-slate-900">Admin</p>
                  <p className="m-0 text-slate-500 text-xs">
                    Taylored Instruction
                  </p>
                </div>
                <nav aria-label="Admin" className="space-y-5">
                  <NavLinks
                    attentionCount={attentionCount}
                    pathname={pathname}
                  />
                </nav>
              </aside>
              <div className="min-w-0 flex-1">
                <nav
                  aria-label="Admin"
                  className="sticky top-0 z-10 overflow-x-auto border-slate-200 border-b bg-white px-3 py-2 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] lg:hidden"
                >
                  <div className="flex gap-1">
                    <NavLinks
                      attentionCount={attentionCount}
                      compact
                      pathname={pathname}
                    />
                  </div>
                </nav>
                <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 [&_h1]:mb-0 [&_h2]:mb-0 [&_h3]:mb-0 [&_h4]:mb-0 [&_p]:mb-0">
                  {children}
                </main>
              </div>
            </div>
          )}
        </AttentionAware>
      </Gate>
    </div>
  );
}
