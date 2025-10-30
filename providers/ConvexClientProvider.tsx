"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { MigrationAttachment } from "@/components/MigrationAttachment";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl) {
  throw new Error(
    "Missing Convex URL. Please set NEXT_PUBLIC_CONVEX_URL in your environment or ensure the Convex Preview Deployments integration is enabled in Vercel. See https://docs.convex.dev/production/hosting/preview-deployments"
  );
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      <MigrationAttachment />
      {children}
    </ConvexAuthNextjsProvider>
  );
}
