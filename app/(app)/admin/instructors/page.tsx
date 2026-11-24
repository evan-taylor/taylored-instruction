"use client";

import { useQuery } from "convex/react";
import { Suspense, useState } from "react";
import {
  AlignmentEditor,
  IndependentOversight,
} from "@/components/admin/aligned";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/useProfile";
import { AlertMessages } from "./alert-messages";
import { ConfirmDialog } from "./confirm-dialog";
import { InstructorsTable } from "./instructors-table";
import { Invitations } from "./invitations";
import { AccessDenied, LoadingAdminPanel } from "./loading-states";
import type { ProfileWithUser } from "./types";
import { useAdminAuth } from "./use-admin-auth";
import { useAdminProfiles } from "./use-admin-profiles";
import { useInstructorActions } from "./use-instructor-actions";

function AdminInstructorsContent() {
  const { loading: profileLoading, session } = useProfile();

  const { isAdmin, userEmailForDisplay, adminAccessCheckInProgress } =
    useAdminAuth(profileLoading, session, false);

  const {
    profiles,
    setProfiles,
    error: fetchError,
    adminDataLoading,
  } = useAdminProfiles(adminAccessCheckInProgress, isAdmin);

  const {
    actionMessage,
    error: actionError,
    toggleInstructorStatus,
    initiateRejectUser,
    confirmRejectUser,
    cancelRejectUser,
    confirmDialogState,
  } = useInstructorActions(profiles, setProfiles);

  const error = fetchError || actionError;
  const courses = useQuery(
    api.aligned.courseOptions,
    isAdmin && !adminAccessCheckInProgress ? {} : "skip"
  );
  const [editing, setEditing] = useState<ProfileWithUser | null>(null);
  const [lastCourses, setLastCourses] = useState<Id<"registrationCourses">[]>(
    []
  );
  const [sessionsFor, setSessionsFor] = useState<Id<"users"> | "">("");
  const aligned = profiles
    .filter((profile) => profile.alignment)
    .map((profile) => ({
      userId: profile.userId as Id<"users">,
      name: profile.userName || profile.userEmail || "Unknown",
    }));

  if (profileLoading || adminAccessCheckInProgress) {
    return <LoadingAdminPanel />;
  }

  if (!isAdmin) {
    return <AccessDenied userEmailForDisplay={userEmailForDisplay} />;
  }

  if (adminDataLoading) {
    return <LoadingAdminPanel />;
  }

  return (
    <>
      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        onCancel={cancelRejectUser}
        onConfirm={confirmRejectUser}
        userEmail={confirmDialogState.userEmail}
        userId={confirmDialogState.userId}
      />

      <div className="space-y-6">
        <PageHeader
          actions={
            <Button href="/admin/sessions" size="sm" variant="secondary">
              Assign to sessions
            </Button>
          }
          description="One record per instructor. Mark whether they teach for us, whether they are aligned with our Training Site and for which courses, or both. Aligned instructors run independent sessions."
          title="Instructors"
        />

        <AlertMessages actionMessage={actionMessage} error={error} />

        <InstructorsTable
          onEditAlignment={setEditing}
          onRejectUser={initiateRejectUser}
          onShowSessions={(userId) => {
            setSessionsFor(userId as Id<"users">);
            document
              .getElementById("independent-sessions")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          onToggleStatus={toggleInstructorStatus}
          profiles={profiles}
        />

        <Invitations courses={courses ?? []} />

        <IndependentOversight
          instructorId={sessionsFor}
          instructors={aligned}
          onInstructor={setSessionsFor}
        />

        {editing && courses ? (
          <AlignmentEditor
            courses={courses}
            current={editing.alignment?.courses.map((c) => c.id) ?? null}
            key={editing.id}
            name={editing.userName || editing.userEmail || "this instructor"}
            onClose={() => setEditing(null)}
            onSaved={(ids) => {
              if (ids.length) {
                setLastCourses(ids);
              }
            }}
            suggested={lastCourses}
            userId={editing.userId as Id<"users">}
          />
        ) : null}
      </div>
    </>
  );
}

export default function AdminInstructorsPage() {
  return (
    <Suspense fallback={<LoadingAdminPanel />}>
      <AdminInstructorsContent />
    </Suspense>
  );
}
