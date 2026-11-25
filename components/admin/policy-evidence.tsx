"use client";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import { formatDateTime } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  DescriptionList,
  EmptyState,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function download(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The order's cancellation policy acknowledgements and the dispute export. */
export function PolicyEvidence({
  orderId,
}: {
  orderId: Id<"registrationOrders">;
}) {
  const evidence = useQuery(api.registrationPolicy.evidence, { orderId });
  const exportEvidence = useAction(api.registrationEvidence.exportEvidence);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (evidence === undefined) {
    return <Skeleton className="h-24" />;
  }
  const rows = evidence?.acknowledgements ?? [];
  return (
    <div className="space-y-4">
      {rows.length ? (
        rows.map((ack) => (
          <div
            className="space-y-3 rounded-lg border border-slate-200 p-4"
            key={ack.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={ack.kind === "click-through" ? "success" : "warning"}
              >
                {ack.kind === "click-through"
                  ? "Agreed at checkout"
                  : "Disclosed, not a click-through"}
              </Badge>
              <span className="text-slate-600 text-sm">
                Version {ack.policyVersion} · {formatDateTime(ack.recordedAt)}
              </span>
              {ack.integrity.digestMatches &&
              ack.integrity.hashMatches ? null : (
                <Badge tone="danger">Integrity check failed</Badge>
              )}
            </div>
            <DescriptionList
              items={[
                { label: "Statement", value: ack.statement },
                {
                  label: "Purchaser",
                  value: `${ack.purchaserName} <${ack.purchaserEmail}>`,
                },
                { label: "IP address", value: ack.ip ?? "—" },
                {
                  label: "User agent",
                  value: (
                    <span className="break-all text-xs">
                      {ack.userAgent ?? "—"}
                    </span>
                  ),
                },
                {
                  label: "Stripe",
                  value: (
                    <span className="break-all text-xs">
                      {[ack.stripeCheckoutSession, ack.stripePaymentIntent]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  ),
                },
                {
                  label: "Policy",
                  value: (
                    <a
                      className="text-primary underline-offset-2 hover:underline"
                      href={`/cancellation-policy/v/${ack.policyVersion}`}
                      rel="noopener"
                      target="_blank"
                    >
                      /cancellation-policy/v/{ack.policyVersion}
                    </a>
                  ),
                },
              ]}
            />
          </div>
        ))
      ) : (
        <EmptyState
          description="This order predates policy agreement at checkout, so no acknowledgement was recorded."
          title="No acknowledgement"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              const file = await exportEvidence({ orderId });
              download(file.filename, file.base64);
            } catch (error) {
              setMessage(errorText(error));
            } finally {
              setBusy(false);
            }
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {busy ? "Preparing PDF…" : "Export dispute evidence"}
        </Button>
        <p className="text-slate-500 text-xs">
          PDF with every field above, the exact policy text shown, and the
          confirmation email with its delivery status.
        </p>
      </div>
      <ResultNotice message={message} tone="danger" />
    </div>
  );
}
