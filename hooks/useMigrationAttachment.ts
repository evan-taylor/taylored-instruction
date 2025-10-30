import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

export function useMigrationAttachment() {
  const attachUserData = useMutation(api.migration.attachUserDataOnLogin);
  const { isAuthenticated } = useConvexAuth();
  const [hasAttempted, setHasAttempted] = useState(false);
  const [result, setResult] = useState<{
    attached: boolean;
    reason?: string;
    profile?: { isInstructor: boolean; supabaseUserId: string };
  } | null>(null);

  useEffect(() => {
    async function attemptAttachment() {
      if (hasAttempted || !isAuthenticated) {
        return;
      }

      setHasAttempted(true);

      try {
        const attachResult = await attachUserData();
        setResult(attachResult);
      } catch {
        // Silently ignore - user can retry by refreshing
      }
    }

    attemptAttachment();
  }, [attachUserData, isAuthenticated, hasAttempted]);

  return result;
}
