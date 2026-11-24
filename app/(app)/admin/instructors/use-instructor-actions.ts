import { useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { sendInstructorApprovalEmail } from "@/app/actions/send-instructor-approval-email";
import { errorText } from "@/components/registration/errors";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ProfileWithUser } from "./types";

export function useInstructorActions(
  profiles: ProfileWithUser[],
  setProfiles: (updatedProfiles: ProfileWithUser[]) => void
) {
  const posthog = usePostHog();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogState, setConfirmDialogState] = useState<{
    isOpen: boolean;
    userId: string | null;
    userEmail: string | null;
  }>({ isOpen: false, userId: null, userEmail: null });

  const approveInstructorMutation = useMutation(api.profiles.approveInstructor);
  const deleteUserAndProfileMutation = useMutation(
    api.admin.deleteUserAndProfile
  );
  const setAlignmentMutation = useMutation(api.aligned.setAlignment);

  const sendApprovalEmailIfNeeded = async (
    profileId: string,
    isApproving: boolean
  ): Promise<string> => {
    if (!isApproving) {
      return "";
    }

    const profile = profiles.find((p) => p.id === profileId);
    if (!profile?.userEmail) {
      return "";
    }

    const result = await sendInstructorApprovalEmail(
      profile.userEmail,
      profile.userEmail.split("@")[0]
    );

    return result.success
      ? "Approval email sent."
      : `(${result.error || "Email failed to send"})`;
  };

  const toggleInstructorStatus = async (
    profileId: string,
    userId: string,
    currentStatus: boolean
  ) => {
    setActionMessage(null);
    setError(null);

    try {
      await approveInstructorMutation({
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type conversion required (important-comment)
        userId: userId as unknown as any,
        approve: !currentStatus,
      });
      posthog.capture("instructor_status_updated", {
        is_instructor: !currentStatus,
      });

      const now = new Date().toISOString();

      setProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, isInstructor: !currentStatus, updatedAt: now }
            : p
        )
      );

      const emailStatus = await sendApprovalEmailIfNeeded(
        profileId,
        !currentStatus
      );

      setActionMessage(
        currentStatus
          ? "Stopped teaching for us. Any alignment with our Training Site is unchanged."
          : `Approved to teach for us. ${emailStatus}`
      );
    } catch (err) {
      const message = errorText(err);
      setError(`Failed to update status: ${message}`);
    }
  };

  const initiateRejectUser = (profileId: string, userEmail: string | null) => {
    setConfirmDialogState({
      isOpen: true,
      userId: profileId,
      userEmail,
    });
  };

  const confirmRejectUser = async () => {
    const { userId, userEmail } = confirmDialogState;
    if (!userId) {
      return;
    }

    setConfirmDialogState({ isOpen: false, userId: null, userEmail: null });
    setActionMessage(null);
    setError(null);

    try {
      await deleteUserAndProfileMutation({
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type conversion required (important-comment)
        profileId: userId as unknown as any,
      });
      posthog.capture("instructor_rejected");

      setProfiles(profiles.filter((p) => p.id !== userId));
      setActionMessage(
        `User ${userEmail || userId} successfully rejected and deleted.`
      );
    } catch (err) {
      const message = errorText(err);
      setError(`Failed to reject user: ${message}`);
    }
  };

  const setAlignment = async (profile: ProfileWithUser, aligned: boolean) => {
    setActionMessage(null);
    setError(null);
    const who = profile.userEmail || "Instructor";
    try {
      await setAlignmentMutation({
        userId: profile.userId as Id<"users">,
        aligned,
      });
      setActionMessage(
        aligned
          ? `${who} is now aligned with our Training Site.`
          : `Removed alignment for ${who}. Their independent sessions stay visible below.`
      );
    } catch (err) {
      setError(`Failed to update alignment: ${errorText(err)}`);
    }
  };

  const cancelRejectUser = () => {
    setConfirmDialogState({ isOpen: false, userId: null, userEmail: null });
  };

  return {
    actionMessage,
    error,
    setError,
    toggleInstructorStatus,
    setAlignment,
    initiateRejectUser,
    confirmRejectUser,
    cancelRejectUser,
    confirmDialogState,
  };
}
