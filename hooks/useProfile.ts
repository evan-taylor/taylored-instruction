import type { Session, User } from "@supabase/supabase-js"; // Import User and Session type
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client"; // Supabase for auth only

// import type { Database } from '@/types/supabase'; // Keep commented out

// Define the shape of your profile data
type Profile = {
  id: string;
  is_instructor: boolean;
  updated_at: string | null;
};

type UseProfileReturn = {
  session: Session | null;
  profile: Profile | null;
  isInstructor: boolean;
  loading: boolean;
  error: string | null;
  userId: string | undefined;
  email: string | null;
};

// Hook now accepts userId or fetches user internally
export function useProfile(initialUserId?: string): UseProfileReturn {
  const [supabaseClient] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [_user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Stays true initially
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    initialUserId
  );

  useEffect(() => {
    let isMounted = true;

    const clearSessionState = () => {
      setSession(null);
      setUser(null);
      setCurrentUserId(undefined);
      setEmail(null);
    };

    const handleSessionError = (sessionError: Error) => {
      setError(`Could not fetch session: ${sessionError.message}`);
      clearSessionState();
      if (isMounted) {
        setLoading(false);
      }
    };

    const handleValidSession = (currentSession: Session) => {
      setSession(currentSession);
      setUser(currentSession.user);
      setCurrentUserId(currentSession.user.id);
      setEmail(currentSession.user.email ?? null);
    };

    const handleNoSession = () => {
      clearSessionState();
      if (isMounted) {
        setLoading(false);
      }
    };

    async function fetchSessionAndSetState() {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabaseClient.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (sessionError) {
        handleSessionError(sessionError);
      } else if (currentSession) {
        handleValidSession(currentSession);
      } else {
        handleNoSession();
      }
    }

    if (!initialUserId) {
      fetchSessionAndSetState();
    }
    return () => {
      isMounted = false;
    };
  }, [initialUserId, supabaseClient]);

  useEffect(() => {
    let isMounted = true;

    const handleFetchError = async (res: Response) => {
      const body = await res
        .json()
        .catch(() => ({}) as Record<string, unknown>);
      const errorMsg = (body as Record<string, unknown>).error;
      const msg =
        typeof errorMsg === "string"
          ? errorMsg
          : `Failed to load profile (${res.status})`;
      setError(msg);
      setProfile(null);
    };

    const handleCatchError = (err: unknown) => {
      setError(
        (err as Error)?.message ||
          "An unexpected error occurred during profile loading."
      );
      setProfile(null);
    };

    const handleProfileSuccess = (data: Profile) => {
      setProfile(data);
      setError(null);
    };

    const fetchProfileData = async (): Promise<Profile | null> => {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) {
        await handleFetchError(res);
        return null;
      }
      return (await res.json()) as Profile;
    };

    const executeProfileFetch = async () => {
      try {
        const data = await fetchProfileData();
        if (isMounted && data) {
          handleProfileSuccess(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          handleCatchError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    async function loadProfile() {
      if (!currentUserId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      await executeProfileFetch();
    }

    if (currentUserId) {
      loadProfile();
    } else if (initialUserId && !currentUserId && isMounted) {
      setProfile(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentUserId, initialUserId]);

  const isInstructor = profile?.is_instructor ?? false;

  return {
    session,
    profile,
    isInstructor,
    loading,
    error,
    userId: currentUserId,
    email,
  };
}
