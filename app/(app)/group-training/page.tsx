import type { Metadata } from "next";
import { GroupTrainingRequest } from "@/components/registration/group-request";

export const metadata: Metadata = {
  title: "Request Group Training | Taylored Instruction",
  description:
    "Request CPR, BLS, first aid, or lifeguarding training for your team. On-site or at our Vancouver, WA facility, with volume pricing and invoice billing.",
  robots: { index: true, follow: true },
};

export default function Page() {
  return <GroupTrainingRequest />;
}
