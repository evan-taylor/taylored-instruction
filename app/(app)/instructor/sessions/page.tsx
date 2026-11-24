import type { Metadata } from "next";
import { MyClasses } from "@/components/registration/my-classes";
import { StaffGate } from "@/components/registration/staff-gate";

export const metadata: Metadata = {
  title: "My Classes | Taylored Instruction",
};

export default function Page() {
  return (
    <StaffGate aligned>
      <MyClasses />
    </StaffGate>
  );
}
