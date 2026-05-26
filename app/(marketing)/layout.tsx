import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Suspense } from "react";
import { MarketingTrackerScripts } from "@/components/analytics/MarketingTrackerScripts";
import { AuthenticatedMarketingHeader } from "@/components/layout/AuthenticatedMarketingHeader";
import { Footer } from "@/components/layout/Footer";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConvexAuthNextjsServerProvider>
        <ConvexClientProvider>
          <div className="flex min-h-screen flex-col">
            <AuthenticatedMarketingHeader />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
          <MarketingTrackerScripts />
        </ConvexClientProvider>
      </ConvexAuthNextjsServerProvider>
    </Suspense>
  );
}
