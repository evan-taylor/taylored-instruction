import Link from "next/link";
import { CancellationPolicyDocument } from "@/components/cancellation-policy-document";
import {
  type CancellationPolicy,
  CURRENT_CANCELLATION_POLICY,
  policyDate,
} from "@/shared/cancellation-policy";

/** Public page for one policy version; every version keeps its own URL. */
export function CancellationPolicyPage({
  policy,
}: {
  policy: CancellationPolicy;
}) {
  const current = policy.version === CURRENT_CANCELLATION_POLICY.version;
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto max-w-3xl space-y-8 px-4">
        <header className="space-y-3">
          <p className="font-medium text-primary text-sm uppercase tracking-wide">
            Taylored Instruction LLC
          </p>
          <h1 className="font-bold text-3xl text-text md:text-4xl">
            Cancellation Policy
          </h1>
          <p className="text-text-light">
            Version {policy.version}, published{" "}
            {policyDate(Date.parse(`${policy.publishedAt}T12:00:00Z`))}.{" "}
            {current ? (
              "This is the current version."
            ) : (
              <>
                A newer version applies to new registrations:{" "}
                <Link
                  className="text-primary hover:underline"
                  href={`/cancellation-policy/v/${CURRENT_CANCELLATION_POLICY.version}`}
                >
                  version {CURRENT_CANCELLATION_POLICY.version}
                </Link>
                .
              </>
            )}
          </p>
        </header>
        <div className="text-text-light leading-relaxed">
          <CancellationPolicyDocument policy={policy} />
        </div>
        <p className="text-sm text-text-light">
          This policy is part of our{" "}
          <Link className="text-primary hover:underline" href="/terms">
            Terms and Conditions
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
