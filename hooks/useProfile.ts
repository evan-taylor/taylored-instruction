import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type Profile = {
  id: string;
  userId: string;
  is_instructor: boolean;
  updated_at: string | null | undefined;
  last_login?: string | null | undefined;
};

type UseProfileReturn = {
  session: { user: { id: string; email?: string } } | null;
  profile: Profile | null;
  isInstructor: boolean;
  loading: boolean;
  error: string | null;
  userId: string | undefined;
  email: string | null;
};

export function useProfile(_initialUserId?: string): UseProfileReturn {
  const authToken = useAuthToken();
  const profile = useQuery(api.profiles.getProfile);

  const loading = authToken === undefined || profile === undefined;
  const isAuthenticated = authToken !== null;
  const isInstructor = profile?.is_instructor ?? false;

  const session = isAuthenticated
    ? {
        user: {
          id: profile?.userId ?? "unknown",
          email: profile?.userId,
        },
      }
    : null;

  return {
    session,
    profile: profile || null,
    isInstructor,
    loading,
    error: null,
    userId: profile?.userId,
    email: profile?.userId || null,
  };
}
