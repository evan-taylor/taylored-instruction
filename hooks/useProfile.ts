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
    async function fetchSessionAndSetState() {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabaseClient.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setError(`Could not fetch session: ${sessionError.message}`);
        setSession(null);
        setUser(null);
        setCurrentUserId(undefined);
        setEmail(null);
        if (isMounted) {
          setLoading(false); // Stop loading if session fails
        }
      } else if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        setCurrentUserId(currentSession.user.id);
        setEmail(currentSession.user.email ?? null);
        // Loading remains true, waits for profile fetch
      } else {
        // No session
        setSession(null);
        setUser(null);
        setCurrentUserId(undefined);
        setEmail(null);
        if (isMounted) {
          setLoading(false); // Stop loading if no session
        }
      }
    }

    if (initialUserId) {
      // initialUserId is provided, currentUserId is already set.
      // Loading remains true until profile is fetched in the next effect.
      // Note: session/user/email object will not be populated if only initialUserId is used.
    } else {
      fetchSessionAndSetState();
    }
    return () => {
      isMounted = false;
    };
  }, [initialUserId, supabaseClient]);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      if (!currentUserId) {
        if (isMounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // Start loading for this fetch cycle
      if (isMounted) {
        setLoading(true);
      }

      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!isMounted) {
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as any);
          const msg =
            (body as any).error || `Failed to load profile (${res.status})`;
          setError(msg);
          setProfile(null);
          return;
        }
        const data = (await res.json()) as Profile;
        if (!isMounted) {
          return;
        }
        setProfile(data);
        setError(null);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setError(
          err?.message || "An unexpected error occurred during profile loading."
        );
        setProfile(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    // Only attempt to load profile if we have a user ID.
    if (currentUserId) {
      loadProfile();
    } else if (initialUserId && !currentUserId) {
      // specifically for bad initialUserId
      if (isMounted) {
        setProfile(null);
        setLoading(false);
      }
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
