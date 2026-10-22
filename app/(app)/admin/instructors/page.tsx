"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/page-header";
import { useProfile } from "@/hooks/useProfile";
import { AlertMessages } from "./alert-messages";
import { ConfirmDialog } from "./confirm-dialog";
import { InstructorsTable } from "./instructors-table";
import {
  AccessDenied,
  LoadingAdminPanel,
  LoadingVerification,
} from "./loading-states";
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
    return (
      <LoadingVerification
        adminAccessCheckInProgress={adminAccessCheckInProgress}
        profileLoading={profileLoading}
      />
    );
  }

  if (!isAdmin) {
    return <AccessDenied userEmailForDisplay={userEmailForDisplay} />;
  }

  if (adminDataLoading) {
    return <LoadingAdminPanel />;
  }

  return (
    <div className="space-y-6">
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
            <Button href="/admin/sessions" variant="secondary">
              Sessions & assignments
            </Button>
          }
          description="Approve instructor access to eCard purchasing and teaching resources. Assign approved instructors to classes from Sessions."
          title="Instructors"
        />

        <AlertMessages actionMessage={actionMessage} error={error} />

        <InstructorsTable
          onRejectUser={initiateRejectUser}
          onToggleStatus={toggleInstructorStatus}
          profiles={profiles}
        />
      </div>
    </div>
  );
}

export default function AdminInstructorsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex items-center justify-center px-4 py-8">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <AdminInstructorsContent />
    </Suspense>
  );
}
