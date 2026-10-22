"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";
import { cn } from "@/lib/utils";

export function InstructorNavigation() {
  const pathname = usePathname();
  const { session, isInstructor, email } = useProfile();
  const admin = isAdminEmail(email);
  const workspaceRoute =
    pathname?.startsWith("/instructor/") ||
    pathname?.startsWith("/ecards") ||
    pathname === "/my-account";
  if (!(session && (isInstructor || admin) && workspaceRoute)) {
    return null;
  }
  const links = [
    { label: "Sessions & rosters", href: "/instructor/sessions" },
    ...(isInstructor
      ? [
          { label: "Purchase eCards", href: "/ecards" },
          {
            label: "Instructor resources",
            href: "https://docs.tayloredinstruction.com/",
          },
        ]
      : []),
    ...(admin ? [{ label: "Administration", href: "/admin" }] : []),
    { label: "My account", href: "/my-account" },
  ];
  return (
    <nav
      aria-label="Instructor workspace"
      className="border-slate-200 border-b bg-white"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-3">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 font-medium text-sm focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
