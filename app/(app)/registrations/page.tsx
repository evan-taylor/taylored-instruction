import type { Metadata } from "next";
import { RegistrationPortal } from "@/components/registration/portal";

export const metadata: Metadata = {
  title: "Your Registrations | Taylored Instruction",
};

export default function Page() {
  return <RegistrationPortal />;
}
