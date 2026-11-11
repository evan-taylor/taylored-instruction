"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Ticket,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";
import { workspaceLinks } from "@/lib/workspace-navigation";

const ICONS: Record<string, typeof LogOut> = {
  "/admin": LayoutDashboard,
  "/admin/sessions": CalendarDays,
  "/instructor/sessions": ClipboardList,
  "/ecards": CreditCard,
  "https://docs.tayloredinstruction.com/": BookOpen,
  "/registrations": Ticket,
  "/my-account": UserRound,
  "/alignment": GraduationCap,
  "/login": LogIn,
};

function triggerLabel(signedIn: boolean, staff: boolean) {
  if (staff) {
    return "Workspace";
  }
  return signedIn ? "Account" : "Instructors";
}

/** Desktop header menu for the signed-in person's workspace, account, and sign-out. */
export function WorkspaceMenu({ onOpen }: { onOpen?: () => void }) {
  const { session, isInstructor, email } = useProfile();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const signedIn = Boolean(session);
  const admin = isAdminEmail(email);
  const links = workspaceLinks(signedIn, isInstructor, admin).filter(
    (link) => link.type === "divider" || !link.secondary
  );
  return (
    <Menu
      className="w-64"
      onOpenChange={(open) => {
        if (open) {
          onOpen?.();
        }
      }}
      trigger={
        <button
          className="group flex items-center text-text transition-colors duration-200 hover:text-primary data-[state=open]:text-primary"
          type="button"
        >
          {triggerLabel(signedIn, signedIn && (isInstructor || admin))}
          <ChevronDown
            aria-hidden="true"
            className="ml-1 transition-transform duration-200 group-data-[state=open]:rotate-180"
            size={12}
          />
        </button>
      }
    >
      {signedIn && email ? <MenuLabel>{email}</MenuLabel> : null}
      {links.map((link, index) => {
        if (link.type === "divider") {
          return index === 0 && !email ? null : (
            <MenuSeparator key={link.label} />
          );
        }
        return (
          <MenuItem
            external={link.href.startsWith("http")}
            href={link.href}
            icon={ICONS[link.href]}
            key={link.href}
          >
            {link.label}
          </MenuItem>
        );
      })}
      {signedIn ? (
        <>
          <MenuSeparator />
          <MenuItem
            icon={LogOut}
            onSelect={async () => {
              await signOut();
              router.push("/");
            }}
          >
            Sign out
          </MenuItem>
        </>
      ) : null}
    </Menu>
  );
}
