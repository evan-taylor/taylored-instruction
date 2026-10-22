"use client";
import { useConvexConnectionState } from "convex/react";
import { useEffect, useState } from "react";

const GRACE_MS = 6000;

/**
 * Tells the user when the live connection has dropped, so screens that keep
 * showing skeletons or stale data read as "offline" rather than broken.
 */
export function ConnectionBanner() {
  const state = useConvexConnectionState();
  const offline =
    !state.isWebSocketConnected &&
    (state.hasEverConnected || state.connectionRetries > 2);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!offline) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [offline]);
  if (!shown) {
    return null;
  }
  return (
    <div
      className="border-amber-200 border-b bg-amber-50 px-4 py-2 text-center text-amber-900 text-sm"
      role="status"
    >
      Reconnecting… We can’t reach the server right now. Anything you submit
      will wait until the connection is back.
    </div>
  );
}
