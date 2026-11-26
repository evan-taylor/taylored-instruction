"use client";

import { captureException } from "@sentry/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useMigrationAttachment } from "@/hooks/useMigrationAttachment";
import { useProfile } from "@/hooks/useProfile";
import { withPostHog } from "@/lib/posthog-browser";

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
        withPostHog((posthog) => posthog.reset());
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

    const shouldReset = Boolean(identifiedUserId.current);
    const { userId, email, is_instructor } = profile;
    withPostHog((posthog) => {
      if (shouldReset) {
        posthog.reset();
      }
      posthog.identify(userId, {
        email: email ?? undefined,
        is_instructor,
      });
      import("@/lib/posthog-auth")
        .then(({ captureVerifiedOtp }) => captureVerifiedOtp(userId))
        .catch(captureException);
    });
    identifiedUserId.current = userId;
  }, [isAuthenticated, profile, updateLastLogin]);

  return null;
}
