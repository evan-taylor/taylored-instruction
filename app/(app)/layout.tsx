import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import { AuthEffects } from "@/components/auth-effects";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
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
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </ConvexClientProvider>
      </ConvexAuthNextjsServerProvider>
    </Suspense>
  );
}
