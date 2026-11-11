"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/page-header";
import { useProfile } from "@/hooks/useProfile";
import { AlertMessages } from "./alert-messages";
import { ConfirmDialog } from "./confirm-dialog";
import { InstructorsTable } from "./instructors-table";
import { Invitations } from "./invitations";
import { AccessDenied, LoadingAdminPanel } from "./loading-states";
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
          description="Invite instructors by email. Accepting an invitation grants eCard purchasing and teaching resources."
          title="Instructors"
        />

        <AlertMessages actionMessage={actionMessage} error={error} />

        <InstructorsTable
          onRejectUser={initiateRejectUser}
          onToggleStatus={toggleInstructorStatus}
          profiles={profiles}
        />

        <Invitations />
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
