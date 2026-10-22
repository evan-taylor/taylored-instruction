import type { Metadata } from "next";
import { ClassDiscovery } from "@/components/registration/public";
import { nativeRegistrationEnabled } from "@/lib/registration-launch";

export const metadata: Metadata = {
  title: "Find a Class | Taylored Instruction",
  description:
    "Browse upcoming CPR, BLS, first aid, and lifeguarding classes in Vancouver, WA. See dates, locations, and full pricing before you register.",
  robots: nativeRegistrationEnabled()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function Page() {
  return <ClassDiscovery />;
}
