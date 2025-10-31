import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";

export function useMigrationAttachment() {
  const attachUserData = useMutation(api.migration.attachUserDataOnLogin);
  const { isAuthenticated } = useConvexAuth();
  const hasAttempted = useRef(false);
  const [result, setResult] = useState<{
    attached: boolean;
    reason?: string;
    profile?: { isInstructor: boolean; supabaseUserId: string };
  } | null>(null);

  useEffect(() => {
    async function attemptAttachment() {
      if (!isAuthenticated) {
        hasAttempted.current = false;
        return;
      }

      if (hasAttempted.current) {
        return;
      }

      hasAttempted.current = true;

      try {
        const attachResult = await attachUserData();
        setResult(attachResult);
      } catch {
        hasAttempted.current = false;
      }
    }

    attemptAttachment();
  }, [attachUserData, isAuthenticated]);

  return result;
}
