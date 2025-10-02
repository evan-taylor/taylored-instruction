"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useProfile } from "../../../hooks/useProfile";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: profileLoading, session } = useProfile();

  const [supabase] = useState(() => createClient());
  const forceAdmin = searchParams?.get("admin") === "true";

  const { isAdmin, userEmailForDisplay, adminAccessCheckInProgress } =
    useAdminAuth(profileLoading, session, forceAdmin, supabase);

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
  } = useInstructorActions(supabase, profiles, setProfiles);

  const error = fetchError || actionError;

  if (profileLoading || adminAccessCheckInProgress) {
    return (
      <LoadingVerification
        adminAccessCheckInProgress={adminAccessCheckInProgress}
        profileLoading={profileLoading}
      />
    );
  }

  if (!(isAdmin || forceAdmin)) {
    if (typeof window !== "undefined") {
      router.push(session ? "/my-account" : "/");
      return null;
    }
    return <AccessDenied userEmailForDisplay={userEmailForDisplay} />;
  }

  if (adminDataLoading) {
    return <LoadingAdminPanel />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        onCancel={cancelRejectUser}
        onConfirm={confirmRejectUser}
        userEmail={confirmDialogState.userEmail}
        userId={confirmDialogState.userId}
      />

      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-bold text-3xl md:text-4xl">Manage Instructors</h1>
          {forceAdmin && (
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
              Testing Mode Active
            </span>
          )}
        </div>

        {userEmailForDisplay && (
          <p className="mb-4 text-gray-600 text-sm">
            Logged in as Admin: {userEmailForDisplay}
          </p>
        )}

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
