"use client";

import { useAction, useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
      window.location.assign(await checkout(args));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open checkout. Please try again."
      );
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <p className="font-semibold text-primary text-sm">Taylored Instruction</p>
      <h1 className="mt-3 font-bold text-3xl text-slate-950">
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
        <p className="my-4 text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {orderId && requestKey ? (
        <Button className="mt-6" disabled={busy} onClick={pay} type="button">
          {busy ? "Opening checkout…" : "Continue to secure checkout"}
        </Button>
      ) : (
        <p className="mt-6 text-red-700" role="alert">
          This payment link is incomplete. Please open the full link from your
          email.
        </p>
      )}
      <p className="mt-6 text-slate-500 text-sm">
        Already paid or need help? Reply to your payment request email before
        paying again.
      </p>
    </section>
  );
}
