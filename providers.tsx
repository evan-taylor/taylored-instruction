"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PhProvider } from "posthog-js/react";
import { Suspense, useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      capture_pageleave: true, // Enable pageleave capture
      defaults: "2025-05-24",
    });
  }, []);

  return <PhProvider client={posthog}>{children}</PhProvider>;
}

export function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $currentUrl: url,
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
