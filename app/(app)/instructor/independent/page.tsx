import type { Metadata } from "next";
import {
  AlignedGate,
  IndependentSessions,
} from "@/components/registration/independent";

export const metadata: Metadata = {
  title: "Independent Sessions | Taylored Instruction",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AlignedGate>
      <IndependentSessions />
    </AlignedGate>
  );
}
