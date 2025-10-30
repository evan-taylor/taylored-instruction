"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { MigrationAttachment } from "@/components/MigrationAttachment";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL. Ensure CONVEX_DEPLOY_KEY is set in Vercel and the Convex Preview Deployments integration is enabled. For local development, add NEXT_PUBLIC_CONVEX_URL to .env.local. See https://docs.convex.dev/production/hosting/preview-deployments"
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
