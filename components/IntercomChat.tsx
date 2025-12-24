"use client";

import Intercom from "@intercom/messenger-js-sdk";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";

const INTERCOM_APP_ID = "tw4z93pc";

export function IntercomChat() {
  const { profile, loading } = useProfile();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (profile) {
      Intercom({
        app_id: INTERCOM_APP_ID,
        user_id: profile.userId,
        email: profile.email ?? undefined,
      });
    } else {
      Intercom({
        app_id: INTERCOM_APP_ID,
      });
    }

    return () => {
      Intercom("shutdown");
    };
  }, [profile, loading]);

  return null;
}
