"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { withPostHog } from "@/lib/posthog-browser";
import { isPrivateRegistrationPath } from "@/shared/registration/privacy";

export function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && !isPrivateRegistrationPath(pathname)) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += `?${searchParams.toString()}`;
      }
      withPostHog((posthog) => {
        posthog.capture("$pageview", {
          $current_url: url,
        });
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogPageViewWrapper() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
