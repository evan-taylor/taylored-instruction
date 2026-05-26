"use client";

import { useProfile } from "@/hooks/useProfile";
import { MarketingHeader } from "./MarketingHeader";

export const AuthenticatedMarketingHeader = () => {
  const { session, isInstructor } = useProfile();

  return (
    <MarketingHeader
      authState={{ isAuthenticated: Boolean(session), isInstructor }}
    />
  );
};
