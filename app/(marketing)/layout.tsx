import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Suspense } from "react";
import { AuthEffects } from "@/components/auth-effects";
import { Footer } from "@/components/layout/Footer";
import { ConvexHeaderAccount } from "@/components/layout/header-account";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import {
  ConvexClientProvider,
  ConvexPublicProvider,
} from "@/providers/ConvexClientProvider";

/**
 * Only the header waits for the request's auth cookies. Page content stays in
 * the prerendered shell, so the hero paints without a streamed reveal.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexPublicProvider>
      <div className="flex min-h-dvh flex-col">
        <Suspense fallback={<MarketingHeader />}>
          <ConvexAuthNextjsServerProvider>
            <ConvexClientProvider>
              <ConvexHeaderAccount>
                <AuthEffects />
                <MarketingHeader />
              </ConvexHeaderAccount>
            </ConvexClientProvider>
          </ConvexAuthNextjsServerProvider>
        </Suspense>
        <main className="prose-site grow">{children}</main>
        <Footer />
      </div>
    </ConvexPublicProvider>
  );
}
