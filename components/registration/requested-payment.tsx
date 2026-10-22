"use client";

import { useAction, useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorText } from "./errors";

export function RequestedPayment() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const requestKey = params.get("key");
  const begin = useMutation(api.registrationPayments.beginRequestedPayment);
  const checkout = useAction(api.registrationExternal.checkout);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    if (lock.current || !orderId || !requestKey) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const args = { orderId: orderId as Id<"registrationOrders">, requestKey };
      await begin(args);
      const url = await checkout(args);
      sessionStorage.setItem("registration-order", JSON.stringify(args));
      window.location.assign(url);
    } catch (cause) {
      setError(errorText(cause, "Unable to open checkout. Please try again."));
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:py-20">
      <p className="m-0 font-medium text-primary text-xs uppercase tracking-wide">
        Taylored Instruction
      </p>
      <h1 className="mt-2 font-bold text-3xl text-slate-900">
        Complete your training payment
      </h1>
      <p className="mt-4 text-slate-600">
        Review your attendees and charges in secure checkout, then enter your
        billing address and payment details. Any applicable sales tax is
        calculated before you pay.
      </p>
      <p className="mt-3 text-slate-600">
        Once you continue, you have 30 minutes to complete payment. We’ll email
        your confirmation when payment is complete.
      </p>
      {error ? (
        <Notice className="my-4" tone="danger">
          {error}
        </Notice>
      ) : null}
      {orderId && requestKey ? (
        <Button className="mt-6" disabled={busy} onClick={pay} type="button">
          {busy ? "Opening checkout…" : "Continue to secure checkout"}
        </Button>
      ) : (
        <Notice className="mt-6" tone="danger">
          This payment link is incomplete. Please open the full link from your
          email.
        </Notice>
      )}
      <p className="mt-6 text-slate-500 text-sm">
        Already paid or need help? Reply to your payment request email before
        paying again.
      </p>
    </section>
  );
}
