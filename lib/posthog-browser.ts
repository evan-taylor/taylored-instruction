import { captureException } from "@sentry/nextjs";
import type { PostHog } from "posthog-js";
import { rememberEmailClick } from "@/lib/email-attribution";
import { getPostHogEnv } from "@/lib/posthog-env";
import { whenPageIsIdle } from "@/lib/when-page-is-idle";
import { analyticsSafeEvent } from "@/shared/analytics-urls";
import { withoutStaleEmailCredit } from "@/shared/email-attribution";
import { privateAnalyticsEvent } from "@/shared/registration/analytics";
import { isPrivateRegistrationPath } from "@/shared/registration/privacy";

const loadPostHog = async (landingSearch: string) => {
  const { host, projectToken } = getPostHogEnv();
  if (!(projectToken && host)) {
    return null;
  }

  const { default: posthog } = await import("posthog-js");
  posthog.init(projectToken, {
    api_host: "/ingest",
    ui_host: host.includes("eu.")
      ? "https://eu.posthog.com"
      : "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    before_send: (event) => {
      if (!event) {
        return event;
      }
      const credited = withoutStaleEmailCredit(event);
      return isPrivateRegistrationPath(window.location.pathname)
        ? privateAnalyticsEvent(credited)
        : analyticsSafeEvent(credited);
    },
    capture_pageleave: true,
    capture_exceptions: true,
    tracing_headers: [window.location.hostname],
    defaults: "2025-05-24",
    debug: process.env.NODE_ENV === "development",
  });
  rememberEmailClick(posthog, landingSearch);
  return posthog;
};

let client: Promise<PostHog | null> | undefined;

/**
 * PostHog (about 100 KB of script plus its recorder and survey bundles) loads
 * once the page is idle after the load event, so it never competes with the
 * hero image for bandwidth or main-thread time. The landing query string is
 * read immediately so email attribution survives an early client navigation.
 */
export const startPostHog = () => {
  if (client) {
    return;
  }
  const landingSearch = window.location.search;
  client = new Promise((resolve) => {
    whenPageIsIdle(() => resolve(loadPostHog(landingSearch)));
  });
};

/** Runs `use` with the initialized PostHog client once it has loaded. */
export const withPostHog = (use: (posthog: PostHog) => void) => {
  startPostHog();
  client
    ?.then((posthog) => {
      if (posthog) {
        use(posthog);
      }
    })
    .catch(captureException);
};
