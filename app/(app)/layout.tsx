import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import { AuthEffects } from "@/components/auth-effects";
import { ConnectionBanner } from "@/components/connection-banner";
import { AppChrome } from "@/components/layout/app-chrome";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";

export const metadata: Metadata = {
  robots: {
    follow: false,
    googleBot: {
      follow: false,
      index: false,
    },
    index: false,
    nocache: true,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  noStore();

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConvexAuthNextjsServerProvider>
        <ConvexClientProvider>
          <AuthEffects />
          <ConnectionBanner />
          <AppChrome>{children}</AppChrome>
        </ConvexClientProvider>
      </ConvexAuthNextjsServerProvider>
    </Suspense>
  );
}
