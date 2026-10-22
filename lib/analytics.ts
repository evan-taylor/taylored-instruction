type VisitorsWindow = {
  visitors: {
    track: (event: string, props?: Record<string, string | number>) => void;
  };
};

/**
 * Track an event with visitors.now analytics.
 * Safely handles cases where the visitors script is not loaded.
 * Wraps the call in try/catch to prevent analytics errors from breaking user flows.
 */
export function trackVisitorsEvent(
  event: string,
  props?: Record<string, string | number>
): void {
  if (typeof window === "undefined" || !("visitors" in window)) {
    return;
  }

  try {
    (window as unknown as VisitorsWindow).visitors.track(event, props);
  } catch {
    // Silently fail - don't break user flow if tracking fails
  }
}
