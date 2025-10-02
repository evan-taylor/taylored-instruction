import { useEffect, useState } from "react";
import type { ProfileWithUser } from "./types";

// API returns snake_case which is mapped to camelCase
type ApiProfileResponse = {
  id: string;
  // biome-ignore lint/style/useNamingConvention: API response uses snake_case
  is_instructor: boolean;
  // biome-ignore lint/style/useNamingConvention: API response uses snake_case
  updated_at: string | null;
  // biome-ignore lint/style/useNamingConvention: API response uses snake_case
  last_login: string | null;
  // biome-ignore lint/style/useNamingConvention: API response uses snake_case
  user_email: string | null;
  // biome-ignore lint/style/useNamingConvention: API response uses snake_case
  short_id?: string;
};

function mapApiProfileToLocal(apiProfile: ApiProfileResponse): ProfileWithUser {
  return {
    id: apiProfile.id,
    isInstructor: apiProfile.is_instructor,
    updatedAt: apiProfile.updated_at,
    lastLogin: apiProfile.last_login,
    userEmail: apiProfile.user_email,
    shortId: apiProfile.short_id,
  };
}

async function fetchProfilesFromApi(): Promise<ProfileWithUser[]> {
  const res = await fetch("/api/admin/instructors", {
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load admin data (${res.status})`);
  }

  const apiProfiles = (await res.json()) as ApiProfileResponse[];
  return apiProfiles.map(mapApiProfileToLocal);
}

type SetState<T> = (value: T) => void;

async function loadProfilesData(
  isMounted: boolean,
  setProfiles: SetState<ProfileWithUser[]>,
  setError: SetState<string | null>,
  setAdminDataLoading: SetState<boolean>
) {
  if (!isMounted) {
    return;
  }

  setAdminDataLoading(true);
  setError(null);

  try {
    const fetchedProfiles = await fetchProfilesFromApi();
    if (isMounted) {
      setProfiles(fetchedProfiles);
    }
  } catch (err) {
    if (isMounted) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch instructor profiles: ${message}`);
    }
  } finally {
    if (isMounted) {
      setAdminDataLoading(false);
    }
  }
}

export function useAdminProfiles(
  adminAccessCheckInProgress: boolean,
  isAdmin: boolean
) {
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const shouldFetchProfiles = !adminAccessCheckInProgress && isAdmin;
    const shouldStopLoading = !(adminAccessCheckInProgress || isAdmin);

    if (shouldFetchProfiles) {
      loadProfilesData(isMounted, setProfiles, setError, setAdminDataLoading);
    } else if (shouldStopLoading) {
      setAdminDataLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [adminAccessCheckInProgress, isAdmin]);

  return {
    profiles,
    setProfiles,
    error,
    setError,
    adminDataLoading,
  };
}
