"use client";
import { ExternalLink } from "lucide-react";
import { useId, useState } from "react";
import { CancellationPolicyDocument } from "@/components/cancellation-policy-document";
import { Modal } from "@/components/ui/dialog";
import {
  AGREEMENT_LABEL,
  CURRENT_CANCELLATION_POLICY,
} from "@/shared/cancellation-policy";

/** The agreement the purchaser submits with a registration or payment. */
export function policyAgreement(agreed: boolean) {
  return agreed
    ? { version: CURRENT_CANCELLATION_POLICY.version, label: AGREEMENT_LABEL }
    : undefined;
}

/**
 * Required, unchecked-by-default agreement with the key refund terms shown
 * beside it. The full policy opens in a dialog, so the form keeps its state.
 */
export function PolicyAgreement({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const policy = CURRENT_CANCELLATION_POLICY;
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="font-semibold text-slate-900" id={`${id}-title`}>
        Cancellation Policy
      </h2>
      <ul
        className="list-disc space-y-1 pl-5 text-slate-700 text-sm"
        id={`${id}-terms`}
      >
        {policy.keyTerms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ul>
      <div className="flex items-start gap-3 border-slate-100 border-t pt-3">
        <input
          aria-describedby={`${id}-terms`}
          aria-label={AGREEMENT_LABEL}
          checked={checked}
          className="mt-0.5 h-4 pointer-coarse:h-5 pointer-coarse:w-5 w-4 shrink-0 rounded-sm border-slate-300 text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          disabled={disabled}
          id={id}
          name="cancellation-policy"
          onChange={(e) => onChange(e.target.checked)}
          required
          type="checkbox"
        />
        <p className="font-medium text-slate-800 text-sm">
          <label htmlFor={id}>I have read and agree to the</label>{" "}
          <button
            className="font-medium text-primary underline underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={() => setOpen(true)}
            type="button"
          >
            Cancellation Policy
          </button>
        </p>
      </div>
      <Modal
        description={`Version ${policy.version}`}
        onClose={() => setOpen(false)}
        open={open}
        size="lg"
        title="Cancellation Policy"
      >
        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          <CancellationPolicyDocument policy={policy} />
          <a
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
            href={`/cancellation-policy/v/${policy.version}`}
            rel="noopener"
            target="_blank"
          >
            Open this version in a new tab
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </Modal>
    </section>
  );
}
