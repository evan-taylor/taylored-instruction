import { notFound } from "next/navigation";
import { CancellationPolicyPage } from "@/components/cancellation-policy-page";
import { buildPageMetadata } from "@/lib/seo";
import {
  CANCELLATION_POLICIES,
  cancellationPolicy,
} from "@/shared/cancellation-policy";

type Params = { params: Promise<{ version: string }> };

export function generateStaticParams() {
  return CANCELLATION_POLICIES.map(({ version }) => ({ version }));
}

export async function generateMetadata({ params }: Params) {
  const { version } = await params;
  return buildPageMetadata({
    title: `Cancellation Policy, version ${version} | Taylored Instruction`,
    description: `Version ${version} of the Taylored Instruction course cancellation and refund policy.`,
    path: `/cancellation-policy/v/${version}`,
    image: { title: "Cancellation Policy" },
  });
}

export default async function CancellationPolicyVersion({ params }: Params) {
  const policy = cancellationPolicy((await params).version);
  if (!policy) {
    notFound();
  }
  return <CancellationPolicyPage policy={policy} />;
}
