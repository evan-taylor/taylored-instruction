import type { Metadata } from "next";
import { RegistrationPortal } from "@/components/registration/portal";

export const metadata: Metadata = {
  title: "Confirm Access | Taylored Instruction",
};

export default function Page() {
  return <RegistrationPortal access />;
}
