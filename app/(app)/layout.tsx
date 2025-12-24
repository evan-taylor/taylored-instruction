import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import { AuthEffects } from "@/components/auth-effects";
import { IntercomChat } from "@/components/IntercomChat";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PostHogPageViewWrapper, PostHogProvider } from "@/providers";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  noStore();

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConvexAuthNextjsServerProvider>
        <ConvexClientProvider>
          <PostHogProvider>
            <AuthEffects />
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
            <PostHogPageViewWrapper />
            <IntercomChat />
          </PostHogProvider>
        </ConvexClientProvider>
      </ConvexAuthNextjsServerProvider>
    </Suspense>
  );
}
