"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useMigrationAttachment } from "@/hooks/useMigrationAttachment";

export function AuthEffects() {
  const { isAuthenticated } = useConvexAuth();
  const updateLastLogin = useMutation(api.profiles.updateLastLogin);
  const updatedOnce = useRef(false);

  useMigrationAttachment();

  useEffect(() => {
    if (!isAuthenticated) {
      updatedOnce.current = false;
      return;
    }
    if (!updatedOnce.current) {
      updatedOnce.current = true;
      updateLastLogin().catch(() => {
        // Silently ignore errors - updateLastLogin failures should not block auth flow
      });
    }
  }, [isAuthenticated, updateLastLogin]);

  return null;
}
