import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionDetail } from "@/components/admin/session-detail";
import { Skeleton } from "@/components/ui/page-header";
import type { Id } from "@/convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Session · Admin · Taylored Instruction",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <SessionDetail sessionId={id as Id<"registrationSessions">} />
    </Suspense>
  );
}
