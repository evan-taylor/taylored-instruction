"use client";
import { PageHeader } from "@/components/ui/page-header";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";
import { IndependentSessions } from "./independent";
import { AssignedSessions } from "./instructor";

/**
 * One instructor area for one instructor record: the classes we assign them,
 * and the independent classes they run under our Training Site alignment.
 */
export function MyClasses() {
  const { isInstructor, isAligned, email } = useProfile();
  const teaches = isInstructor || isAdminEmail(email);
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:py-12">
        <PageHeader
          description={
            teaches && isAligned
              ? "Classes we assign you and classes you run independently under our Training Site alignment, in one place."
              : "Open a class to keep its roster, attendance, and results."
          }
          eyebrow="Instructor"
          title="My classes"
        />
        {teaches ? <AssignedSessions /> : null}
        {isAligned ? <IndependentSessions /> : null}
      </div>
    </div>
  );
}
