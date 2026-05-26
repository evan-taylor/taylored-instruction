import { Suspense } from "react";
import { MarketingTrackerScripts } from "@/components/analytics/MarketingTrackerScripts";
import { Footer } from "@/components/layout/Footer";
import { MarketingHeader } from "@/components/layout/MarketingHeader";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <div className="flex min-h-screen flex-col">
        <MarketingHeader />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
      <MarketingTrackerScripts />
    </Suspense>
  );
}
