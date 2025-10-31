import { useMutation } from "convex/react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { ProfileWithUser } from "./types";

type ApprovalEmailResponse = {
  message?: string;
  error?: string;
};

type MessageSetter = Dispatch<SetStateAction<string | null>>;

function handleApprovalEmailResponse(
  responseData: ApprovalEmailResponse | null,
  setActionMessage: MessageSetter
) {
  if (!responseData) {
    setActionMessage(
      (prev) => `${prev || ""} (Approval email status uncertain.)`
    );
    return;
  }

  if (responseData.message?.includes("Approval email sent successfully")) {
    setActionMessage((prev) => `${prev || ""} (Approval email sent.)`);
  } else if (
    responseData.message?.includes("could not be sent due to server config")
  ) {
    setActionMessage(
      (prev) => `${prev || ""} (Email server configuration issue.)`
    );
  } else if (responseData.error) {
    setActionMessage(
      (prev) =>
        `${prev || ""} (Approval email process reported an error: ${responseData.error})`
    );
  } else {
    setActionMessage(
      (prev) => `${prev || ""} (Approval email status uncertain.)`
    );
  }
}

async function sendApprovalEmail(
  userEmail: string,
  setActionMessage: MessageSetter
) {
  try {
    const response = await fetch("/api/send-approval-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, name: userEmail.split("@")[0] }),
    });

    if (response.ok) {
      const data = await response.json();
      handleApprovalEmailResponse(data, setActionMessage);
    } else {
      const errorData = await response.json().catch(() => ({}));
      setActionMessage(
        (prev) =>
          `${prev || ""} (Approval email failed to send. Error: ${errorData.error || "Unknown error"})`
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    setActionMessage(
      (prev) =>
        `${prev || ""} (Approval email failed due to an unexpected error: ${errorMsg})`
    );
  }
}

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

  const updateInstructorStatusMutation = useMutation(
    api.admin.updateInstructorStatus
  );
  const deleteUserAndProfileMutation = useMutation(
    api.admin.deleteUserAndProfile
  );

  const toggleInstructorStatus = async (
    profileId: string,
    currentStatus: boolean,
    userEmail: string | null
  ) => {
    setActionMessage(null);
    setError(null);

    try {
      const result = await updateInstructorStatusMutation({
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type conversion required (important-comment)
        profileId: profileId as unknown as any,
        newStatus: !currentStatus,
      });

      const now = result.updated_at || new Date().toISOString();

      setProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, isInstructor: !currentStatus, updatedAt: now }
            : p
        )
      );

      setActionMessage(
        `Instructor status successfully ${currentStatus ? "revoked" : "approved"}.`
      );

      if (!currentStatus && userEmail) {
        await sendApprovalEmail(userEmail, setActionMessage);
      }
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
