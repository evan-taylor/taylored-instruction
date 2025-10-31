import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { ProfileWithUser } from "./types";

export function useInstructorActions(
  profiles: ProfileWithUser[],
  setProfiles: (updatedProfiles: ProfileWithUser[]) => void
) {
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

      const now = new Date().toISOString();

      setProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, isInstructor: !currentStatus, updatedAt: now }
            : p
        )
      );

      setActionMessage(
        `Instructor status successfully ${currentStatus ? "revoked" : "approved"}. ${currentStatus ? "" : "Approval email sent."}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
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

      setProfiles(profiles.filter((p) => p.id !== userId));
      setActionMessage(
        `User ${userEmail || userId} successfully rejected and deleted.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to reject user: ${message}`);
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
    initiateRejectUser,
    confirmRejectUser,
    cancelRejectUser,
    confirmDialogState,
  };
}
