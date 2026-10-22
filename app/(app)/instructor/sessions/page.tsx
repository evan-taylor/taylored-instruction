import type { Metadata } from "next";
import { InstructorSessions } from "@/components/registration/instructor";
import { StaffGate } from "@/components/registration/staff-gate";

export const metadata: Metadata = {
  title: "Assigned Sessions | Taylored Instruction",
};

export default function Page() {
  return (
    <StaffGate>
      <InstructorSessions />
    </StaffGate>
  );
}
