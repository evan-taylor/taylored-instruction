import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";

export function useMigrationAttachment() {
  const attachUserData = useMutation(api.migration.attachUserDataOnLogin);
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.profiles.getProfile);
  const lastProcessedUserId = useRef<string | null>(null);
  const [result, setResult] = useState<{
    attached: boolean;
    reason?: string;
    profile?: { isInstructor: boolean; supabaseUserId: string };
  } | null>(null);

  useEffect(() => {
    async function attemptAttachment() {
      if (!(isAuthenticated && profile?.userId)) {
        return;
      }

      if (lastProcessedUserId.current === profile.userId) {
        return;
      }

      lastProcessedUserId.current = profile.userId;

      try {
        const attachResult = await attachUserData();
        setResult(attachResult);
      } catch {
        // Silently ignore - user can retry by refreshing
      }
    }

    attemptAttachment();
  }, [attachUserData, isAuthenticated, profile?.userId]);

  return result;
}
