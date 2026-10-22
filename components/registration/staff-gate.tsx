"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/page-header";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";

/**
 * Holds staff-only screens until the signed-in profile is known, so their
 * queries never run unauthenticated and throw into the error boundary.
 */
export function StaffGate({ children }: { children: ReactNode }) {
  const { loading, session, isInstructor, email } = useProfile();
  if (loading) {
    return (
      <div
        aria-busy="true"
        className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6"
        role="status"
      >
        <span className="sr-only">Checking your sign-in…</span>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="m-0 font-bold text-2xl text-slate-900">
          Instructor sign-in required
        </h1>
        <p className="m-0 mt-2 text-slate-600">
          Sign in with your instructor account to open rosters and record
          outcomes.
        </p>
        <div className="mt-6">
          <Button href="/login">Sign in</Button>
        </div>
      </div>
    );
  }
  if (!(isInstructor || isAdminEmail(email))) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="m-0 font-bold text-2xl text-slate-900">
          Instructor approval pending
        </h1>
        <p className="m-0 mt-2 text-slate-600">
          Your account isn’t approved to teach yet. An administrator reviews new
          instructor accounts; you’ll get access once approved.
        </p>
        <div className="mt-6">
          <Button href="/my-account" variant="secondary">
            My account
          </Button>
        </div>
      </div>
    );
  }
  return children;
}
