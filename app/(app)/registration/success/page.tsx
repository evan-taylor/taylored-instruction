import type { Metadata } from "next";
import { RegistrationSuccess } from "@/components/registration/public";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Registration Status | Taylored Instruction",
  description:
    "Check the status of your Taylored Instruction class registration.",
  path: "/registration/success",
  image: { title: "Registration status", eyebrow: "Class registration" },
});

export default function Page() {
  return <RegistrationSuccess />;
}
