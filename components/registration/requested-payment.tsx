"use client";

import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  registrationAnalyticsContext,
  trackRegistration,
} from "@/lib/registration-analytics";
import {
  CHECKOUT_HOLD_MINUTES,
  formatMoney,
} from "@/shared/registration/domain";
import { errorText } from "./errors";
import { PaymentStep } from "./payment-step";

/** Emailed payment request: review the order, then pay on this page. */
export function RequestedPayment() {
  const params = useSearchParams();
  const orderId = params.get("order") as Id<"registrationOrders"> | null;
  const requestKey = params.get("key");
  const begin = useMutation(api.registrationPayments.beginRequestedPayment);
  const quote = useQuery(
    api.registrationPortal.review,
    orderId && requestKey ? { orderId, requestKey } : "skip"
  );
  const [busy, setBusy] = useState(false);
  const [expires, setExpires] = useState<number | null>(null);
  const [error, setError] = useState("");
  const start = async () => {
    if (!(orderId && requestKey)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const args = { orderId, requestKey };
      trackRegistration("registration_requested_payment_started", {
        order_id: orderId,
      });
      const result = await begin({
        ...args,
        analytics: registrationAnalyticsContext(),
      });
      trackRegistration("registration_requested_payment_ready", {
        order_id: orderId,
      });
      sessionStorage.setItem("registration-order", JSON.stringify(args));
      setExpires(result.expires);
    } catch (cause) {
      trackRegistration("registration_requested_payment_failed", {
        order_id: orderId,
      });
      setError(errorText(cause, "Unable to open payment. Please try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 lg:py-16">
        <div>
          <p className="font-medium text-primary text-xs uppercase tracking-wide">
            Taylored Instruction
          </p>
          <h1 className="mt-2 font-bold text-3xl text-slate-900">
            Complete your training payment
          </h1>
        </div>
        {orderId && requestKey ? null : (
          <Notice tone="danger">
            This payment link is incomplete. Please open the full link from your
            email.
          </Notice>
        )}
        {quote ? (
          <Card>
            <CardContent className="space-y-3">
              {quote.seats.map((seat) => (
                <div className="text-sm" key={seat.email}>
                  <p className="font-medium text-slate-900">{seat.name}</p>
                  {seat.lines.map((line) => (
                    <div
                      className="flex items-center justify-between gap-3 text-slate-600"
                      key={line.id}
                    >
                      <span>{line.title}</span>
                      <span className="tabular-nums">
                        {formatMoney(line.cents - line.discount)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 border-slate-200 border-t pt-3">
                <span className="font-semibold text-slate-900">
                  Subtotal before tax
                </span>
                <span className="font-bold text-slate-900 text-xl tabular-nums">
                  {formatMoney(quote.total)}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {expires && orderId && requestKey ? (
          <Card>
            <CardContent className="p-6">
              <PaymentStep
                expires={expires}
                onStartOver={() => setExpires(null)}
                orderId={orderId}
                requestKey={requestKey}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Your seats are reserved for {CHECKOUT_HOLD_MINUTES} minutes once
                you continue. Sales tax is calculated from your billing address
                before you pay, and we’ll email your confirmation when payment
                completes.
              </p>
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button
                disabled={busy || !(orderId && requestKey)}
                onClick={start}
                type="button"
              >
                {busy ? "Reserving seats…" : "Continue to payment"}
              </Button>
              <p className="text-slate-500 text-sm">
                Already paid or need help? Reply to your payment request email
                before paying again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
