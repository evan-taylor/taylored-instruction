import { useEffect, useState } from "react";
import { isAdminEmail } from "./helpers";

export function useAdminAuth(
  profileLoading: boolean,
  session: unknown,
  forceAdmin: boolean
) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmailForDisplay, setUserEmailForDisplay] = useState<string | null>(
    null
  );
  const [adminAccessCheckInProgress, setAdminAccessCheckInProgress] =
    useState(true);

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    setAdminAccessCheckInProgress(true);
    setIsAdmin(false);

    if (session && typeof session === "object" && "user" in session) {
      const user = session.user as { email?: string };
      const email = user.email || null;
      setUserEmailForDisplay(email);

      if (email && isAdminEmail(email, forceAdmin)) {
        setIsAdmin(true);
      }
    }

    setAdminAccessCheckInProgress(false);
  }, [profileLoading, session, forceAdmin]);

  return {
    isAdmin,
    userEmailForDisplay,
    adminAccessCheckInProgress,
  };
}
