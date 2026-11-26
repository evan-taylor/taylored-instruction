import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Suspense } from "react";
import { AuthEffects } from "@/components/auth-effects";
import { Footer } from "@/components/layout/Footer";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <ConvexAuthNextjsServerProvider>
        <ConvexClientProvider>
          <AuthEffects />
          <div className="flex min-h-dvh flex-col">
            <MarketingHeader />
            <main className="prose-site grow">{children}</main>
            <Footer />
          </div>
        </ConvexClientProvider>
      </ConvexAuthNextjsServerProvider>
    </Suspense>
  );
}
