"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";

type HeaderAccount = {
  signedIn: boolean;
  isInstructor: boolean;
  isAligned: boolean;
  email: string | null;
  signOut: () => Promise<void>;
};

const SIGNED_OUT: HeaderAccount = {
  signedIn: false,
  isInstructor: false,
  isAligned: false,
  email: null,
  signOut: async () => undefined,
};

/**
 * Header menus read the account from here, so the marketing header can render
 * signed out in the static shell before the Convex auth state streams in.
 */
const HeaderAccountContext = createContext<HeaderAccount>(SIGNED_OUT);

export const useHeaderAccount = () => useContext(HeaderAccountContext);

/** Supplies the signed-in account; must sit inside the Convex auth provider. */
export function ConvexHeaderAccount({ children }: { children: ReactNode }) {
  const { session, isInstructor, isAligned, email } = useProfile();
  const { signOut } = useAuthActions();
  const signedIn = Boolean(session);
  const account = useMemo(
    () => ({ signedIn, isInstructor, isAligned, email, signOut }),
    [signedIn, isInstructor, isAligned, email, signOut]
  );
  return (
    <HeaderAccountContext.Provider value={account}>
      {children}
    </HeaderAccountContext.Provider>
  );
}
