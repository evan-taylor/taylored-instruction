import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { extractUserEmail, isAdminEmail } from "./helpers";

type SetState<T> = (value: T) => void;

type AdminStateHandlers = {
  setIsAdmin: SetState<boolean>;
  setUserEmailForDisplay: SetState<string | null>;
  setAdminAccessCheckInProgress: SetState<boolean>;
};

type AdminCheckOptions = {
  profileLoading: boolean;
  session: unknown;
  forceAdmin: boolean;
  supabase: SupabaseClient;
  isMounted: boolean;
  handlers: AdminStateHandlers;
};

async function getUserFromSupabase(
  supabase: SupabaseClient
): Promise<User | null> {
  const response = await supabase.auth.getUser();
  if (response.error || !response.data.user) {
    return null;
  }
  return response.data.user;
}

function updateAdminState(
  user: User | null,
  forceAdmin: boolean,
  handlers: Pick<AdminStateHandlers, "setIsAdmin" | "setUserEmailForDisplay">
) {
  if (!user) {
    return;
  }

  const emailToCheck = extractUserEmail(user);
  handlers.setUserEmailForDisplay(emailToCheck);

  if (isAdminEmail(emailToCheck, forceAdmin)) {
    handlers.setIsAdmin(true);
  }
}

async function checkAdminStatusAsync(options: AdminCheckOptions) {
  const { profileLoading, session, forceAdmin, supabase, isMounted, handlers } =
    options;

  if (profileLoading || !isMounted) {
    return;
  }

  handlers.setIsAdmin(false);
  handlers.setAdminAccessCheckInProgress(true);

  try {
    if (session) {
      const user = await getUserFromSupabase(supabase);
      updateAdminState(user, forceAdmin, handlers);
    }
  } catch (_err) {
    // Error determining admin status - remain not admin
  } finally {
    if (isMounted) {
      handlers.setAdminAccessCheckInProgress(false);
    }
  }
}

export function useAdminAuth(
  profileLoading: boolean,
  session: unknown,
  forceAdmin: boolean,
  supabase: SupabaseClient
) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmailForDisplay, setUserEmailForDisplay] = useState<string | null>(
    null
  );
  const [adminAccessCheckInProgress, setAdminAccessCheckInProgress] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    checkAdminStatusAsync({
      profileLoading,
      session,
      forceAdmin,
      supabase,
      isMounted,
      handlers: {
        setIsAdmin,
        setUserEmailForDisplay,
        setAdminAccessCheckInProgress,
      },
    });

    return () => {
      isMounted = false;
    };
  }, [profileLoading, session, forceAdmin, supabase]);

  return {
    isAdmin,
    userEmailForDisplay,
    adminAccessCheckInProgress,
  };
}
