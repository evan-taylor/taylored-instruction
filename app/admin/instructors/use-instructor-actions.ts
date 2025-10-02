import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
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
  supabase: SupabaseClient,
  userEmail: string,
  setActionMessage: MessageSetter
) {
  try {
    const response = await supabase.functions.invoke("send-approval-email", {
      body: { email: userEmail, name: userEmail.split("@")[0] },
    });

    if (response.error) {
      setActionMessage(
        (prev) =>
          `${prev || ""} (Approval email failed to send. Error: ${response.error.message})`
      );
    } else {
      handleApprovalEmailResponse(response.data, setActionMessage);
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
  supabase: SupabaseClient,
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

  const toggleInstructorStatus = async (
    profileId: string,
    currentStatus: boolean,
    userEmail: string | null
  ) => {
    setActionMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/instructors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, newStatus: !currentStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to update status (${res.status})`
        );
      }

      const result = await res.json();
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
        await sendApprovalEmail(supabase, userEmail, setActionMessage);
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
      const response = await supabase.functions.invoke(
        "delete-user-and-profile",
        {
          body: { userId },
        }
      );

      if (response.error) {
        throw response.error;
      }

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
