import type { Metadata } from "next";
import { RegistrationPortal } from "@/components/registration/portal";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Your Registrations | Taylored Instruction",
  description: "See and manage your Taylored Instruction class registrations.",
  path: "/registrations",
  image: { title: "Your registrations", eyebrow: "Class registration" },
});

export default function Page() {
  return <RegistrationPortal />;
}
