import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { ProfileWithUser } from "./types";

interface ConvexProfile {
  id: string;
  is_instructor: boolean;
  last_login: string | null | undefined;
  short_id: string;
  updated_at: string | null | undefined;
  user_email: string | null;
  userId: string;
}

function mapConvexProfileToLocal(
  convexProfile: ConvexProfile
): ProfileWithUser {
  return {
    id: convexProfile.id,
    isInstructor: convexProfile.is_instructor,
    lastLogin: convexProfile.last_login ?? null,
    shortId: convexProfile.short_id,
    updatedAt: convexProfile.updated_at ?? null,
    userEmail: convexProfile.user_email,
    userId: convexProfile.userId,
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
    adminDataLoading,
    error,
    profiles,
    setError,
    setProfiles,
  };
}
