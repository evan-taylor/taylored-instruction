import type { Metadata } from "next";
import { GroupTrainingRequest } from "@/components/registration/group-request";
import { indexable } from "@/lib/registration-seo";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = indexable(
  buildPageMetadata({
    title: "Request Group Training | Taylored Instruction",
    description:
      "Request CPR, BLS, first aid, or lifeguarding training for your team. On-site or at our Vancouver, WA facility, with volume pricing and invoice billing.",
    path: "/group-training",
    image: {
      title: "Group CPR & lifeguard training for your team",
      eyebrow: "On-site or at our facility",
    },
  })
);

export default function Page() {
  return <GroupTrainingRequest />;
}
