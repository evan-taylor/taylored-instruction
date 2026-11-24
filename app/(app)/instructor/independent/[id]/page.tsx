import type { Metadata } from "next";
import {
  AlignedGate,
  IndependentSessionPage,
} from "@/components/registration/independent";
import type { Id } from "@/convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Independent Session | Taylored Instruction",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AlignedGate>
      <IndependentSessionPage sessionId={id as Id<"independentSessions">} />
    </AlignedGate>
  );
}
