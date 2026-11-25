import { CancellationPolicyPage } from "@/components/cancellation-policy-page";
import { buildPageMetadata } from "@/lib/seo";
import { CURRENT_CANCELLATION_POLICY } from "@/shared/cancellation-policy";

export const metadata = buildPageMetadata({
  title: "Cancellation Policy | Taylored Instruction",
  description:
    "Rescheduling, refund, eLearning, prerequisite, and late-arrival terms for Taylored Instruction course registrations.",
  path: "/cancellation-policy",
  keywords: ["CPR class cancellation policy", "CPR course refund policy"],
  image: { title: "Cancellation Policy" },
});

export default function CurrentCancellationPolicy() {
  return <CancellationPolicyPage policy={CURRENT_CANCELLATION_POLICY} />;
}
