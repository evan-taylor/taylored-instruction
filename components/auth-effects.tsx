"use client";

import { useConvexAuth, useMutation } from "convex/react";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useMigrationAttachment } from "@/hooks/useMigrationAttachment";
import { useProfile } from "@/hooks/useProfile";

export function AuthEffects() {
  const { isAuthenticated } = useConvexAuth();
  const { profile } = useProfile();
  const updateLastLogin = useMutation(api.profiles.updateLastLogin);
  const updatedOnce = useRef(false);
  const identifiedUserId = useRef<string | undefined>(undefined);
  const wasAuthenticated = useRef(false);

  useMigrationAttachment();

  useEffect(() => {
    if (!isAuthenticated) {
      if (wasAuthenticated.current) {
        posthog.reset();
      }
      wasAuthenticated.current = false;
      identifiedUserId.current = undefined;
      updatedOnce.current = false;
      return;
    }

    wasAuthenticated.current = true;

    if (!updatedOnce.current) {
      updatedOnce.current = true;
      updateLastLogin().catch(() => {
        // Silently ignore errors - updateLastLogin failures should not block auth flow
      });
    }

    if (!profile?.userId || identifiedUserId.current === profile.userId) {
      return;
    }

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(profile.userId, {
      email: profile.email ?? undefined,
      is_instructor: profile.is_instructor,
    });
    identifiedUserId.current = profile.userId;
  }, [isAuthenticated, profile, updateLastLogin]);

  return null;
}
