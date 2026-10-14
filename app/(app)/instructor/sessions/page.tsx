import type { Metadata } from "next";
import { InstructorSessions } from "@/components/registration/instructor";

export const metadata: Metadata = {
  title: "Assigned Sessions | Taylored Instruction",
};

export default function Page() {
  return <InstructorSessions />;
}
