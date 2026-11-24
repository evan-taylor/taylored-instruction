"use client";

import { useMutation, useQuery } from "convex/react";
import { Suspense, useState } from "react";
import { IndependentOversight } from "@/components/admin/aligned";
import { errorText } from "@/components/registration/errors";
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

  const saveAlignment = useMutation(api.aligned.setAlignment);
  const [alignment, setAlignment] = useState({ message: "", error: "" });
  const error = fetchError || actionError || alignment.error;
  async function setAligned(profile: ProfileWithUser, aligned: boolean) {
    const who = profile.userEmail || "Instructor";
    try {
      await saveAlignment({ userId: profile.userId as Id<"users">, aligned });
      setAlignment({
        message: aligned
          ? `${who} is now aligned with our Training Site.`
          : `Removed alignment for ${who}. Their independent sessions stay visible below.`,
        error: "",
      });
    } catch (err) {
      setAlignment({ message: "", error: errorText(err) });
    }
  }
  const [sessionsFor, setSessionsFor] = useState<Id<"users"> | "">("");
  const owners = useQuery(
    api.aligned.sessionOwners,
    isAdmin && !adminAccessCheckInProgress ? {} : "skip"
  );
  const ownerIds = new Set<string>(owners?.map((o) => o.userId));
  const oversightChoices = [
    ...profiles
      .filter((profile) => profile.alignment && !ownerIds.has(profile.userId))
      .map((profile) => ({
        userId: profile.userId as Id<"users">,
        name: profile.userName || profile.userEmail || "Unknown",
      })),
    ...(owners ?? []),
  ].sort((a, b) => a.name.localeCompare(b.name));

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
          description="One record per instructor. Mark whether they teach for us, whether they are aligned with our Training Site, or both. Aligned instructors run independent sessions for any of our courses."
          title="Instructors"
        />

        <AlertMessages
          actionMessage={alignment.message || actionMessage}
          error={error}
        />

        <InstructorsTable
          onRejectUser={initiateRejectUser}
          onSetAlignment={setAligned}
          onShowSessions={(userId) => {
            setSessionsFor(userId as Id<"users">);
            document
              .getElementById("independent-sessions")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          onToggleStatus={toggleInstructorStatus}
          profiles={profiles}
          sessionOwners={ownerIds}
        />

        <Invitations />

        <IndependentOversight
          instructorId={sessionsFor}
          instructors={oversightChoices}
          onInstructor={setSessionsFor}
        />
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
