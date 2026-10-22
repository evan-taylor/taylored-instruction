import type { Metadata } from "next";
import { RegistrationSuccess } from "@/components/registration/public";

export const metadata: Metadata = {
  title: "Registration Status | Taylored Instruction",
};

export default function Page() {
  return <RegistrationSuccess />;
}
