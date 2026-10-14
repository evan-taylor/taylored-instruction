import type { Metadata } from "next";
import { InstructorRoster } from "@/components/registration/instructor";
import type { Id } from "@/convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Session Roster | Taylored Instruction",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InstructorRoster sessionId={id as Id<"registrationSessions">} />;
}
