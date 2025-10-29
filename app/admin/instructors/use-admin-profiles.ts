import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { ProfileWithUser } from "./types";

type ConvexProfile = {
  id: string;
  is_instructor: boolean;
  updated_at: string | null | undefined;
  last_login: string | null | undefined;
  user_email: string | null;
  short_id: string;
};

function mapConvexProfileToLocal(
  convexProfile: ConvexProfile
): ProfileWithUser {
  return {
    id: convexProfile.id,
    isInstructor: convexProfile.is_instructor,
    updatedAt: convexProfile.updated_at ?? null,
    lastLogin: convexProfile.last_login ?? null,
    userEmail: convexProfile.user_email,
    shortId: convexProfile.short_id,
  };
}

export function useAdminProfiles(
  adminAccessCheckInProgress: boolean,
  isAdmin: boolean
) {
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const convexProfiles = useQuery(
    api.admin.getAllInstructors,
    !adminAccessCheckInProgress && isAdmin ? {} : "skip"
  );

  const adminDataLoading = convexProfiles === undefined;

  if (convexProfiles && Array.isArray(convexProfiles)) {
    const mappedProfiles = convexProfiles.map(mapConvexProfileToLocal);
    if (JSON.stringify(mappedProfiles) !== JSON.stringify(profiles)) {
      setProfiles(mappedProfiles);
    }
  }

  return {
    profiles,
    setProfiles,
    error,
    setError,
    adminDataLoading,
  };
}
