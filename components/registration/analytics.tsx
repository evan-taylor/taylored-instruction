"use client";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { isPrivateRegistrationPath } from "@/shared/registration/privacy";
export function PrivateAwareAnalytics() {
  return (
    <Analytics
      beforeSend={(event) =>
        isPrivateRegistrationPath(new URL(event.url).pathname) ? null : event
      }
    />
  );
}

export function PrivateAwareSpeedInsights() {
  return (
    <SpeedInsights
      beforeSend={(event) =>
        isPrivateRegistrationPath(new URL(event.url).pathname) ? null : event
      }
    />
  );
}
