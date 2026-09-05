import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Profile {
  email: string | null;
  id: string;
  is_instructor: boolean;
  last_login?: string | null | undefined;
  updated_at: string | null | undefined;
  userId: string;
}

interface UseProfileReturn {
  email: string | null;
  error: string | null;
  isInstructor: boolean;
  loading: boolean;
  profile: Profile | null;
  session: { user: { id: string; email?: string } } | null;
  userId: string | undefined;
}

export function useProfile(_initialUserId?: string): UseProfileReturn {
  const authToken = useAuthToken();
  const profile = useQuery(api.profiles.getProfile);

  const loading = authToken === undefined || profile === undefined;
  const isAuthenticated = authToken !== null;
  const isInstructor = profile?.is_instructor ?? false;

  const session = isAuthenticated
    ? {
        user: {
          email: profile?.email ?? undefined,
          id: profile?.userId ?? "unknown",
        },
      }
    : null;

  return {
    email: profile?.email || null,
    error: null,
    isInstructor,
    loading,
    profile: profile || null,
    session,
    userId: profile?.userId,
  };
}
